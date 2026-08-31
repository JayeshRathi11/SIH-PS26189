# 🛡️ NexusTrace — AI-Powered Cross-Domain Criminal Network Analysis Platform

**Problem Statement**: PS26189 — Ministry of Home Affairs (MHA) / National Crime Records Bureau (NCRB)  
**System Status**: 🟢 **Fully Operational** · 21/21 Automated Tests Passing (100%) · Zero-Error Production Build  

---

## 📚 Master Documentation Suite

All project architecture, presentation scripts, and operation guides have been consolidated into **3 authoritative master documents**:

1. 🏛️ **[docs/1_MASTER_SYSTEM_ARCHITECTURE.md](docs/1_MASTER_SYSTEM_ARCHITECTURE.md)**  
   * Complete Technical Reference, 7-Stage NLP Pipeline, 10-Node POLE Schema, Mathematical Models (Hub Scores & Time Decay), All 15+ REST API Endpoints, SQLite/Neo4j Database Models, React Components, and Section 65B Compliance.

2. 🎙️ **[docs/2_TEAM_DEMO_AND_WALKTHROUGH.md](docs/2_TEAM_DEMO_AND_WALKTHROUGH.md)**  
   * Step-by-Step Presentation Script & Live Demo Guide (0 to 100). Explains every screen across all 8 dedicated suites, every score/formula in plain English, and a 5-minute pitch cheat-sheet.

3. 🚀 **[docs/3_QUICKSTART_AND_OPERATIONS.md](docs/3_QUICKSTART_AND_OPERATIONS.md)**  
   * Quickstart setup commands, backend/frontend server launch instructions, RBAC user credentials (`INVESTIGATOR`, `OFFICER_IN_CHARGE`, `AUDITOR`), and test execution guide.

4. 🛡️ **[docs/SIH_PS26189.md](docs/SIH_PS26189.md)**  
   * Comprehensive Engineering Audit & Technical Evaluation covering Frontend, Backend, and Pipeline deep dives, Strong/Weak/Incomplete/Missing points analysis, and Future Recommendations.

---

## ⚡ Quick Run (Local Startup)

```powershell
# 1. Start Backend Server (FastAPI on Port 8000)
.\venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000

# 2. Start Frontend UI (React + Vite on Port 5173)
cd Frontend_SIH\nexustrace-react
npm run dev

# 3. Run Automated Tests (21/21 Tests)
.\venv\Scripts\python.exe -m pytest tests/ -v
```

* **Investigator Dashboard**: [http://localhost:5173/](http://localhost:5173/)
* **Backend API Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
