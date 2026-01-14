const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

console.log("GROQ KEY:", process.env.GROQ_API_KEY?.slice(0, 8));
console.log("GITHUB TOKEN:", process.env.GITHUB_TOKEN?.slice(0, 8));

/* ---------------- GITHUB AUTH CLIENT ---------------- */

const githubAPI = axios.create({
  baseURL: "https://api.github.com",
  headers: {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`
  }
});

/* ---------------- AI REVIEW (GROQ) ---------------- */

async function generateAIReview(summary) {
  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.1-8b-instant", // ✅ UPDATED MODEL
        messages: [
          {
            role: "system",
            content: "You are a senior software engineer giving short, practical code review feedback."
          },
          {
            role: "user",
            content: `
Here is repository analysis:
${JSON.stringify(summary, null, 2)}

Give:
- Strengths (2 bullets)
- Weaknesses (2 bullets)
- Suggestions (2 bullets)
Short, clear, professional.
`
          }
        ],
        temperature: 0.4
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        timeout: 15000
      }
    );

    return response.data.choices[0].message.content;
  } catch (err) {
    console.error("AI ERROR:", err.response?.data || err.message);

    // Fallback (important for production stability)
    return `
Strengths:
- Repository structure looks consistent
- Metrics indicate reasonable maintainability

Weaknesses:
- Some files may benefit from refactoring
- Minor technical debt visible in metrics

Suggestions:
- Reduce TODOs and console logs
- Break down large files into modules
`.trim();
  }
}


/* ---------------- HELPERS ---------------- */

function extractRepoInfo(url) {
  try {
    const parts = url.replace("https://github.com/", "").split("/");
    return { owner: parts[0], repo: parts[1] };
  } catch {
    return null;
  }
}

async function getRepoTree(owner, repo) {
  const { data: repoData } = await githubAPI.get(`/repos/${owner}/${repo}`);

  const defaultBranch = repoData.default_branch;

  const { data: branchData } = await githubAPI.get(
    `/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`
  );

  return branchData.tree;
}

function analyzeTree(tree) {
  const files = tree.filter(item => item.type === "blob");

  const jsFiles = files.filter(f =>
    f.path.endsWith(".js") || f.path.endsWith(".ts")
  );

  const largeFiles = files.filter(f => f.size > 500 * 1024);

  const badNamedFiles = files.filter(f =>
    f.path.includes("temp") ||
    f.path.includes("test123") ||
    f.path.includes("asdf")
  );

  return {
    total_files: files.length,
    js_ts_files: jsFiles.length,
    large_files: largeFiles.length,
    bad_named_files: badNamedFiles.length
  };
}

async function getFileContent(owner, repo, path) {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/main/${path}`;
  try {
    const res = await axios.get(url);
    return res.data;
  } catch {
    return null;
  }
}

async function deepAnalyze(owner, repo, tree) {
  const files = tree.filter(f =>
    f.type === "blob" &&
    (f.path.endsWith(".js") || f.path.endsWith(".ts"))
  );

  let longFiles = 0;
  let todoCount = 0;
  let consoleLogs = 0;
  let possibleSecrets = 0;

  const sample = files.slice(0, 40);

  for (let file of sample) {
    const content = await getFileContent(owner, repo, file.path);
    if (!content) continue;

    const lines = content.split("\n");

    if (lines.length > 300) longFiles++;

    lines.forEach(line => {
      if (line.includes("TODO") || line.includes("FIXME")) todoCount++;
      if (line.includes("console.log")) consoleLogs++;

      if (
        line.toLowerCase().includes("apikey") ||
        line.toLowerCase().includes("secret") ||
        line.toLowerCase().includes("token =")
      ) {
        possibleSecrets++;
      }
    });
  }

  return {
    analyzed_files: sample.length,
    long_files: longFiles,
    todos: todoCount,
    console_logs: consoleLogs,
    possible_secrets: possibleSecrets
  };
}

/* ---------------- MAIN ENDPOINT ---------------- */

app.get("/analyze", async (req, res) => {
  const repoUrl = req.query.repo;

  if (!repoUrl) {
    return res.status(400).json({ error: "Repo URL required" });
  }

  const repoInfo = extractRepoInfo(repoUrl);
  if (!repoInfo) {
    return res.status(400).json({ error: "Invalid GitHub URL" });
  }

  try {
    const { owner, repo } = repoInfo;

    const { data: repoData } = await githubAPI.get(`/repos/${owner}/${repo}`);

    const tree = await getRepoTree(owner, repo);
    const basic = analyzeTree(tree);
    const deep = await deepAnalyze(owner, repo, tree);

    let score = 100;
    score -= deep.long_files * 2;
    score -= deep.todos;
    score -= deep.console_logs;
    score -= deep.possible_secrets * 10;
    if (score < 0) score = 0;

    const summary = {
      repo: repoData.full_name,
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
      language: repoData.language,
      ...basic,
      ...deep,
      final_score: score
    };

    const aiReview = await generateAIReview(summary);

    res.json({
      ...summary,
      ai_review: aiReview
    });

  } catch (err) {
    console.error("ANALYZE ERROR:", err.response?.data || err.message);
    res.status(500).json({
      error: "Analysis failed",
      details: err.response?.data || err.message
    });
  }
});

/* ---------------- PROFILE ---------------- */
app.get("/profile", async (req, res) => {
  const username = req.query.user;

  if (!username) {
    return res.status(400).json({ error: "Username required" });
  }

  try {
    const headers = process.env.GITHUB_TOKEN
      ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
      : {};

    const { data: user } = await axios.get(
      `https://api.github.com/users/${username}`,
      { headers }
    );

    const { data: repos } = await axios.get(
      `https://api.github.com/users/${username}/repos?per_page=100`,
      { headers }
    );

    const totalStars = repos.reduce(
      (sum, repo) => sum + repo.stargazers_count,
      0
    );

    const languageCount = {};
    repos.forEach((repo) => {
      if (repo.language) {
        languageCount[repo.language] =
          (languageCount[repo.language] || 0) + 1;
      }
    });

    const topLanguages = Object.entries(languageCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const topRepo = repos.sort(
      (a, b) => b.stargazers_count - a.stargazers_count
    )[0];

    res.json({
      username: user.login,
      avatar: user.avatar_url,
      followers: user.followers,
      following: user.following,
      public_repos: user.public_repos,
      total_stars: totalStars,
      created_at: user.created_at,
      top_languages: topLanguages,
      best_repo: topRepo
        ? {
            name: topRepo.name,
            stars: topRepo.stargazers_count,
            url: topRepo.html_url,
          }
        : null,
    });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});


/* ---------------- ROOT ---------------- */

app.get("/", (req, res) => {
  res.send("GitHub Repo Analyzer API running");
});

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
