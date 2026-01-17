import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  Github,
  Download,
  Search,
  GitCompare,
  Star,
  FileCode,
  AlertCircle,
  Terminal,
  ArrowRight,
  History as HistoryIcon,
  Lightbulb,
  Loader2,
  User,
  Briefcase,
  Code2,
  Sparkles,
  Bot
} from "lucide-react";

import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

import { 
  ClerkProvider, 
  SignedIn, 
  SignedOut, 
  SignInButton, 
  UserButton, 
  useUser 
} from "@clerk/clerk-react";

import { Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  Tooltip,
  Legend
);

// --- CONFIGURATION ---
const API_BASE_URL = window.location.hostname === "localhost"
  ? "http://localhost:5000"
  : "https://repolens-j3j0.onrender.com";

// --- FIX: USE import.meta.env FOR VITE ---
const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY; 

if (!CLERK_KEY) {
  console.error("Missing Clerk Key! Check your .env file and ensure it starts with VITE_");
}

// Chart options - Optimized for Dark Mode
const commonOptions = {
  responsive: true,
  animation: {
    duration: 1000,
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "#0f172a", 
      padding: 12,
      cornerRadius: 8,
      displayColors: false,
      titleColor: "#f8fafc",
      bodyColor: "#cbd5e1",
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: {
        font: { family: "Inter" },
        color: "#94a3b8",
      },
    },
    y: {
      grid: { display: false },
      ticks: { display: false },
    },
  },
};

