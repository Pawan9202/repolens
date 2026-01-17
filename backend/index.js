const express = require("express");
const axios = require("axios");
const cors = require("cors");
const mongoose = require("mongoose");
const crypto = require("crypto");
require("dotenv").config();

const app = express();

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// --- DATABASE CONNECTION ---
// Make sure MONGO_URI is in your .env file!
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ MONGO_URI is missing in .env file");
} else {
  mongoose.connect(MONGO_URI)
    .then(() => console.log("📦 Connected to MongoDB"))
    .catch(err => console.error("❌ MongoDB Connection Error:", err));
}

// --- SCHEMA DEFINITION ---
const ReportSchema = new mongoose.Schema({
  reportId: { type: String, unique: true, required: true },
  repo: String,
  summary: Object, // Stores the full stats object (files, stars, score, etc.)
  aiReview: String,
  createdAt: { type: Date, default: Date.now }
});

const Report = mongoose.model("Report", ReportSchema);

// --- SERVER SETUP ---
const PORT = process.env.PORT || 5000;
console.log(`🚀 SERVER STARTED ON PORT ${PORT}`);

/* ---------------- GITHUB CLIENT ---------------- */
const githubAPI = axios.create({
  baseURL: "https://api.github.com",
  headers: {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github.v3+json",
  },
});

/* ---------------- HELPERS ---------------- */
function extractRepoInfo(input) {
  if (!input) return null;
  let clean = input.trim();
  const simpleMatch = clean.match(/^([a-zA-Z0-9-_\.]+)\/([a-zA-Z0-9-_\.]+)$/);
  if (simpleMatch) return { owner: simpleMatch[1], repo: simpleMatch[2].replace(".git", "") };
  try {
    if (!clean.startsWith("http")) clean = "https://" + clean;
    const urlObj = new URL(clean);
    const parts = urlObj.pathname.split("/").filter(Boolean);
    if (parts.length >= 2) return { owner: parts[0], repo: parts[1].replace(".git", "") };
  } catch (e) { console.error("URL Parsing failed:", e.message); }
  return null;
}

async function getRepoTree(owner, repo) {
  try {
    const { data: repoData } = await githubAPI.get(`/repos/${owner}/${repo}`);
    const { data: branchData } = await githubAPI.get(`/repos/${owner}/${repo}/git/trees/${repoData.default_branch}?recursive=1`);
    return { tree: branchData.tree, repoData };
  } catch (error) {
    const err = new Error(error.response?.data?.message || error.message);
    err.status = error.response?.status || 500;
    throw err;
  }
}

async function getFileContent(owner, repo, path) {
  const branches = ["main", "master"];
  for (const branch of branches) {
    try {
      const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
      const res = await axios.get(url, { timeout: 5000 });
      return res.data;
    } catch (err) { if (err.response?.status === 404) continue; break; }
  }
  return null;
}

async function deepAnalyze(owner, repo, tree) {
  const files = tree.filter(f => f.type === "blob" && f.path.match(/\.(js|ts|jsx|tsx|py|go|java|c|cpp)$/i));
  let longFiles = 0, todoCount = 0, consoleLogs = 0;
  const sample = files.slice(0, 15);

  const analyses = await Promise.all(sample.map(async (file) => {
    const content = await getFileContent(owner, repo, file.path);
    if (!content || typeof content !== 'string') return null;
    const lines = content.split("\n");
    let fLong = lines.length > 300 ? 1 : 0;
    let fTodo = 0, fLogs = 0;
    lines.forEach(line => {
      if (line.toLowerCase().includes("todo")) fTodo++;
      if (line.includes("console.log")) fLogs++;
    });
    return { fLong, fTodo, fLogs };
  }));

  analyses.forEach(r => { if(r) { longFiles += r.fLong; todoCount += r.fTodo; consoleLogs += r.fLogs; }});
  return { analyzed_files: sample.length, long_files: longFiles, todos: todoCount, console_logs: consoleLogs };
}

async function generateAIReview(summary, mode) {
  const prompt = mode === "hr" 
    ? "Explain this code analysis to a recruiter. Is it organized? Hireable? Under 150 words."
    : "Audit this code as a Senior Engineer. Critique architecture, quality, and debt. Under 150 words.";
  
  try {
    const response = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
      model: "llama-3.1-8b-instant",
      messages: [{ role: "system", content: prompt }, { role: "user", content: JSON.stringify(summary) }],
      temperature: 0.5
    }, { headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` } });
    return response.data.choices[0].message.content;
  } catch (err) { return "AI Analysis Unavailable."; }
}

/* ---------------- ROUTES ---------------- */

// 1. Analyze Route (Creates & Saves Report)
app.get("/analyze", async (req, res) => {
  const { repo: repoUrl, mode = "dev" } = req.query;
  if (!repoUrl) return res.status(400).json({ error: "Repo URL required" });

  const repoInfo = extractRepoInfo(repoUrl);
  if (!repoInfo) return res.status(400).json({ error: "Invalid URL" });

  try {
    // Optional: Check if report recently created to save API calls
    // const existing = await Report.findOne({ repo: `${repoInfo.owner}/${repoInfo.repo}` }).sort({ createdAt: -1 });
    
    const { tree, repoData } = await getRepoTree(repoInfo.owner, repoInfo.repo);
    const deepStats = await deepAnalyze(repoInfo.owner, repoInfo.repo, tree);
    
    let score = 100 - (deepStats.long_files * 3) - deepStats.todos - (deepStats.console_logs * 2);
    if (score < 0) score = 0;

    const summary = {
      repo: repoData.full_name,
      stars: repoData.stargazers_count,
      language: repoData.language || "Mixed",
      total_files: tree.length,
      ...deepStats,
      final_score: score
    };

    const aiReview = await generateAIReview(summary, mode);
    
    // Save to MongoDB
    const reportId = crypto.randomUUID().slice(0, 8); // Short ID for URL
    await Report.create({
      reportId,
      repo: summary.repo,
      summary,
      aiReview
    });

    res.json({ ...summary, aiReview, reportId });

  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message || "Analysis failed" });
  }
});

// 2. Get Report Route (For Shareable Links)
app.get("/reports/:id", async (req, res) => {
  try {
    const report = await Report.findOne({ reportId: req.params.id });
    if (!report) return res.status(404).json({ error: "Report not found" });
    res.json({ ...report.summary, ai_review: report.aiReview, reportId: report.reportId });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

// 3. Profile Route (Kept for compatibility)
app.get("/profile", async (req, res) => {
  const username = req.query.user;
  if (!username) return res.status(400).json({ error: "Username required" });
  try {
    const { data: user } = await githubAPI.get(`/users/${username}`);
    res.json({
        username: user.login,
        avatar: user.avatar_url,
        public_repos: user.public_repos,
        followers: user.followers
        // Add more fields if needed
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));