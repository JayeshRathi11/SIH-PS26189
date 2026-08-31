# 🚀 NexusTrace — Quickstart, Operations & Deployment Guide

**System**: NexusTrace — AI-Powered Cross-Domain Criminal Network Analysis Platform  
**Target Environment**: Windows / Linux / macOS  

---

## ⚡ 1. Rapid Local Startup (2 Commands)

### 1.1 Start FastAPI Backend Server
```powershell
# In root directory: c:\Users\luuff\Desktop\SIH
.\venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```
* Backend API: `http://127.0.0.1:8000/`
* Swagger Interactive API Docs: `http://127.0.0.1:8000/docs`

### 1.2 Start Vite React Frontend
```powershell
# In root or Frontend_SIH/nexustrace-react:
cd Frontend_SIH\nexustrace-react
npm run dev
```
* Investigator Dashboard: `http://localhost:5173/`

---

## 🔐 2. Default RBAC User Accounts & Credentials

| Role | Username | Password | Badge No. | Permissions |
|---|---|---|---|---|
| **`INVESTIGATOR`** | `investigator_01` | `Investigate#2026` | `INV-8821` | Case Board, XAI, Feedback Corroboration, Section 65B PDF Generation |
| **`OFFICER_IN_CHARGE`** | `ncrb_admin` | `Admin#MHA2026` | `ADM-001` | Full administrative control, Pipeline re-runs, All suites |
| **`AUDITOR`** | `judicial_auditor` | `Audit#Secure2026` | `AUD-904` | Read-only digital custody audit logs, Section 65B verification |

---

## 🧪 3. Running Automated Tests & Pipelines

### 3.1 Run Full Test Suite (21 Tests)
```powershell
.\venv\Scripts\python.exe -m pytest tests/ -v
# Output: 21 passed in ~3.8s (100% SUCCESS)
```

### 3.2 Run End-to-End NLP Extraction Pipeline
```powershell
.\venv\Scripts\python.exe -m pipeline.run_pipeline
# Ingests 148 documents across 10 domains and builds data/structured/master_graph.json
```

### 3.3 Build Frontend Production Bundle
```powershell
npm --prefix Frontend_SIH/nexustrace-react run build
# Output: Built in ~0.9s with 0 errors
```

---

## 🌐 4. Service Port Reference

| Service | Port / URL | Status |
|---|---|---|
| **Investigator UI** | `http://localhost:5173/` | 🟢 Online |
| **FastAPI Backend** | `http://127.0.0.1:8000/` | 🟢 Online |
| **Swagger API Docs** | `http://127.0.0.1:8000/docs` | 🟢 Online |
| **SQLite Database** | `nexustrace.db` (Local) | 🟢 Active |
| **Neo4j (Optional)** | `bolt://localhost:7687` | Optional |