export default function App() {
  const [mode, setMode] = useState("analyze"); 
  const [persona, setPersona] = useState("developer");
  
  // --- MODAL STATE ---
  const [showWelcomeModal, setShowWelcomeModal] = useState(true);

  const [repo, setRepo] = useState("");
  const [repo1, setRepo1] = useState("");
  const [repo2, setRepo2] = useState("");

  const [data, setData] = useState(null);
  const [data1, setData1] = useState(null);
  const [data2, setData2] = useState(null);

  const [profileUser, setProfileUser] = useState("");
  const [profileData, setProfileData] = useState(null);

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState("");

  const reportRef = useRef(null);

  // --- FORCE DARK MODE ---
  useEffect(() => {
    document.documentElement.classList.add("dark");
    document.documentElement.classList.remove("light");
    document.body.style.backgroundColor = "#020617"; 
  }, []);

  const handlePersonaSelect = (selectedPersona) => {
    setPersona(selectedPersona);
    setShowWelcomeModal(false);
  };

  const analyzeRepo = async () => {
    if (!repo.trim()) return;

    setLoading(true);
    setError("");
    setData(null);

    // Pass persona to backend
    const apiMode = persona === "hr" ? "hr" : "dev";

    try {
      const res = await axios.get(
        `${API_BASE_URL}/analyze?repo=${repo}&mode=${apiMode}`
      );
      setData(res.data);

      setHistory((prev) => {
        const newHistory = [repo, ...prev.filter((item) => item !== repo)];
        return newHistory.slice(0, 5);
      });
    } catch (err) {
      console.error(err);
      setError("Unable to connect to server. Please try again.");
    }

    setLoading(false);
  };

  const compareRepos = async () => {
    if (!repo1.trim() || !repo2.trim()) return;

    setLoading(true);
    setError("");
    setData1(null);
    setData2(null);

    try {
      const [res1, res2] = await Promise.all([
        axios.get(`${API_BASE_URL}/analyze?repo=${repo1}&mode=dev`),
        axios.get(`${API_BASE_URL}/analyze?repo=${repo2}&mode=dev`),
      ]);

      setData1(res1.data);
      setData2(res2.data);

      setHistory((prev) => {
        const unique = new Set([repo1, repo2, ...prev]);
        return Array.from(unique).slice(0, 5);
      });
    } catch {
      setError("Comparison failed. Check both URLs.");
    }

    setLoading(false);
  };

  const fetchProfile = async () => {
    if (!profileUser) return;

    setLoading(true);
    setError("");
    setProfileData(null);

    try {
      const res = await axios.get(
        `${API_BASE_URL}/profile?user=${profileUser}`
      );
      setProfileData(res.data);
    } catch {
      setError("Failed to fetch profile. Check username.");
    }

    setLoading(false);
  };

  const exportPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#0f172a", 
        windowWidth: reportRef.current.scrollWidth,
        windowHeight: reportRef.current.scrollHeight,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgProps = pdf.getImageProperties(imgData);
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;
      }
      pdf.save(`repolens-${mode}-report.pdf`);
    } catch (err) {
      console.error("PDF Export failed:", err);
      alert("Could not generate PDF. Please try again.");
    }
    setIsExporting(false);
  };

  const showHero = mode === "analyze" && !loading && !data;

  return (
    // 1. Wrap entire App in ClerkProvider
    <ClerkProvider publishableKey={CLERK_KEY}>
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-900 flex flex-col">
        
        {/* --- WELCOME MODAL OVERLAY --- */}
        {showWelcomeModal && (
          <WelcomeModal onSelect={handlePersonaSelect} />
        )}

        {/* Navigation */}
        <nav className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
            
            <div className="flex items-center gap-2 text-indigo-400">
              <Github className="w-8 h-8" />
              <span className="text-xl font-bold tracking-tight text-white hidden sm:block">
                RepoLens
              </span>
            </div>

            <div className="hidden md:flex bg-slate-800 p-1 rounded-lg">
              <NavTab active={mode === "analyze"} onClick={() => setMode("analyze")}>Analyze</NavTab>
              <NavTab active={mode === "compare"} onClick={() => setMode("compare")}>Compare</NavTab>
              <NavTab active={mode === "profile"} onClick={() => setMode("profile")}>Profile</NavTab>
            </div>

            <div className="flex items-center gap-4">
              {/* 2. REPLACED STATIC BUTTONS WITH CLERK AUTH BUTTONS */}
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="text-sm font-medium text-slate-300 hover:text-white bg-slate-800 px-4 py-2 rounded-lg border border-slate-700 hover:border-indigo-500 transition-all">
                    Sign In
                  </button>
                </SignInButton>
              </SignedOut>

              <SignedIn>
                <UserButton 
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      avatarBox: "w-9 h-9 border-2 border-slate-700 hover:border-indigo-500"
                    }
                  }}
                />
              </SignedIn>
            </div>
          </div>
        </nav>

        {/* Mobile Tab Bar */}
        <div className="md:hidden bg-slate-900 border-b border-slate-800 p-2 flex justify-around">
           <NavTab active={mode === "analyze"} onClick={() => setMode("analyze")}>Analyze</NavTab>
           <NavTab active={mode === "compare"} onClick={() => setMode("compare")}>Compare</NavTab>
           <NavTab active={mode === "profile"} onClick={() => setMode("profile")}>Profile</NavTab>
        </div>

        <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-8 flex-grow w-full">
          
          {/* --- HERO SECTION --- */}
          {showHero && (
             <div className="flex flex-col items-center justify-center mt-10 md:mt-20 text-center space-y-8 animate-fade-in-up">
              <div className="space-y-4">
                
                {/* 3. OPTIONAL: Personalized Welcome Message */}
                <SignedIn>
                  <Greeting />
                </SignedIn>

                <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight">
                   Analyze any <span className="text-indigo-400">GitHub Repository</span>
                </h1>
                <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto">
                  Get instant insights, code quality metrics, and architectural overviews tailored for {persona === 'developer' ? 'developers' : 'recruiters'}.
                </p>
              </div>

              <div className="w-full max-w-2xl bg-slate-800 p-2 rounded-2xl border border-slate-700 flex flex-col sm:flex-row gap-2">
                <InputGroup
                  icon={<Search className="w-5 h-5 text-slate-400" />}
                  value={repo}
                  onChange={setRepo}
                  placeholder="Enter a github repository Url"
                  onEnter={analyzeRepo}
                />
                <button
                  onClick={analyzeRepo}
                  disabled={!repo.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center"
                >
                  Analyze
                </button>
              </div>
              
               {history.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-2 mt-4">
                    <span className="text-sm text-slate-500 flex items-center gap-1"><HistoryIcon size={14}/> Recent:</span>
                    {history.map((url, i) => (
                      <button
                        key={i}
                        onClick={() => { setRepo(url); analyzeRepo(); }} 
                        className="text-xs bg-slate-800 hover:bg-indigo-900/30 text-slate-300 px-3 py-1.5 rounded-full transition-colors"
                      >
                        {url.replace("https://github.com/", "")}
                      </button>
                    ))}
                  </div>
               )}
            </div>
          )}

          {/* --- STANDARD HEADER --- */}
          {!showHero && (
            <section className="max-w-4xl mx-auto text-center space-y-6 mt-4">
              <div className="bg-slate-900 p-2 rounded-2xl border border-slate-800 flex flex-col md:flex-row gap-2">
                
                {mode === "analyze" && (
                  <InputGroup
                    icon={<Search className="w-5 h-5 text-slate-400" />}
                    value={repo}
                    onChange={setRepo}
                    placeholder="Enter a github repository Url"
                    onEnter={analyzeRepo}
                  />
                )}

                {mode === "compare" && (
                  <>
                    <InputGroup
                      value={repo1}
                      onChange={setRepo1}
                      placeholder="Repository A"
                    />
                    <div className="hidden md:flex items-center text-slate-600">
                      <GitCompare size={20} />
                    </div>
                    <InputGroup
                      value={repo2}
                      onChange={setRepo2}
                      placeholder="Repository B"
                    />
                  </>
                )}

                {mode === "profile" && (
                  <InputGroup
                    icon={<User className="w-5 h-5 text-slate-400" />}
                    value={profileUser}
                    onChange={setProfileUser}
                    placeholder="Enter GitHub username"
                    onEnter={fetchProfile}
                  />
                )}

                <button
                  onClick={
                    mode === "analyze" ? analyzeRepo
                    : mode === "compare" ? compareRepos
                    : fetchProfile
                  }
                  disabled={loading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-medium transition-all active:scale-95 disabled:opacity-70 disabled:scale-100 flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <ArrowRight size={18} />
                  )}
                  <span className="hidden sm:inline">
                     {loading ? "Processing..." : mode === "analyze" ? "Analyze" : mode === "compare" ? "Compare" : "Get Profile"}
                  </span>
                </button>
              </div>
               {error && (
                <div className="inline-flex items-center gap-2 text-red-400 bg-red-900/20 px-4 py-2 rounded-full text-sm font-medium border border-red-900/30">
                  <AlertCircle size={16} /> {error}
                </div>
              )}
            </section>
          )}

          {loading && <LoadingSkeleton />}

          {/* --- ANALYZE RESULTS --- */}
          {mode === "analyze" && data && !loading && (
            <div className="animate-fade-in-up">
              <div className="flex justify-between items-end mb-4">
                <div>
                   <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-semibold">
                      {persona === 'developer' ? <Code2 size={12}/> : <Briefcase size={12}/>}
                      {persona === 'developer' ? "Developer Mode" : "Recruiter Mode"}
                   </span>
                </div>
                <button
                  onClick={exportPDF}
                  disabled={isExporting}
                  className="flex items-center gap-2 text-slate-400 hover:text-indigo-400 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {isExporting ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                  {isExporting ? "Generating PDF..." : "Export PDF"}
                </button>
              </div>

              <div
                ref={reportRef}
                className="bg-slate-900 p-4 md:p-8 rounded-3xl shadow-sm border border-slate-800"
              >
                {persona === "developer" ? (
                  <RepoReport data={data} />
                ) : (
                  <HRDashboard data={data} />
                )}
              </div>
            </div>
          )}

          {/* --- COMPARE RESULTS --- */}
          {mode === "compare" && data1 && data2 && !loading && (
            <div className="animate-fade-in-up">
               <div className="flex justify-end mb-4">
                <button onClick={exportPDF} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-medium text-sm">
                   <Download size={16}/> Export Comparison
                </button>
               </div>
              <div ref={reportRef} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-800">
                  <div className="mb-4 pb-4 border-b border-slate-800 flex items-center gap-2">
                    <div className="w-2 h-8 bg-indigo-500 rounded-full"></div>
                    <h3 className="font-bold text-lg text-white">Repository A</h3>
                  </div>
                  <RepoReport data={data1} isCompact />
                </div>
                <div className="bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-800">
                  <div className="mb-4 pb-4 border-b border-slate-800 flex items-center gap-2">
                    <div className="w-2 h-8 bg-emerald-500 rounded-full"></div>
                    <h3 className="font-bold text-lg text-white">Repository B</h3>
                  </div>
                  <RepoReport data={data2} isCompact />
                </div>
              </div>
            </div>
          )}

          {/* --- PROFILE RESULTS --- */}
          {mode === "profile" && profileData && !loading && (
            <div className="animate-fade-in-up">
                <div className="bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-800">
                  <ProfileCard data={profileData} />
              </div>
            </div>
          )}
        </main>

      <footer className="text-center text-xs text-slate-600 py-8 border-t border-slate-800 mt-8">
        Designed & Developed by{" "}
        <a
          href="https://pawanportfolio-eosin.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-slate-400 hover:text-indigo-400 underline decoration-slate-700 underline-offset-4 hover:decoration-indigo-400 transition-all duration-200"
        >
          Pawan Singh
        </a>{" "}
        · RepoLens © {new Date().getFullYear()}
      </footer>
      </div>
    </ClerkProvider>
  );
}

