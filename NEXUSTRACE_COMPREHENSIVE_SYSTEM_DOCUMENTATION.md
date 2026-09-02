# NexusTrace — Complete System Architecture & Engineering Documentation

> **AI-Powered Cross-Domain Criminal Network Analysis & Evidentiary Synthesis Platform**  
> *Engineered for the Ministry of Home Affairs (MHA) & National Crime Records Bureau (NCRB)*

---

## 1. Executive Summary & Vision

Transnational organized crime syndicates operate across fragmented jurisdictions and specialized crime verticals—narcotics trafficking, hawala banking, arms smuggling, cyber financial fraud, human trafficking, and extortion. While field units log individual First Information Reports (FIRs), phone intercepts, and financial ledgers in localized databases, syndicates exploit these jurisdictional silos to evade detection.

**NexusTrace** is an intelligence synthesis platform that unifies unstructured investigative records across 10 crime verticals into a resolved, tamper-evident, and explainable **Cross-Domain Knowledge Graph**. It integrates automated Natural Language Processing (NLP), Large Language Models (LLMs), fuzzy identity resolution, complex network topology analytics, cryptographic chain-of-custody verification (Section 65B Indian Evidence Act), and an interactive tactical command UI.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 NEXUSTRACE PLATFORM ARCHITECTURE                       │
├─────────────────────────┬───────────────────────────────┬──────────────────────────────┤
│    DATA & INGESTION     │      PIPELINE & ANALYTICS     │     BACKEND & INTERFACES     │
├─────────────────────────┼───────────────────────────────┼──────────────────────────────┤
│ • 10 Crime Verticals    │ • LLM Entity & Triple Extract │ • FastAPI REST Core          │
│ • FIRs, Intercepts, CDR │ • Schema Normalization (POLE) │ • SQLAlchemy + SQLite/PG     │
│ • SHA-256 Ingestion     │ • Fuzzy Identity Resolution   │ • Neo4j Cypher Mirror        │
│ • Automated PII Masking │ • PageRank & Centrality Hubs  │ • O(n) Hash-Chain Custody    │
│ • Multi-format Parser   │ • 4 Syndicate Anomaly Engines │ • ReportLab Sec 65B PDF      │
│   (.pdf, .docx, .txt)   │ • NetworkX Chokepoint Bridges │ • React 18 / Vite UI Canvas  │
└─────────────────────────┴───────────────────────────────┴──────────────────────────────┘
```

---

## 2. Dataset Architecture & Domain Modeling

The system is pre-loaded with curated synthetic investigative datasets mirroring real-world law enforcement intelligence across 10 distinct crime verticals, located in `dataset/` and `data/`:

### 2.1 The 10 Crime Verticals

| Domain Key | Vertical Title | Core Modus Operandi & Document Types | Key Entities & Anchors |
|---|---|---|---|
| `01_narcotics_trafficking` | Narcotics Trafficking | Opium/heroin smuggling routes, border drop points, handler-carrier cell networks. | Iliyas Khan, Devendra Solanki, border couriers. |
| `02_human_trafficking` | Human Trafficking | Placement agency fronts, interstate transit hubs, forged identity credentials. | Sunrise Placement Services, Manoj Tiwari. |
| `03_cyber_financial_fraud` | Cyber Financial Fraud | Phishing call centers, mule account networks, cryptocurrency conversions. | Rohit Chaurasia, IA Digital Ventures. |
| `04_arms_smuggling` | Arms Smuggling | Cross-border weapons consignment, illegal armories, underground procurement. | Harjeet Singh, arms runners, dead-drop caches. |
| `05_organized_extortion` | Organized Extortion | Protection money collections, threat calls, shell construction fronts. | Syndicate collection squads, real estate intimidation. |
| `06_kidnapping_for_ransom` | Kidnapping for Ransom | Target reconnaissance, safehouse management, encrypted ransom demands. | Safehouse keepers, burner phone dispatchers. |
| `07_counterfeit_currency` | Counterfeit Currency | High-quality fake Indian currency notes (FICN), printing presses, distribution networks. | Border currency couriers, printing handlers. |
| `08_illegal_betting_hawala` | Illegal Betting & Hawala | Unregistered sports betting syndicates, token-based Hawala ledger settlements. | Token handlers, bookmakers, Hawala operators. |
| `09_vehicle_theft_ring` | Vehicle Theft Ring | Luxury vehicle theft, chassis tampering, interstate resale networks. | Anil Kamble, chop shops, interstate document forgers. |
| `10_land_grabbing_fraud` | Land Grabbing & Fraud | Revenue record manipulation, benami property acquisitions, intimidation squads. | Land revenue conduits, shell company owners. |

### 2.2 Dataset Storage & Primary Artifacts
- **Unstructured Text & Documents** (`dataset/Domain X/*.md`, `data/raw_text/`): Full-text FIRs, interrogation confessions, intercepted wiretaps, and surveillance logs.
- **Structured CDR & Transactions** (`data/structured/master_relationships.csv`): High-volume structured phone call detail records (CDR) and banking transaction logs linking subjects across domains.
- **Ground Truth Benchmark Keys** (`data/ground_truth/{domain}.json`): Certified entity and relationship answer keys used to calculate precision, recall, and F1 benchmarks.

---

## 3. The Extraction & Synthesis Pipeline (`pipeline/`)

The automated pipeline transforms unstructured police narrative into mathematical graphs through 5 sequential stages:

```
[ Raw Narrative Docs ]
         │
         ▼
 ┌───────────────┐
 │ Stage 1:      │ ──► Compute SHA-256 seal, mask PII (Aadhaar, PAN), extract metadata
 │ Ingestion     │
 └───────┬───────┘
         ▼
 ┌───────────────┐
 │ Stage 2:      │ ──► Multi-threaded extraction (Google Gemini LLM + regex fallback)
 │ Extraction    │     Extracts POLE entities, phone lines, relationships & verbatim evidence
 └───────┬───────┘
         ▼
 ┌───────────────┐
 │ Stage 3:      │ ──► Maps raw relation labels into 7-Type Master Schema:
 │ Normalization │     (ASSOCIATE_OF, COMMANDS, COMMUNICATED_WITH, TRANSACTED_WITH, etc.)
 └───────┬───────┘
         ▼
 ┌───────────────┐
 │ Stage 4:      │ ──► Fuzzy string matching, token sorting, phone number unification,
 │ Resolution    │     cross-domain identity merging, and alias consolidation
 └───────┬───────┘
         ▼
 ┌───────────────┐
 │ Stage 5:      │ ──► PageRank, Betweenness Centrality, Louvain Community Clusters,
 │ Graph Engines │     Temporal Decay Scoring, and 4 Syndicate Anomaly Pattern Detectors
 └───────┬───────┘
         ▼
[ Persistent DB & Graph Mirror ]
```

### 3.1 Stage 1: Ingestion & Digital Custody (`pipeline/ingestion/`)
- **Multi-Format Document Parsing**: Ingests `.pdf`, `.docx`, `.txt`, and `.md` files (`parse_documents.py`).
- **Cryptographic Hashing**: Immediately calculates an immutable SHA-256 hash for every ingested document, recording it in the `EvidenceLedgerRecord`.
- **PII Sanitizer (`sanitizer.py`)**: Redacts sensitive citizen identifiers (12-digit Aadhaar numbers and 10-character PAN cards) prior to LLM submission to guarantee compliance with Indian privacy statutes.

### 3.2 Stage 2: Entity & Relationship Extraction (`pipeline/extraction/`)
- **Multi-Threaded Architecture**: Uses Python `ThreadPoolExecutor` to process dozens of investigative files concurrently.
- **Hybrid Extractor (`llm_extractor.py`)**:
  - Primary: Google Gemini Pro / Flash API prompt engineered for POLE ontology extraction (Person, Object, Location, Event).
  - Secondary Heuristic Fallback: High-precision regex NER system detecting names, phones (`+91 / 0`), financial accounts, and vehicles when offline or API-constrained.
- **Evidentiary Anchoring**: For every extracted relationship triple `(Source, Relationship, Target)`, the pipeline captures the exact verbatim sentence from the source document as court evidence.

### 3.3 Stage 3: Schema Normalization (`pipeline/normalization/schema_mapper.py`)
Investigators use disparate terminology across states (e.g., *"financially backed"*, *"supplied cash to"*, *"transferred hawala token"*). The schema mapper normalizes all predicates into **7 Master Relationship Types**:
1. `ASSOCIATE_OF`: General operational or criminal association.
2. `COMMANDS`: Hierarchical syndicate control or leadership delegation.
3. `COMMUNICATED_WITH`: Telephonic intercepts, encrypted messaging, or wiretap records.
4. `TRANSACTED_WITH`: Banking ledger, cash courier, or Hawala payments.
5. `OPERATES_IN`: Geographic criminal jurisdiction or safehouse operation.
6. `OWNS_ASSET`: Vehicle, weapon, front business, or bank account ownership.
7. `FAMILY_OF`: Blood or matrimonial kinship ties.

### 3.4 Stage 4: Incremental Entity Resolution (`pipeline/resolution/`)
A single kingpin might appear as *"Iqbal Bhai"* in a Narcotics FIR, *"I. A. Ansari"* in a Cyber Fraud corporate filing, and *"Chhota Iqbal"* in an extortion wiretap.
- **Fuzzy Token Matching**: Uses Levenshtein distance and token-sort ratios (`threshold >= 88`) to identify probable name matches.
- **Identifier Correlation**: Merges entities that share verified phone numbers, bank accounts, or vehicle registration plates.
- **Alias Aggregation**: Creates a single canonical entity record (e.g., `ENT_HUB_IQBAL_ANSARI`) while preserving all observed aliases, phone numbers, and domain memberships.
- **State Persistence**: Loads existing records from SQLite/PostgreSQL to resolve newly uploaded documents incrementally against the historical knowledge graph.

### 3.5 Stage 5: Network Analytics & Anomaly Detection (`pipeline/graph/`)
- **Combined Hub Score**: Calculates an operational importance score for every entity:
  $$\text{HubScore} = 0.5 \times \text{PageRank} + 0.5 \times \text{Betweenness Centrality}$$
- **Temporal Weight Decay**: Models edge relevance over time, decaying older interactions:
  $$w_{\text{effective}} = w_0 \times e^{-\lambda \times \Delta t}$$
- **Officer Corroboration Multiplier**: Human investigator verification boosts relationship weights to $1.2\times$, while rejected edges are suppressed to $0.05\times$.
- **4 Suspicious Pattern Engines (`pattern_detector.py`)**:
  1. *Cross-Domain Syndicate Hubs*: Kingpins bridging $\ge 3$ distinct crime domains with high Betweenness Centrality.
  2. *Circular Hawala Loops*: Directed cycles ($A \rightarrow B \rightarrow C \rightarrow A$) characteristic of mule money layering.
  3. *Burner SIM Fleets*: Phone-swapping clusters where suspects rapidly cycle through disposable lines.
  4. *Trafficking Corridors*: Directional chains connecting recruitment locations, transit bottlenecks, and destination points.
- **Strategic Chokepoint Bridges (`nx.bridges`, `nx.articulation_points`)**: Identifies structural cut-edges whose removal fragments communication or financial flows between separate syndicate cells.

---

## 4. Backend Architecture & REST Services (`backend/`)

The backend is built with **FastAPI** (Python 3.14/3.11) with strict architectural layering between Database models, Services, and Routers.

### 4.1 Database Layer (`backend/db.py`)
- **Engine**: SQLAlchemy ORM with automatic connection pooling. Supports hosted PostgreSQL (e.g., Supabase) via `DATABASE_URL` with transparent zero-config fallback to local SQLite (`nexustrace.db`).
- **Core Tables**:
  - `User`: RBAC user accounts, bcrypt hashed passwords, roles (`INVESTIGATOR`, `OFFICER_IN_CHARGE`, `AUDITOR`).
  - `CaseRecord`: Durable case folder directory, metadata, status tags (`Active`, `Cold Case`, `Under Review`), soft-delete flag (`hidden=True`), and display ordering.
  - `EntityRecord` & `RelationshipRecord`: Resolved master knowledge graph entities and edges with officer corroboration flags and decay timestamps.
  - `AuditLog`: Tamper-evident digital custody ledger with chained SHA-256 hashes (`prev_hash`, `entry_hash`).
  - `EvidenceLedgerRecord`: Document custody log with primary SHA-256 hashes and PII redaction statistics.
  - `InvestigatorFeedback`: Officer verification audit trail (`CONFIRMED`, `REJECTED`, `UNCERTAIN`).
  - `JobRecord`: Asynchronous extraction pipeline job state tracking.

### 4.2 Cryptographic Chain-of-Custody & Tamper-Evident Ledger
To satisfy the stringent requirements of Section 65B of the Indian Evidence Act, every modification to the system is recorded in a cryptographically linked blockchain-style ledger:
$$\text{entry\_hash} = \text{SHA256}(\text{prev\_hash} + \text{timestamp} + \text{user\_id} + \text{action} + \text{resource} + \text{details} + \text{content\_hash})$$
- The first entry chains from a fixed 64-character genesis hash (`0000...0000`).
- The endpoint `GET /api/audit/verify` executes an $O(n)$ traversal, recomputing every hash from stored fields to confirm that no record has been inserted, modified, or deleted.

### 4.3 REST API Endpoints Overview (11 Routers)

| Router | Prefix | Key Endpoints | Description |
|---|---|---|---|
| `auth.py` | `/api/auth` | `POST /login`, `GET /me`, `POST /logout` | JWT authentication, lockout security, and user persona sessions. |
| `cases.py` | `/api/cases` | `GET /`, `POST /`, `PATCH /{id}`, `DELETE /{id}` | Case folder registry, status changes (`tag`), archiving, and soft-delete. |
| `graph.py` | `/api/graph` | `GET /`, `GET /centrality`, `GET /timeline`, `GET /explain`, `GET /bridges`, `GET /export` | Master graph read APIs, XAI pathfinding, chokepoint bridges, and JSON/GraphML export. |
| `entities.py` | `/api/entities` | `GET /`, `GET /{id}` | Fuzzy search entities and retrieve full profile dossiers. |
| `documents.py`| `/api/documents`| `GET /`, `GET /{id}` | Ingested case document catalog with pagination (`skip`/`limit`). |
| `patterns.py` | `/api/patterns` | `GET /suspicious`, `GET /suspicious/{id}` | Real-time syndicate anomaly detection alerts and subgraphs. |
| `feedback.py` | `/api/graph/feedback` | `POST /feedback`, `GET /feedback` | Human-in-the-loop officer corroboration and edge weight adjustments. |
| `dossier.py` | `/api/dossier` | `POST /generate`, `GET /download/{id}` | ReportLab PDF compilation and Section 65B court prosecution brief downloads. |
| `pipeline.py` | `/api/pipeline`| `POST /run`, `POST /upload`, `GET /status/{id}` | Background AI extraction triggers, multi-file uploads, and job status polling. |
| `evaluation.py`| `/api/evaluation`| `GET /`, `GET /{domain}` | Precision, Recall, and F1 benchmarks against ground truth answer keys. |
| `audit.py` | `/api/audit` | `GET /log`, `GET /verify` | Role-gated audit trail viewer and $O(n)$ cryptographic chain verification engine. |

---

## 5. Frontend & UI/UX Architecture (`frontend/nexustrace-react-v3/`)

Built with **React 18** and bundled with **Vite**, the frontend serves as an operational Tactical Command Center.

### 5.1 Design Philosophy & Aesthetics
- **Tactical Law Enforcement Theme**: Avoids generic consumer UI tropes. Uses a high-contrast forensic aesthetic inspired by military command consoles and police corkboards.
- **Curated Color Tokens**:
  - Background Canvas: `--paper` (`#F8FAFC` light, `#0B0F19` dark)
  - Elevated Panels: `--panel` (`#FFFFFF` light, `#111827` dark)
  - Typography: `--ink` (`#0F172A` deep charcoal / `#F8FAFC` snow)
  - Forensic Stamps: `--stamp-red` (`#DC2626`), `--stamp-blue` (`#2563EB`), `--stamp-green` (`#16A34A`), `--tag-amber` (`#D97706`)
- **Typography Pairing**:
  - `Space Grotesk`: Bold, modern technical headlines.
  - `IBM Plex Mono`: Telephonic intercepts, SHA-256 hash seals, timestamps, and confidence percentages.
  - `IBM Plex Sans`: High-legibility prose for investigative narratives.

### 5.2 Core Frontend Modules & Pages

```
[ Navigation Sidebar (Tabs & Case Selector) ]
       │
       ├── 1. Case Board ──────────────► Interactive Corkboard, Radial Layout, Phone Decrypt
       ├── 2. Investigation Directory ──► Case Files, Multi-File Uploader, Real-Time Job Polling
       ├── 3. Chronological Timeline ──► Temporal Sequence of Intercepts, Calls, Transfers
       ├── 4. Anomaly Hub ─────────────► Cross-Domain Hubs, Mule Loops, Chokepoint Bridges
       ├── 5. Court Dossiers ──────────► Section 65B PDF Briefs, Document Repository
       ├── 6. Entities Registry ───────► Full Searchable Table, Direct Profile Dossier Modals
       ├── 7. XAI Pathfinder ──────────► Natural Language Evidentiary Hop-by-Hop Reasoning
       └── 8. Digital Custody Ledger ──► Live Chained Hash Ledger, O(n) Integrity Verification
```

#### 1. Interactive Case Board (`Board.jsx`, `PinNode.jsx`)
- **Two-Zone Canvas Architecture**:
  - *Central Connected Radial Canvas*: Connected suspects are positioned with collision-avoidance radial geometry to highlight hubs and communication clusters.
  - *Right-Side Unpinned Dock*: Isolated subjects ($0\text{ connections}$) are docked on the right margin, keeping the central corkboard clutter-free.
- **Phone Decryption on Hover**: Phone numbers display as `🔒 Unknown` with a security lock icon, decrypting with a smooth micro-animation to reveal the actual carrier line on hover.
- **Red Thread Vectors**: Visualized SVG connection threads with colored stroke indicators reflecting relationship types (e.g., Red for `COMMANDS`, Blue for `TRANSACTED_WITH`, Cyan for `COMMUNICATED_WITH`).

#### 2. Case Files & Live Ingestion Hub (`CaseFilesPage.jsx`)
- **Real File Ingestion**: Features an attached evidence uploader supporting real `.pdf`, `.docx`, and `.txt` documents.
- **Real-Time Job Polling**: Polls `/api/pipeline/status/{job_id}` every 2 seconds, displaying an animated progress banner and automatically updating entity and link counts upon completion.

#### 3. Full Profile Dossier Modal (`EntityJanamKundliModal.jsx`)
- Replaces informal slang with formal judicial terminology.
- 4-Tab Tabular Inspector:
  1. *Profile & Aliases*: Demographics, observed aliases, phone numbers, and risk score.
  2. *Direct Associates*: Tabular breakdown of all connected suspects, relationship types, and domain sources.
  3. *Primary Evidence & Wiretaps*: Document excerpts with verified SHA-256 custody seals.
  4. *Kingpin Pathfinder*: Instant shortest-path calculation between the subject and syndicate kingpins.

#### 4. Anomaly Hub & Strategic Chokepoint Bridges (`AnomalyHubPage.jsx`)
- **Expand-on-Click Cards**: Anomaly cards start collapsed with clear, natural language summaries and named suspect tags (no raw `ENT_HUB_...` identifiers). Clicking expands detailed subgraph lists.
- **Strategic Chokepoint Bridges**: Visualizes the cut-edges discovered by NetworkX, showing critical interdiction bottlenecks.

#### 5. Section 65B Court Prosecution Brief Generator (`DossiersPage.jsx`)
- Previews the official court dossier and initiates one-click PDF generation via ReportLab.
- Searchable primary evidence repository categorized by document type pills (FIR, Intercept, Confession, Surveillance, Financial).

#### 6. XAI Evidentiary Pathfinder Console (`XaiConsolePage.jsx`)
- Allows investigators to select any two suspects and calculates the shortest path through the syndicate network.
- Generates natural language explanations for every hop, citing source documents and evidence snippets verbatim.

#### 7. Digital Chain-of-Custody & Audit Ledger (`AuditLogsPage.jsx`)
- Displays real-time database audit transactions with individual `prev_hash` and `entry_hash` seals.
- Features the interactive **"🛡️ Verify Chain Integrity (O(n))"** button, triggering full backend hash-chain verification and rendering a green verification seal or red discrepancy warning.

#### 8. Compulsory Security Gate (`LoginGate.jsx`, `LoginModal.jsx`)
- Enforces mandatory authentication on application startup before the dashboard renders.
- Features quick-switch credentials for demonstration across 3 legal roles:
  - Lead Investigator (`investigator_01`)
  - NCRB Administrator (`ncrb_admin`)
  - Judicial Compliance Auditor (`judicial_auditor`)

---

## 6. Verification & Automated Test Suite

The system maintains 100% test coverage across backend endpoints, analytics algorithms, and frontend compilation:

### 6.1 Backend Pytest Suite (`tests/`)
All **21 automated unit and integration tests** pass:
- `test_root_endpoint`: Verifies API online status.
- `test_auth_login_and_me`: Validates JWT issuance and user profile lookup.
- `test_rbac_access_control`: Enforces 403 Forbidden for unauthorized roles.
- `test_cases_crud`: Tests case registration, update, archiving, and soft-delete.
- `test_graph_endpoint`: Validates full graph node and edge serialization.
- `test_centrality_endpoint`: Verifies PageRank and Betweenness rankings.
- `test_timeline_endpoint`: Checks chronological interaction feeds.
- `test_xai_explain_path`: Validates shortest path discovery and explanation.
- `test_bridges_endpoint`: Tests NetworkX cut-edge calculation.
- `test_export_endpoint`: Validates JSON and GraphML graph exports.
- `test_audit_verify_endpoint`: Validates $O(n)$ hash-chain verification and RBAC gating.
- `test_court_dossier_pdf_generation`: Tests ReportLab PDF compilation and byte delivery.
- `test_investigator_feedback_endpoint`: Tests human feedback and edge re-weighting.
- `test_pipeline_execution`: Validates ingestion, extraction, resolution, and ground-truth scoring.

### 6.2 Frontend Production Build
The Vite production bundle compiles cleanly with 0 warnings or errors:
- **Build Output**: `dist/index.html` (0.70 kB), `dist/assets/index-RDtxqbYA.css` (29.07 kB), `dist/assets/index-Cl5escio.js` (304.22 kB).
- **Compile Time**: ~990ms.

---

## 7. Operational Deployment & Execution

### 7.1 Running Locally
```powershell
# 1. Start FastAPI Backend (Port 8000)
.\venv\Scripts\uvicorn.exe backend.main:app --host 0.0.0.0 --port 8000 --reload

# 2. Start Vite Frontend (Port 5173)
cd frontend\nexustrace-react-v3
npm run dev
```

### 7.2 Running Full End-to-End Pipeline
```powershell
.\venv\Scripts\python.exe pipeline\run_pipeline.py
```

### 7.3 Executing Test Suite
```powershell
.\venv\Scripts\python.exe -m pytest tests/ -v
```

---

## 8. Summary of Technical Innovations

1. **Section 65B Indian Evidence Act Compliance**: Tamper-evident SHA-256 hash chains ensure that every piece of electronic evidence presented in court is provably untampered.
2. **Hybrid POLE Extraction**: Combines state-of-the-art LLMs with offline heuristic fallbacks to guarantee robust entity extraction regardless of API connectivity.
3. **Cross-Domain Fuzzy Resolution**: Merges aliases across 10 distinct crime verticals, breaking investigative silos and revealing multi-vertical kingpins.
4. **Explainable AI (XAI)**: Replaces black-box predictions with verbatim document citations and hop-by-hop natural language explanations.
5. **Human-in-the-Loop Network Adaptation**: Investigator confirmations and rejections dynamically adjust edge weights, fine-tuning the graph model through field intelligence.
