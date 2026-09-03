# NexusTrace

**AI-Powered Criminal Network Analysis System**

**Problem Statement:** SIH 2026 · PS26189 — AI-Powered Criminal Network Analysis System
**Organization:** Ministry of Home Affairs (MHA) / National Crime Records Bureau (NCRB)

Investigators across different police stations and case files often can't see that the same person, phone number, or bank account is involved in multiple crimes — because that evidence sits in separate, disconnected FIRs and case files. NexusTrace reads unstructured crime documents (FIRs, call intercepts, surveillance reports, financial records) across multiple crime domains, automatically extracts the entities and relationships they describe, resolves the same real-world entity across otherwise unrelated cases, and gives investigators an interactive, evidence-linked graph to explore it all — while keeping a legally defensible, cryptographically tamper-evident record of every action anyone takes on that evidence.

**Live demo:** [nexustrace-frontend.onrender.com](https://nexustrace-frontend.onrender.com) · API: [nexustrace-backend.onrender.com/docs](https://nexustrace-backend.onrender.com/docs)
*(Free-tier Render services sleep after ~15 minutes idle — the first request after a while can take 30–50 seconds to wake up.)*

---

## Key Features

- **AI-Powered Extraction** — uploaded case documents (`.txt`, `.docx`, `.pdf`) are run through an LLM extraction pipeline (Gemini / OpenAI) that identifies entities (people, organizations, locations, phone numbers, bank accounts, vehicles) and the relationships between them, citing the source text for every fact.
- **Cross-Case Entity Resolution** — the same person, alias, phone number, or account is recognized and merged even when it first appears in separately uploaded, unrelated-looking cases, surfacing connections a human cross-referencing case files by hand would likely miss.
- **Interactive Case Graph** — a node-link board per case with POLE-category filters (Persons, Locations, Orgs, Financial, High Risk) that can now be combined simultaneously, full-text search, and a live entity/relationship counter.
- **Pathfinder (Explainable AI)** — ask how any two entities are connected. Returns the shortest evidence-backed path with a confidence score, or a clear "no connection found" — the system never invents a link that isn't there.
- **Human-in-the-Loop Review** — investigators confirm, reject, or flag every AI-extracted entity and relationship before it's fully trusted; nothing is presented as fact without a documented human sign-off available.
- **Tamper-Evident Audit Ledger** — every login, upload, review decision, dossier export, and case change is recorded in a SHA-256 hash-chained ledger (each entry's hash depends on the one before it — the same core primitive blockchains use for tamper evidence). A one-click chain-integrity check recomputes the entire chain and pinpoints exactly where it would break if any record were altered. Every entry also captures the acting officer's real IP address.
- **Role-Based Access Control (Separation of Duties)** — three roles enforce that the people who can act on evidence are never the same people whose job is to catch tampering (see [Roles](#roles--why-three)).
- **Court-Ready Dossiers** — generates a sealed, hash-verified PDF summary per entity, citing every source document, ready for evidentiary submission.
- **Automated Pattern Detection** — flags suspicious structural patterns automatically: cross-domain hubs, circular hawala transaction rings, burner-SIM rings, trafficking corridors.
- **Case Management** — a durable, shared case registry (create, archive/restore, relabel, soft-delete) so a case created or archived by one officer is immediately visible to every other officer, not just stored in one browser's local state.
- **Non-destructive by design** — nothing in the system hard-deletes evidence. Removing a case only hides it from the sidebar (soft-delete); the underlying entities, relationships, and documents are preserved and recoverable, and every change is permanently logged regardless.

## Roles & why three

| Role | Can do | Audit trail access |
|---|---|---|
| **Investigator** | Upload evidence, run extraction, confirm/reject/flag entities & relationships, generate dossiers, create/manage cases | No |
| **Officer-in-Charge** | Everything an Investigator can, plus supervisory oversight | Yes (read + verify) |
| **Auditor** | **Nothing else** — the only role with zero write access anywhere in the system | Yes (read + verify) |

This is a deliberate separation-of-duties design: Officer-in-Charge is the supervisory role with real operational power, so it can't be the sole check on tampering. Auditor is the independent role given zero write permissions anywhere — checked against every mutating endpoint in the backend — so that even a compromised Auditor account could never alter a single record. That split mirrors real chain-of-custody practice: the people who can touch evidence are never the same people whose job is to catch it being touched.

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React + Vite | Fits an interactive, data-heavy case board and graph; Vite gives a fast dev/build loop |
| Backend | FastAPI (Python) | The product is the AI pipeline (extraction, resolution, graph reasoning) — Python has the strongest ecosystem for that; FastAPI gives fast async APIs with auto-generated docs |
| Database | PostgreSQL (via [Supabase](https://supabase.com)) | Evidence data needs real relational/ACID guarantees; Supabase gives managed Postgres with no server ops (falls back to local SQLite automatically if `DATABASE_URL` is unset, for quick local dev) |
| ORM | SQLAlchemy | One schema definition drives every table, instead of hand-written SQL scattered everywhere |
| Auth | JWT + bcrypt | Stateless, industry-standard; passwords are never stored in plaintext |
| Audit integrity | SHA-256 hash chain | Purpose-built tamper-evident ledger, not a generic log file |
| AI extraction | Google Gemini / OpenAI | LLMs read unstructured case text and extract entities/relationships at a scale hand-written rules can't match |
| Graph analytics | NetworkX (+ optional Neo4j mirror) | Centrality, community detection; Neo4j is an optional mirror that's silently skipped if no Neo4j server is reachable — PostgreSQL is the real, guaranteed-on data store |
| Deployment | Docker on [Render](https://render.com) | Identical environment in dev and production, deployed without managing infrastructure directly |

## Architecture

```
Case documents (.txt/.docx/.pdf)
        │  upload
        ▼
 FastAPI backend (/pipeline/upload)
        │  background task
        ▼
 Extraction pipeline (pipeline/)
   ingestion → extraction (LLM) → normalization → resolution → evaluation
        │  writes
        ▼
 PostgreSQL (entities, relationships, documents, cases, users, audit_logs)
        │  read/query
        ▼
 FastAPI routers (graph, entities, documents, patterns, feedback,
                  dossier, pipeline, evaluation, audit, cases, auth)
        │  REST + JWT
        ▼
 React frontend (Case Board · Pathfinder · Timeline · Audit Logs ·
                  Anomaly Hub · Dossier Viewer)
```

## Directory Structure

```
.
├── backend/                    # FastAPI app: routers, DB models, auth, services
│   ├── routers/                 # auth, cases, graph, entities, documents, patterns,
│   │                             # feedback, dossier, pipeline, evaluation, audit
│   ├── services/                # graph_service, dossier_service
│   └── db.py                    # SQLAlchemy models + default seed data
├── pipeline/                    # Extraction/analysis pipeline
│   ├── ingestion/ extraction/ normalization/ resolution/ evaluation/ graph/
│   └── run_pipeline.py
├── frontend/
│   └── nexustrace-react-v3/     # ← the active frontend (v1/v2 are earlier iterations, unused)
├── data/                        # Source case documents + ground truth for the 10 demo domains
├── docs/
│   └── HOW_TO_RUN_AND_USE.md    # Full setup + UI walkthrough
├── scripts/                     # Utility scripts (e.g. direct-to-backend upload bypass)
├── tests/                       # pytest suite (backend + pipeline)
├── render.yaml                  # Render Blueprint (two Docker services)
├── docker-compose.yml           # Local container config (Neo4j + services)
├── backend.Dockerfile
└── DEPLOYMENT.md                # Render deployment walkthrough
```

## Getting Started (Local Development)

**Prerequisites:** Python 3.10+, Node 18+, `pip`, `npm`. Neo4j is optional — analytics run on NetworkX + Postgres/SQLite regardless.

```powershell
# 1. Activate a virtualenv and install backend dependencies
.\venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
pip install -r pipeline/requirements.txt

# 2. Configure environment
copy .env.example .env
# Edit .env:
#  - JWT_SECRET_KEY is REQUIRED — the backend refuses to start without one.
#    Generate one with: python -c "import secrets; print(secrets.token_hex(32))"
#  - DATABASE_URL defaults to a local SQLite file if left unset (fine for
#    quick local dev). For Postgres/Supabase, see the comment in .env.example.
#  - GEMINI_API_KEY / OPENAI_API_KEY are optional but required for real
#    document extraction (without them, only the 10 pre-seeded demo
#    domains will have data).

# 3. Start the backend
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```
- REST API + Swagger docs: http://localhost:8000/docs

```powershell
# 4. In a new terminal, start the frontend
cd frontend\nexustrace-react-v3
npm install
npm run dev
```
- App: http://localhost:5173/

Full step-by-step setup and a complete UI usage guide: [`docs/HOW_TO_RUN_AND_USE.md`](docs/HOW_TO_RUN_AND_USE.md).

## Default Accounts

| Role | Username | Password |
|---|---|---|
| Investigator | `investigator_01` | `Investigate#2026` |
| Investigator (secondary) | `investigator_02` | `Investigate#2026B` |
| Officer-in-Charge | `ncrb_admin` | `Admin#MHA2026` |
| Auditor | `judicial_auditor` | `Audit#Secure2026` |

*(Change these before any real deployment — they're seeded for demo/dev purposes only.)*

## Deployment

Deployed as two Docker services on Render via [`render.yaml`](render.yaml) (a Blueprint) — one for the FastAPI backend, one for the React frontend behind nginx, which reverse-proxies `/api/*` to the backend. See [`DEPLOYMENT.md`](DEPLOYMENT.md) for the full walkthrough, including the Render-specific gotchas that came up getting this working (nginx template directory, TLS SNI on the reverse proxy, cold-start proxy timeouts).

## Testing

```bash
pytest tests/
```

Covers backend API behavior (`tests/test_backend.py`) and the extraction/resolution pipeline (`tests/test_pipeline.py`).

## Known Limitations / Roadmap

- The "All Domains" master graph view always aggregates every domain with no filtering — a curated subset view (showing only actively-relevant cases) is a planned improvement, not yet built.
- Neo4j integration is optional and only mirrors data when a Neo4j server is reachable; it is not required for any core feature.
- Demo domains ship pre-seeded; real-world use requires `GEMINI_API_KEY`/`OPENAI_API_KEY` for live extraction on new uploads.

## License

Open Source — built for Smart India Hackathon 2026, for MHA & NCRB (Women Safety Division).