/* ---------- COMPONENTS ---------- */

// Helper component to use Clerk hook inside ClerkProvider
function Greeting() {
  const { user } = useUser();
  if (!user) return null;
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-900/30 border border-indigo-500/30 text-indigo-300 text-sm mb-2 animate-fade-in-up">
      <Sparkles size={14} /> Welcome back, {user.firstName}!
    </div>
  );
}

function WelcomeModal({ onSelect }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"></div>
      <div className="relative bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full p-8 border border-slate-800 animate-scale-in">
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-900/30 rounded-full text-indigo-400 mb-4">
             <Github size={28} />
          </div>
          <h2 className="text-3xl font-bold text-white">Welcome to RepoLens</h2>
          <p className="text-slate-400">
            Tell us about your role so we can tailor the insights for you.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => onSelect("developer")}
            className="group relative p-6 rounded-2xl border-2 border-slate-800 hover:border-indigo-500 hover:bg-indigo-900/10 transition-all text-left"
          >
            <div className="mb-3 w-10 h-10 rounded-full bg-slate-800 group-hover:bg-slate-700 flex items-center justify-center text-indigo-400 transition-colors">
              <Code2 size={20} />
            </div>
            <h3 className="font-bold text-white mb-1">Developer</h3>
            <p className="text-xs text-slate-400">Deep code metrics, debt analysis, and architecture.</p>
          </button>

          <button
            onClick={() => onSelect("hr")}
            className="group relative p-6 rounded-2xl border-2 border-slate-800 hover:border-emerald-500 hover:bg-emerald-900/10 transition-all text-left"
          >
            <div className="mb-3 w-10 h-10 rounded-full bg-slate-800 group-hover:bg-slate-700 flex items-center justify-center text-emerald-400 transition-colors">
              <Briefcase size={20} />
            </div>
            <h3 className="font-bold text-white mb-1">Recruiter / HR</h3>
            <p className="text-xs text-slate-400">Candidate summaries, skill verification, and fit.</p>
          </button>
        </div>
      </div>
    </div>
  );
}

