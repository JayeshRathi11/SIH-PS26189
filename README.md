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
- 🚀 [**`docs/HOW_TO_RUN_AND_USE.md`**](docs/HOW_TO_RUN_AND_USE.md) — **Complete User, Operator & Setup Guide** (step-by-step setup, `.env` keys, starting both servers, and full UI usage guide).

---

## Quick Start

See [`docs/HOW_TO_RUN_AND_USE.md`](docs/HOW_TO_RUN_AND_USE.md) for the full
step-by-step setup and usage guide. The short version:

```powershell
# 1. Activate the venv and install dependencies
.\venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
pip install -r pipeline/requirements.txt

# 2. Configure environment
copy .env.example .env
# then edit .env and set JWT_SECRET_KEY (generate with:
#   python -c "import secrets; print(secrets.token_hex(32))"
# ) -- the backend refuses to start without it. GEMINI_API_KEY is optional
# but needed for real document extraction.

# 3. Start the backend
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```
- REST API & Swagger Docs: [http://localhost:8000/docs](http://localhost:8000/docs)

```powershell
# 4. In a new terminal, start the frontend
cd frontend\nexustrace-react
npm install
npm run dev
```
- Investigator Dashboard: [http://localhost:5173/](http://localhost:5173/)

Neo4j is optional -- analytics run on NetworkX + SQLite regardless, and the
pipeline silently skips the Neo4j mirroring step if it isn't reachable.

---

## Default RBAC Officer Accounts

| Role | Username | Password |
|---|---|---|
| **INVESTIGATOR** | `investigator_01` | `Investigate#2026` |
| **OFFICER_IN_CHARGE** | `ncrb_admin` | `Admin#MHA2026` |
| **AUDITOR** | `judicial_auditor` | `Audit#Secure2026` |

---

License: Open Source / SIH 2026 / MHA & NCRB Compliant.
