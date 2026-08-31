# NexusTrace — AI-Powered Criminal Network Analysis System

**Problem Statement:** PS26189 — AI-Powered Criminal Network Analysis System  
**Organization:** Ministry of Home Affairs / NCRB, Women Safety Division  

NexusTrace analyzes fragmented, unstructured crime data (FIRs, call intercepts, surveillance reports, financial records) across 10 crime domains to surface hidden relationships, identify key influencers in a criminal network, and give investigators a visual, evidence-linked graph.

## Key Features

- **Multi-Domain Intelligence Ingestion:** Parses unstructured crime documents across 10 distinct crime categories.
- **Entity Resolution & Canonical Linking:** Merges aliases (e.g. "Sethji", "Bhai", "Iqbal Ansari") and links phone numbers/identifiers across domain boundaries.
- **7-Type Master Schema Mapping:** Normalizes complex domain-specific interactions into structured master relationship types while preserving raw evidence text.
- **Graph Analytics Engine:** Powered by Neo4j / NetworkX with PageRank centrality, betweenness centrality, and Louvain community detection.
- **Investigator Dashboard & Cytoscape Explorer:** Interactive node-link canvas with node sizing by centrality score, community cluster highlighting, inline document evidence viewer, and ground truth precision/recall evaluation.

## Directory Structure

```
.
├── data/                       # Raw text, ground truth answer keys, structured CSVs, pipeline output
├── pipeline/                   # Python NLP pipeline (ingestion, extraction, resolution, normalization, evaluation)
├── backend/                    # FastAPI backend REST services & SQLite metadata store
├── frontend/                   # React + TypeScript + Cytoscape.js investigator dashboard UI
├── scripts/                    # Utility and seeding scripts
├── tests/                      # Automated test suite
└── docker-compose.yml          # Container configuration for Neo4j and services
```

## 📖 Complete Documentation & Operator Guides

For comprehensive setup and feature walkthroughs:
- 🚀 [**`docs/HOW_TO_RUN_AND_USE.md`**](file:///c:/Users/luuff/Desktop/SIH/docs/HOW_TO_RUN_AND_USE.md) — **Complete User, Operator & Setup Guide** (Step-by-step for Docker & Non-Docker setups, `.env` keys, starting all 3 servers, and full UI usage guide).
- 📊 [**`docs/CURRENT_STATUS.md`**](file:///c:/Users/luuff/Desktop/SIH/docs/CURRENT_STATUS.md) — **Master Current Status & Architectural Reference** (9 FastAPI routers, 8 database tables, POLE schema, pattern detection algorithms).

---

## Quick Start (3-Minute Setup)

### 1. Configure Environment (`.env`)
Create `.env` in the root folder:
```ini
GEMINI_API_KEY=your_gemini_api_key_here
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
DATABASE_URL=sqlite:///./nexustrace.db
JWT_SECRET_KEY=nexustrace_mha_ncrb_super_secret_jwt_key_2026
DATA_DIR=./data
PROCESSED_DIR=./data/processed
```

### 2. Start Neo4j (Docker OR Local)
- **With Docker:** `docker-compose up -d neo4j`
- **Without Docker:** Start [Neo4j Desktop](https://neo4j.com/download/) OR use free [Neo4j AuraDB](https://neo4j.com/cloud/platform/aura-graph-database/) OR run in standalone SQLite mode.

### 3. Run Pipeline (One-Time Ingestion)
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r pipeline/requirements.txt
pip install -r backend/requirements.txt

python pipeline/run_pipeline.py
```

### 4. Start Backend Service
```powershell
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```
- REST API & Swagger Docs: [http://localhost:8000/docs](http://localhost:8000/docs)

### 5. Start React Frontend
In a new terminal:
```powershell
cd Frontend_SIH\nexustrace-react
npm install
npm run dev
```
- Investigator Dashboard: [http://localhost:5173/](http://localhost:5173/)

---

## Default RBAC Officer Accounts

| Role | Username | Password |
|---|---|---|
| **INVESTIGATOR** | `investigator_01` | `Investigate#2026` |
| **OFFICER_IN_CHARGE** | `ncrb_admin` | `Admin#MHA2026` |
| **AUDITOR** | `judicial_auditor` | `Audit#Secure2026` |

---

License: Open Source / SIH 2026 / MHA & NCRB Compliant.