function NavTab({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
        active
          ? "bg-slate-700 text-indigo-400 shadow-sm"
          : "text-slate-400 hover:text-slate-200"
      }`}
    >
      {children}
    </button>
  );
}

function InputGroup({ icon, value, onChange, placeholder, onEnter }) {
  return (
    <div className="flex-1 flex items-center px-4 bg-transparent">
      {icon}
      <input
        className="w-full bg-transparent p-2 outline-none text-slate-200 placeholder:text-slate-500"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        onKeyDown={(e) => e.key === "Enter" && onEnter && onEnter()}
      />
    </div>
  );
}

function AIAnalysisCard({ content, type = "dev" }) {
  if (type === "hr") {
    return (
      <div className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden flex flex-col h-full">
        <div className="bg-slate-800 p-4 border-b border-slate-700 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-900/30 flex items-center justify-center text-indigo-400">
            <Sparkles size={18} />
          </div>
          <h4 className="font-semibold text-white">Executive Summary</h4>
        </div>
        <div className="p-6">
          <p className="text-slate-300 leading-relaxed text-sm md:text-base whitespace-pre-line">
            {content || "No analysis available."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black rounded-2xl border border-slate-800 overflow-hidden flex flex-col h-full shadow-lg relative group">
      <div className="bg-slate-900 p-3 flex items-center justify-between border-b border-slate-800">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
          <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
          <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
        </div>
        <div className="flex items-center gap-2 text-indigo-400 opacity-80">
          <Bot size={14} />
          <span className="font-mono text-xs uppercase tracking-widest">RepoLens AI</span>
        </div>
      </div>
      <div className="p-6 relative font-mono text-sm leading-relaxed overflow-hidden">
        <div className="absolute -bottom-4 -right-4 opacity-10 pointer-events-none text-white">
           <Terminal size={140} />
        </div>
        <div className="relative z-10 text-slate-300">
           <span className="text-indigo-400 mr-2">$</span>
           <span className="typing-effect">{content || "Analysis complete."}</span>
           <span className="animate-pulse inline-block w-2 h-4 bg-indigo-500 ml-1 align-middle"></span>
        </div>
      </div>
    </div>
  );
}

function HRDashboard({ data }) {
  const verdict =
    data.final_score > 80
      ? "Strong Hire"
      : data.final_score > 60
      ? "Good Junior Candidate"
      : "Needs Improvement";

  const verdictColor = 
     data.final_score > 80 ? "text-emerald-400" 
     : data.final_score > 60 ? "text-amber-400" 
     : "text-red-400";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-white">Candidate Summary</h2>
        <HealthBadge score={data.final_score} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Overall Score" value={`${data.final_score}/100`} />
        <MetricCard label="GitHub Stars" value={data.stars} />
        <MetricCard label="Primary Language" value={data.language} />
        <MetricCard label="Project Scale" value={`${data.total_files} files`} />
      </div>

      <div className="bg-indigo-900/20 p-6 rounded-2xl border border-indigo-900/30">
        <h3 className="font-semibold text-indigo-300 mb-2 uppercase tracking-wide text-sm">Hiring Recommendation</h3>
        <p className={`text-2xl font-bold ${verdictColor}`}>{verdict}</p>
        <p className="text-slate-400 mt-2 text-sm">
           Based on code quality, documentation habits, and architectural consistency.
        </p>
      </div>

      <AIAnalysisCard 
        content={data.ai_review || "The candidate shows good grasp of fundamentals."}
        type="hr"
      />
    </div>
  );
}

function ProfileCard({ data }) {
  if (!data) return null;
  const langLabels = data.top_languages ? data.top_languages.map((l) => l[0]) : [];
  const langValues = data.top_languages ? data.top_languages.map((l) => l[1]) : [];

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-6">
        <img
          src={data.avatar}
          alt={data.username}
          className="w-24 h-24 rounded-full border-4 border-slate-800 shadow-sm"
        />
        <div>
          <h3 className="text-3xl font-bold text-white">{data.username}</h3>
          <p className="text-slate-400 font-medium">
            {data.followers} followers · {data.following} following
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Public Repos" value={data.public_repos} />
        <MetricCard label="Total Stars" value={data.total_stars} />
        <MetricCard 
          label="Joined" 
          value={data.created_at ? new Date(data.created_at).getFullYear() : "N/A"} 
        />
        <MetricCard 
          label="Best Repo" 
          value={data.best_repo?.name || "N/A"} 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-slate-800/50 p-6 rounded-2xl border border-slate-800">
           <h4 className="font-semibold mb-4 text-slate-300">Top Languages</h4>
           <div className="h-64">
              <Bar
                data={{
                  labels: langLabels,
                  datasets: [
                    {
                      label: "Bytes",
                      data: langValues,
                      backgroundColor: "#6366f1",
                      borderRadius: 6,
                    },
                  ],
                }}
                options={commonOptions}
              />
           </div>
        </div>
        
        <div className="bg-indigo-900/20 p-6 rounded-2xl border border-indigo-900/30 flex flex-col justify-center items-center text-center">
             <Lightbulb className="text-indigo-500 mb-2" size={32} />
             <p className="text-indigo-300 font-medium">Profile Insight</p>
             <p className="text-sm text-indigo-400 mt-2">
               User is most active in <strong>{langLabels[0] || "Unknown"}</strong> development.
             </p>
        </div>
      </div>
    </div>
  );
}

function HealthBadge({ score }) {
  let label = "Needs Review";
  let color = "bg-amber-900/30 text-amber-400 border-amber-800";
  let icon = <AlertCircle size={12} />;

  if (score >= 80) {
    label = "Healthy";
    color = "bg-emerald-900/30 text-emerald-400 border-emerald-800";
    icon = <Star size={12} />;
  } else if (score < 50) {
    label = "Risky";
    color = "bg-red-900/30 text-red-400 border-red-800";
    icon = <AlertCircle size={12} />;
  }

  return (
    <span
      className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${color}`}
    >
      {icon} {label}
    </span>
  );
}

