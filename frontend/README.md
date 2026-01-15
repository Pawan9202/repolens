# RepoLens 🔍  
**AI-Powered GitHub Repository Analyzer & Developer Intelligence Platform**

RepoLens is a full-stack web application that analyzes GitHub repositories and profiles to provide actionable insights on code quality, structure, and maintainability. It combines real-time data from GitHub APIs with AI-generated reviews and interactive visual dashboards.

> 🚀 Live Demo: https://repolens-five.vercel.app/ 
> 🔗 Backend API:https://repolens-j3j0.onrender.com

---

## ✨ Features

### 🔎 Repository Analysis
- Analyze any public GitHub repository
- Code quality scoring system (0–100)
- Metrics detected:
  - Total files
  - JS/TS files
  - Large files
  - TODOs
  - Console logs
  - Potential issues
- AI-generated engineering-style review (Groq LLM)
- Interactive charts (Bar + Doughnut)
- Export full report as PDF

### ⚖️ Compare Repositories
- Compare two repositories side-by-side
- Visual metric comparison
- Quality verdict
- Export comparison report as PDF

### 🎨 Product-Level UI
- Clean SaaS-style interface
- Analyze / Compare tabs
- Responsive dashboard layout
- Loading skeletons & error handling
- Professional design (Tailwind CSS + Lucide icons)

### 🔐 Secure Architecture
- Backend handles all secrets (Groq API, GitHub token)
- No API keys exposed to frontend
- Environment variables managed securely on Render

---

## 🧠 Why RepoLens?
Recruiters and developers often look at GitHub projects but lack structured insight into code quality. RepoLens solves this by acting like a **code audit tool** for public repositories — similar to how tools like SonarQube or CodeClimate work, but simpler and visual.

---

## 🛠️ Tech Stack

### Frontend
- React + TypeScript
- Tailwind CSS
- Chart.js + react-chartjs-2
- Axios
- html2canvas + jsPDF (PDF export)
- Vercel (deployment)

### Backend
- Node.js + Express
- Axios (GitHub + Groq APIs)
- Groq LLM (AI analysis)
- REST API
- Render (deployment)

---

## 🏗️ Architecture

