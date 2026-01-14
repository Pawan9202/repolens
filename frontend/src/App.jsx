import React, { useState, useRef } from "react";
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
  LayoutTemplate,
  Loader2 // Added loader icon
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

import { Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  Tooltip,
  Legend
);

// Chart options
const commonOptions = {
  responsive: true,
  animation: {
    duration: 1000, // Ensure animation doesn't break PDF capture if captured late
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "#1e293b",
      padding: 12,
      cornerRadius: 8,
      displayColors: false,
    },
  },
  scales: {
    x: { grid: { display: false }, ticks: { font: { family: "Inter" } } },
    y: { grid: { display: false }, ticks: { display: false } },
  },
};

export default function App() {
  const [mode, setMode] = useState("analyze");

  const [repo, setRepo] = useState("https://github.com/vercel/next.js");
  const [repo1, setRepo1] = useState("https://github.com/vercel/next.js");
  const [repo2, setRepo2] = useState("https://github.com/facebook/react");

  const [data, setData] = useState(null);
  const [data1, setData1] = useState(null);
  const [data2, setData2] = useState(null);

  const [history, setHistory] = useState([]);

  const [loading, setLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false); // New state for PDF loading
  const [error, setError] = useState("");

  const reportRef = useRef(null);

  const analyzeRepo = async () => {
    setLoading(true);
    setError("");
    setData(null);

    try {
      const res = await axios.get(`https://repolens-j3j0.onrender.com/analyze?repo=${repo}`);
      setData(res.data);
      
      setHistory((prev) => {
        const newHistory = [repo, ...prev.filter(item => item !== repo)];
        return newHistory.slice(0, 5);
      });

    } catch{
      setError("Unable to fetch repository data. Please check the URL.");
    }

    setLoading(false);
  };

  const compareRepos = async () => {
    setLoading(true);
    setError("");
    setData1(null);
    setData2(null);

    try {
      const [res1, res2] = await Promise.all([
        axios.get(`http://localhost:5000/analyze?repo=${repo1}`),
        axios.get(`http://localhost:5000/analyze?repo=${repo2}`),
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

  // --- FIXED PDF EXPORT FUNCTION ---
  const exportPDF = async () => {
    if (!reportRef.current) {
      console.error("Report reference not found");
      return;
    }

    setIsExporting(true); // Start loading state

    try {
      // Small delay to ensure any re-renders or animations are settled
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(reportRef.current, {
        scale: 2, // Higher quality
        useCORS: true, // Handle external images
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: reportRef.current.scrollWidth,
        windowHeight: reportRef.current.scrollHeight
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgProps = pdf.getImageProperties(imgData);
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

      // Logic to handle if content is taller than 1 page
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight);
      heightLeft -= pdfHeight;

      // If content is longer than one page, add new pages
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

    setIsExporting(false); // End loading state
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 flex flex-col">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-600">
            <Github className="w-8 h-8" />
            <span className="text-xl font-bold tracking-tight text-slate-900">
              RepoLens
            </span>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <NavTab
              active={mode === "analyze"}
              onClick={() => setMode("analyze")}
            >
              Analyze
            </NavTab>
            <NavTab
              active={mode === "compare"}
              onClick={() => setMode("compare")}
            >
              Compare
            </NavTab>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 space-y-8 flex-grow w-full">
        {/* Hero / Input Section */}
        <section className="max-w-3xl mx-auto text-center space-y-6 mt-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
            {mode === "analyze"
              ? "Audit your Codebase"
              : "Compare Architectures"}
          </h1>
          <p className="text-slate-500 text-lg">
            AI-powered insights into code quality, structure, and maintainability.
          </p>

          <div className="bg-white p-2 rounded-2xl shadow-xl shadow-indigo-100 border border-slate-200 flex flex-col md:flex-row gap-2">
            {mode === "analyze" ? (
              <InputGroup
                icon={<Search className="w-5 h-5 text-slate-400" />}
                value={repo}
                onChange={setRepo}
                placeholder="https://github.com/username/repo"
                onEnter={analyzeRepo}
              />
            ) : (
              <>
                <InputGroup
                  value={repo1}
                  onChange={setRepo1}
                  placeholder="Repository A"
                />
                <div className="hidden md:flex items-center text-slate-300">
                  <GitCompare size={20} />
                </div>
                <InputGroup
                  value={repo2}
                  onChange={setRepo2}
                  placeholder="Repository B"
                />
              </>
            )}
            <button
              onClick={mode === "analyze" ? analyzeRepo : compareRepos}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-medium transition-all active:scale-95 disabled:opacity-70 disabled:scale-100 flex items-center justify-center gap-2"
            >
              {loading
                ? "Scanning..."
                : mode === "analyze"
                ? "Analyze"
                : "Compare"}
              {!loading && <ArrowRight size={18} />}
            </button>
          </div>

          {/* History Panel */}
          {history.length > 0 && mode === "analyze" && (
            <div className="flex justify-center mt-2">
               <History items={history} onSelect={setRepo} />
            </div>
          )}

          {error && (
            <div className="inline-flex items-center gap-2 text-red-600 bg-red-50 px-4 py-2 rounded-full text-sm font-medium">
              <AlertCircle size={16} /> {error}
            </div>
          )}
        </section>

        {/* Results Section */}
        {loading && <LoadingSkeleton />}
        
        {!loading && !data && !data1 && mode === "analyze" && <EmptyState />}

        {/* ANALYZE RESULT */}
        {mode === "analyze" && data && !loading && (
          <div className="animate-fade-in-up">
            <div className="flex justify-end mb-4">
              <button
                onClick={exportPDF}
                disabled={isExporting}
                className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors text-sm font-medium disabled:opacity-50"
              >
                {isExporting ? <Loader2 className="animate-spin" size={16}/> : <Download size={16} />} 
                {isExporting ? "Generating PDF..." : "Export PDF"}
              </button>
            </div>

            <div
              ref={reportRef}
              className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200"
            >
              <RepoReport data={data} />
            </div>
          </div>
        )}

        {/* COMPARE RESULT */}
        {mode === "compare" && data1 && data2 && !loading && (
          <div className="animate-fade-in-up">
            <div className="flex justify-end mb-4">
              <button
                onClick={exportPDF}
                disabled={isExporting}
                className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors text-sm font-medium disabled:opacity-50"
              >
                 {isExporting ? <Loader2 className="animate-spin" size={16}/> : <Download size={16} />} 
                 {isExporting ? "Generating PDF..." : "Export Comparison PDF"}
              </button>
            </div>

            <div ref={reportRef} className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-slate-50"> 
               {/* Note: Added bg-slate-50 to container so PDF capture looks consistent */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                <div className="mb-4 pb-4 border-b border-slate-100 flex items-center gap-2">
                  <div className="w-2 h-8 bg-indigo-500 rounded-full"></div>
                  <h3 className="font-bold text-lg">Repository A</h3>
                </div>
                <RepoReport data={data1} isCompact />
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                <div className="mb-4 pb-4 border-b border-slate-100 flex items-center gap-2">
                  <div className="w-2 h-8 bg-emerald-500 rounded-full"></div>
                  <h3 className="font-bold text-lg">Repository B</h3>
                </div>
                <RepoReport data={data2} isCompact />
              </div>
            </div>
          </div>
        )}
      </main>
      
      <footer className="text-center text-xs text-slate-400 py-8 border-t border-slate-100 mt-8">
        Built with ❤️ by Pawan · RepoLens © {new Date().getFullYear()}
      </footer>
    </div>
  );
}

/* ---------- UI COMPONENTS ---------- */

function NavTab({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
        active
          ? "bg-white text-indigo-600 shadow-sm"
          : "text-slate-500 hover:text-slate-700"
      }`}
    >
      {children}
    </button>
  );
}

function InputGroup({
  icon,
  value,
  onChange,
  placeholder,
  onEnter,
}) {
  return (
    <div className="flex-1 flex items-center px-4 bg-transparent">
      {icon}
      <input
        className="w-full bg-transparent p-2 outline-none text-slate-700 placeholder:text-slate-400"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        onKeyDown={(e) => e.key === "Enter" && onEnter && onEnter()}
      />
    </div>
  );
}

function HealthBadge({ score }) {
  let label = "Needs Review";
  let color = "bg-amber-100 text-amber-700 border-amber-200";
  let icon = <AlertCircle size={12} />;

  if (score >= 80) {
    label = "Healthy";
    color = "bg-emerald-100 text-emerald-700 border-emerald-200";
    icon = <Star size={12} />;
  } else if (score < 50) {
    label = "Risky";
    color = "bg-red-100 text-red-700 border-red-200";
    icon = <AlertCircle size={12} />;
  }

  return (
    <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${color}`}>
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
    <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-2xl space-y-3">
      <div className="flex items-center gap-2 text-indigo-700">
        <Lightbulb size={18} />
        <h4 className="font-semibold">Key Insights</h4>
      </div>
      <ul className="space-y-2">
        {insights.map((insight, idx) => (
          <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
             <span className="mt-1.5 w-1.5 h-1.5 bg-indigo-400 rounded-full flex-shrink-0" />
             {insight}
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center text-center bg-white border border-slate-200 border-dashed rounded-3xl p-12 text-slate-500 max-w-2xl mx-auto mt-8">
      <div className="bg-slate-50 p-4 rounded-full mb-4">
        <LayoutTemplate className="w-8 h-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-700 mb-2">
        No analysis yet
      </h3>
      <p className="text-sm max-w-sm mx-auto text-slate-400">
        Paste a GitHub repository URL above and run an analysis to see detailed
        insights, charts, and exportable reports.
      </p>
    </div>
  );
}

function History({ items, onSelect }) {
  if (items.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 py-3 px-4 rounded-xl shadow-sm inline-flex flex-col items-center gap-2 max-w-xl">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
        <HistoryIcon size={12} /> Recent Scans
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {items.map((url, i) => (
          <button
            key={i}
            onClick={() => onSelect(url)}
            className="text-xs bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 px-3 py-1.5 rounded-lg transition-colors truncate max-w-[200px]"
          >
            {url.replace("https://github.com/", "")}
          </button>
        ))}
      </div>
    </div>
  );
}

function RepoReport({ data, isCompact = false }) {
  const scoreColor =
    data.final_score > 80
      ? "text-emerald-600"
      : data.final_score > 50
      ? "text-amber-500"
      : "text-red-500";

  const scoreBgColor =
    data.final_score > 80 ? "#10b981" : data.final_score > 50 ? "#f59e0b" : "#ef4444";

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
            className={`font-bold text-slate-900 break-all ${
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
            <div className="text-sm text-slate-500">Overall Health</div>
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
                    backgroundColor: [scoreBgColor, "#f1f5f9"],
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

      <hr className="border-slate-100" />

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
        <div className="md:col-span-1 bg-slate-50 p-5 rounded-2xl border border-slate-100">
          <h4 className="text-sm font-semibold text-slate-500 mb-4">
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

        {/* NEW INSIGHTS + AI Insight */}
        <div className="md:col-span-2 flex flex-col gap-4">
             {/* Render Insights Component */}
             <Insights data={data} />

             <div className="bg-slate-900 text-slate-300 p-6 rounded-2xl relative overflow-hidden flex-grow">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Terminal size={120} />
                </div>
                <div className="flex items-center gap-2 mb-3 text-indigo-400">
                    <Terminal size={18} />
                    <span className="font-mono text-sm font-bold uppercase tracking-widest">
                    AI Analysis
                    </span>
                </div>
                <p className="relative z-10 font-light leading-relaxed text-sm md:text-base">
                    "{data.ai_review ||
                    "Analysis complete. The codebase structure appears standard, though specific optimizations in large files could improve maintainability."}"
                </p>
            </div>
        </div>
      </div>
    </div>
  );
}

function Badge({ icon, text }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
      {icon} {text}
    </span>
  );
}

function MetricCard({ label, value, alert = false }) {
  return (
    <div
      className={`p-4 rounded-xl border ${
        alert ? "bg-red-50 border-red-100" : "bg-white border-slate-100"
      }`}
    >
      <p
        className={`text-xs font-medium mb-1 ${
          alert ? "text-red-600" : "text-slate-500"
        }`}
      >
        {label}
      </p>
      <p
        className={`text-2xl font-bold ${
          alert ? "text-red-700" : "text-slate-900"
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
      <div className="h-64 bg-slate-200 rounded-3xl md:col-span-2"></div>
      <div className="h-64 bg-slate-200 rounded-3xl"></div>
      <div className="h-40 bg-slate-200 rounded-3xl md:col-span-3"></div>
    </div>
  );
}