function Insights({ data }) {
  const insights = [];

  if (data.large_files > 5) {
    insights.push("Consider splitting large files into smaller modules.");
  }
  if (data.todos > 10) {
    insights.push("High number of TODOs may indicate unfinished features.");
  }
  if (data.console_logs > 5) {
    insights.push("Remove console.logs before production deployment.");
  }
  if (insights.length === 0) {
    insights.push("Codebase looks clean with no major red flags.");
  }

  return (
    <div className="bg-indigo-900/20 border border-indigo-900/30 p-5 rounded-2xl space-y-3">
      <div className="flex items-center gap-2 text-indigo-400">
        <Lightbulb size={18} />
        <h4 className="font-semibold">Key Insights</h4>
      </div>
      <ul className="space-y-2">
        {insights.map((insight, idx) => (
          <li
            key={idx}
            className="flex items-start gap-2 text-sm text-slate-300"
          >
            <span className="mt-1.5 w-1.5 h-1.5 bg-indigo-400 rounded-full flex-shrink-0" />
            {insight}
          </li>
        ))}
      </ul>
    </div>
  );
}

function RepoReport({ data, isCompact = false }) {
  const scoreColor =
    data.final_score > 80
      ? "text-emerald-400"
      : data.final_score > 50
      ? "text-amber-400"
      : "text-red-400";

  const scoreBgColor =
    data.final_score > 80
      ? "#10b981"
      : data.final_score > 50
      ? "#f59e0b"
      : "#ef4444";

  return (
    <div className="space-y-8">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <div className="text-xs font-bold tracking-wider text-slate-400 uppercase">
              Repository
            </div>
            <HealthBadge score={data.final_score} />
          </div>

          <h2
            className={`font-bold text-white break-all ${
              isCompact ? "text-xl" : "text-3xl"
            }`}
          >
            {data.repo.replace("https://github.com/", "")}
          </h2>
          <div className="flex gap-3 mt-2">
            <Badge icon={<FileCode size={14} />} text={data.language} />
            <Badge icon={<Star size={14} />} text={`${data.stars} Stars`} />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden md:block">
            <div className="text-sm text-slate-400">Overall Health</div>
            <div className={`text-3xl font-black ${scoreColor}`}>
              {data.final_score}/100
            </div>
          </div>
          <div className="relative w-16 h-16">
            <Doughnut
              data={{
                labels: ["Score", "Gap"],
                datasets: [
                  {
                    data: [data.final_score, 100 - data.final_score],
                    backgroundColor: [scoreBgColor, "rgba(241, 245, 249, 0.2)"],
                    borderWidth: 0,
                  },
                ],
              }}
              options={{ ...commonOptions, cutout: "75%" }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-400">
              {data.final_score}%
            </div>
          </div>
        </div>
      </div>

      <hr className="border-slate-800" />

      {/* Metrics Grid */}
      <div
        className={`grid ${
          isCompact ? "grid-cols-2" : "grid-cols-2 md:grid-cols-4"
        } gap-4`}
      >
        <MetricCard label="Total Files" value={data.total_files} />
        <MetricCard
          label="JS/TS Ratio"
          value={`${((data.js_ts_files / data.total_files) * 100).toFixed(0)}%`}
        />
        <MetricCard
          label="Complex Files"
          value={data.large_files}
          alert={data.large_files > 5}
        />
        <MetricCard label="Todo Count" value={data.todos} />
      </div>

      <div
        className={`grid ${
          isCompact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-3"
        } gap-6`}
      >
        {/* Charts */}
        <div className="md:col-span-1 bg-slate-800/50 p-5 rounded-2xl border border-slate-800">
          <h4 className="text-sm font-semibold text-slate-400 mb-4">
            File Distribution
          </h4>
          <div className="h-40">
            <Bar
              data={{
                labels: ["Code", "Large", "Logs"],
                datasets: [
                  {
                    label: "Files",
                    data: [
                      data.js_ts_files,
                      data.large_files,
                      data.console_logs,
                    ],
                    backgroundColor: ["#6366f1", "#f43f5e", "#64748b"],
                    borderRadius: 6,
                  },
                ],
              }}
              options={commonOptions}
            />
          </div>
        </div>

        {/* INSIGHTS + AI Insight */}
        <div className="md:col-span-2 flex flex-col gap-4">
          <Insights data={data} />
          
          {/* Replaced old text block with new Component */}
          <AIAnalysisCard 
             content={data.ai_review || "Analysis complete. The codebase structure appears standard, though specific optimizations in large files could improve maintainability."}
             type="dev"
          />
        </div>
      </div>
    </div>
  );
}

function Badge({ icon, text }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-semibold">
      {icon} {text}
    </span>
  );
}

function MetricCard({ label, value, alert = false }) {
  return (
    <div
      className={`p-4 rounded-xl border transition-colors ${
        alert 
          ? "bg-red-900/20 border-red-900/30" 
          : "bg-slate-800 border-slate-700"
      }`}
    >
      <p
        className={`text-xs font-medium mb-1 ${
          alert ? "text-red-400" : "text-slate-400"
        }`}
      >
        {label}
      </p>
      <p
        className={`text-2xl font-bold ${
          alert ? "text-red-300" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
      <div className="h-64 bg-slate-800 rounded-3xl md:col-span-2"></div>
      <div className="h-64 bg-slate-800 rounded-3xl"></div>
      <div className="h-40 bg-slate-800 rounded-3xl md:col-span-3"></div>
    </div>
  );
}