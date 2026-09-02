# NexusTrace — Complete System Architecture & Engineering Documentation

> **AI-Powered Cross-Domain Criminal Network Analysis & Evidentiary Synthesis Platform**  
> *Engineered for the Ministry of Home Affairs (MHA) & National Crime Records Bureau (NCRB)*  
> *Compliance Standard: Section 65B, Indian Evidence Act / Bharatiya Sakshya Adhiniyam*

---

## 1. Executive Summary & Vision

Transnational organized crime syndicates operate across fragmented legal jurisdictions and specialized crime verticals—narcotics trafficking, hawala banking, arms smuggling, cyber financial fraud, human trafficking, and extortion. While field units log individual First Information Reports (FIRs), call detail records (CDRs), and seized ledgers into isolated local databases, syndicate kingpins deliberately exploit jurisdictional silos to evade detection.

**NexusTrace** is an enterprise-grade intelligence synthesis platform that unifies disparate investigative records across **10 crime verticals** into an incrementally resolved, tamper-evident, and explainable **Cross-Domain Knowledge Graph**. It integrates:
- Automated multi-threaded Natural Language Processing (NLP) with Google Gemini LLMs and regex NER fallbacks.
- Cross-domain fuzzy entity resolution, alias aggregation, and identifier correlation.
- Advanced graph topology analytics (PageRank, Betweenness Centrality, Louvain community clusters, and Tarjan's bridge cut-edge algorithms).
- 4 specialized syndicate Modus Operandi (M.O.) anomaly detection engines.
- Section 65B compliant $O(n)$ SHA-256 cryptographic chain-of-custody verification.
- Dual-database persistent storage: **PostgreSQL (Supabase)** as the primary relational store and **Neo4j** as the graph traversal mirror.
- A high-contrast forensic command center UI built with React 18, Vite, and custom CSS design tokens.

```
┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 NEXUSTRACE SYSTEM TOPOLOGY                                     │
├─────────────────────────┬───────────────────────────────┬──────────────────────────────────────┤
│    DATA & INGESTION     │      PIPELINE & ANALYTICS     │         BACKEND & INTERFACES         │
├─────────────────────────┼───────────────────────────────┼──────────────────────────────────────┤
│ • 10 Crime Verticals    │ • LLM Entity & Triple Extract │ • FastAPI REST Core (11 Routers)     │
│ • FIRs, Wiretaps, CDR   │ • 7-Type Master POLE Schema   │ • PostgreSQL 17.6 (Supabase Cloud)   │
│ • SHA-256 Ingestion     │ • Fuzzy Identity Resolution   │ • Local SQLite Zero-Config Fallback  │
│ • PII Masking (UID/PAN) │ • PageRank & Centrality Hubs  │ • Neo4j Cypher Graph Engine Mirror   │
│ • Multi-format Parser   │ • 4 Syndicate Anomaly Engines │ • O(n) Tamper-Evident Hash Custody   │
│   (.pdf, .docx, .txt)   │ • NetworkX Chokepoint Bridges │ • ReportLab Court Brief PDF Engine   │
│ • Structured CSVs       │ • Temporal Decay Scoring      │ • React 18 / Vite Tactical UI Canvas │
└─────────────────────────┴───────────────────────────────┴──────────────────────────────────────┘
```

---

## 2. Dataset Architecture & Cross-Domain Topology

The platform is pre-loaded with curated synthetic investigative datasets mirroring real-world law enforcement intelligence across 10 distinct crime verticals, located in `dataset/` and `data/`:

### 2.1 The 10 Crime Verticals

| Vertical ID | Domain Key | Vertical Title | Core Modus Operandi & Document Types | Key Suspects & Anchors |
|---|---|---|---|---|
| **01** | `01_narcotics_trafficking` | Narcotics Trafficking | Opium/heroin smuggling routes, border drop points, handler-carrier cell networks. | Iliyas Khan, Devendra Solanki, border couriers. |
| **02** | `02_human_trafficking` | Human Trafficking | Placement agency fronts, interstate transit hubs, forged identity credentials. | Sunrise Placement Services, Manoj Tiwari. |
| **03** | `03_cyber_financial_fraud` | Cyber Financial Fraud | Phishing call centers, mule account networks, crypto-conversion gateways. | Rohit Chaurasia, IA Digital Ventures Pvt Ltd. |
| **04** | `04_arms_smuggling` | Arms Smuggling | Cross-border weapons consignment, illegal armories, underground procurement. | Harjeet Singh, arms runners, dead-drop caches. |
| **05** | `05_organized_extortion` | Organized Extortion | Protection money collections, threat calls, shell construction fronts. | Syndicate collection squads, real estate intimidation. |
| **06** | `06_kidnapping_for_ransom` | Kidnapping for Ransom | Target reconnaissance, safehouse management, encrypted ransom demands. | Safehouse keepers, burner phone dispatchers. |
| **07** | `07_counterfeit_currency` | Counterfeit Currency | High-quality fake Indian currency notes (FICN), printing presses, transit mules. | Border currency couriers, printing handlers. |
| **08** | `08_illegal_betting_hawala` | Illegal Betting & Hawala | Unregistered sports betting syndicates, token-based Hawala ledger settlements. | Token handlers, bookmakers, Hawala operators. |
| **09** | `09_vehicle_theft_ring` | Vehicle Theft Ring | Luxury vehicle theft, chassis tampering, interstate resale networks. | Anil Kamble, chop shops, interstate document forgers. |
| **10** | `10_land_grabbing_fraud` | Land Grabbing & Fraud | Revenue record manipulation, benami property acquisitions, intimidation squads. | Land revenue conduits, shell company owners. |

### 2.2 Cross-Domain Master Syndicate Storyline
Rather than 10 isolated criminal rings, the dataset models an interconnected criminal syndicate commanded by a single shadowy kingpin:

```
                               ┌─────────────────────────────┐
                               │     ENT_HUB_IQBAL_ANSARI    │
                               │   "Iqbal Ansari" / Sethji   │
                               │   Combined Hub Score: 0.98  │
                               └──────────────┬──────────────┘
                                              │
               ┌──────────────────────────────┼──────────────────────────────┐
               │                              │                              │
       (Narcotics Wing)               (Cyber & Hawala)              (Arms & Logistics)
               │                              │                              │
               ▼                              ▼                              ▼
    ┌──────────────────────┐      ┌──────────────────────┐       ┌──────────────────────┐
    │     Iliyas Khan      │      │   Rohit Chaurasia    │       │     Harjeet Singh    │
    │  Narcotics Operative │      │  Mule Network Master │       │   Arms Consignments  │
    └──────────┬───────────┘      └──────────┬───────────┘       └──────────┬───────────┘
               │                             │                              │
               │                             ▼                              │
               │                  ┌──────────────────────┐                  │
               │                  │  IA Digital Ventures │                  │
               │                  │   (Shell Company)    │                  │
               │                  └──────────────────────┘                  │
               │                                                            │
               └─────────────────────── Shared Asset ───────────────────────┘
                                   Phone: +91 99870 12345
                                 Vehicle: KA05MN4321 / TN09PQ7788
```

- **Central Kingpin (`ENT_HUB_IQBAL_ANSARI`)**: Appears as *"Iqbal Ansari"* in Narcotics filings, *"Sethji"* in Hawala ledgers, *"the Financier"* in Arms shipments, and *"the Director"* in Cyber Fraud shell accounts.
- **Shared Telephonic Backbone (`ENT_PHONE_9987012345`)**: Burner phone line `+91 99870 12345` surfaces in Narcotics FIRs, Extortion threat calls, and Hawala token receipts.
- **Shared Logistics Asset (`VEH_KA05MN4321_TN09PQ7788`)**: White Mahindra Scorpio with forged plates used interchangeably to transport smuggled small arms (Domain 04) and stolen vehicles (Domain 09).
- **Front Entities**:
  - `ENT_ORG_IA_DIGITAL` (*IA Digital Ventures Pvt Ltd*): Funnels illicit cyber fraud gains into Hawala betting accounts.
  - `ENT_ORG_SUNRISE_PLACEMENT` (*Sunrise Placement Services*): Human trafficking front masking migrant labor exploitation.

---

## 3. The Extraction & Synthesis Pipeline (`pipeline/`)

The pipeline transforms raw, unstructured police narratives into a resolved mathematical graph through 5 deterministic stages:

```
[ Raw Narrative Docs (.pdf, .docx, .txt, .md) ]
                        │
                        ▼
 ┌──────────────────────────────────────────────┐
 │ Stage 1: Ingestion & Digital Custody         │
 │ • SHA-256 Primary Document Seal              │
 │ • PII Masking: Regex Aadhaar & PAN Redaction │
 └──────────────────────┬───────────────────────┘
                        ▼
 ┌──────────────────────────────────────────────┐
 │ Stage 2: Hybrid POLE Extraction              │
 │ • Multi-threaded Google Gemini Pro / Flash   │
 │ • Offline Heuristic Regex NER Fallback       │
 │ • Verbatim Sentence Evidence Citation        │
 └──────────────────────┬───────────────────────┘
                        ▼
 ┌──────────────────────────────────────────────┐
 │ Stage 3: Schema Normalization                │
 │ • Maps raw predicates into 7 Master Relations│
 │ • Normalizes Entity Types (POLE Ontology)    │
 └──────────────────────┬───────────────────────┘
                        ▼
 ┌──────────────────────────────────────────────┐
 │ Stage 4: Incremental Entity Resolution       │
 │ • Fuzzy String Matching (Token-Sort >= 88)   │
 │ • Shared Identifier Correlation (Phone/Auto) │
 │ • Canonical Alias & Domain Aggregation       │
 └──────────────────────┬───────────────────────┘
                        ▼
 ┌──────────────────────────────────────────────┐
 │ Stage 5: Topology Analytics & Anomaly Hub    │
 │ • PageRank + Betweenness Hub Scoring         │
 │ • Exponential Temporal Decay Weighting       │
 │ • 4 Modus Operandi Syndicate Pattern Engines │
 │ • NetworkX Cut-Edge Chokepoint Bridges       │
 └──────────────────────┬───────────────────────┘
                        ▼
    [ PostgreSQL (Supabase) & Neo4j Bolt Mirror ]
```

### 3.1 Stage 1: Ingestion & Digital Custody (`pipeline/ingestion/`)
1. **Multi-Format Extraction**: `parse_raw_document_file()` parses `.pdf` via `pypdf`, `.docx` via `python-docx`, and `.txt` / `.md` via UTF-8 streams.
2. **SHA-256 Custody Hash**: Computes an immutable SHA-256 checksum on document ingest:
   $$\text{doc\_hash} = \text{SHA256}(\text{document\_bytes})$$
3. **PII Masking (`sanitizer.py`)**: Sanitizes sensitive personal identifiers prior to external LLM calls to comply with privacy regulations:
   - **Aadhaar**: Redacts 12-digit patterns `\b[2-9]\d{3}\s?\d{4}\s?\d{4}\b` $\rightarrow$ `[AADHAAR_REDACTED]`.
   - **PAN**: Redacts 10-character alphanumeric patterns `\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b` $\rightarrow$ `[PAN_REDACTED]`.

### 3.2 Stage 2: Hybrid POLE Extraction (`pipeline/extraction/`)
- **Multi-Threading**: Uses `concurrent.futures.ThreadPoolExecutor(max_workers=6)` for high-throughput batch extraction.
- **LLM Extraction Prompt (`extraction_prompt.py`)**: Prompts Google Gemini with few-shot law-enforcement exemplars to extract structured JSON triples:
  ```json
  {
    "entities": [
      {"name": "Iliyas Khan", "type": "PERSON", "aliases": ["Chhota Iliyas"], "phone_numbers": ["9820011223"]}
    ],
    "relationships": [
      {
        "source": "Iliyas Khan",
        "source_type": "PERSON",
        "relationship_type": "COMMANDS",
        "target": "Devendra Solanki",
        "target_type": "PERSON",
        "confidence": 0.95,
        "evidence": "Devendra Solanki confessed that he received consignments directly under the instructions of Iliyas Khan."
      }
    ]
  }
  ```
- **Heuristic Rule-Based Fallback**: If LLM API connectivity is unavailable or throttled, regex patterns extract person names, phone numbers, vehicle registrations, and predicates without crashing.

### 3.3 Stage 3: Schema Normalization (`pipeline/normalization/`)
Maps diverse investigative vocabulary into the **7 Master POLE Relationships**:

| Master Relationship | Semantic Meaning | Example Raw Verbs Mapped |
|---|---|---|
| `ASSOCIATE_OF` | Operational accomplice / peer | accomplice, partner, associate, syndicate member |
| `COMMANDS` | Hierarchical syndicate control | kingpin, boss, orders, directed by, oversees |
| `COMMUNICATED_WITH`| Direct telephonic / radio wiretap | called, texted, intercepted communication, met with |
| `TRANSACTED_WITH` | Financial transfer / Hawala payment| transferred, laundered cash, hawala token, paid |
| `OPERATES_IN` | Geographical jurisdiction | operates in, hideout located, drug route, safehouse |
| `OWNS_ASSET` | Physical asset ownership | registered owner, vehicle used, weapon cached |
| `FAMILY_OF` | Kinship / matrimonial connection | brother of, wife of, son of, cousin |

### 3.4 Stage 4: Incremental Entity Resolution (`pipeline/resolution/`)
Resolves distinct surface mentions into unified canonical identities:
1. **Fuzzy String Matching**: Evaluates token-sort Levenshtein similarity:
   $$\text{Similarity}(S_1, S_2) = \frac{2 \cdot |T_1 \cap T_2|}{|T_1| + |T_2|} \ge 0.88$$
2. **Identifier Correlation**: Merges records sharing phone numbers, bank accounts, or vehicle registrations regardless of name spelling.
3. **Canonical Record Synthesis**: Generates persistent identifiers (e.g., `ENT_HUB_IQBAL_ANSARI`), aggregating all observed aliases, phone numbers, and cross-domain references.

### 3.5 Stage 5: Topology Analytics & Anomaly Detection (`pipeline/graph/`)

#### 1. Mathematical Centrality Scoring
Calculates a unified influence score for every subject:
$$\text{HubScore}(v) = 0.5 \cdot \text{PageRank}(v) + 0.5 \cdot C_B(v)$$
Where Betweenness Centrality $C_B(v)$ captures transit control over intelligence paths:
$$C_B(v) = \sum_{s \ne v \ne t} \frac{\sigma_{st}(v)}{\sigma_{st}}$$

#### 2. Temporal Weight Decay
Applies exponential decay based on the age of recorded interactions:
$$w_{\text{effective}} = w_0 \cdot \exp\left(-\lambda \cdot \Delta t_{\text{days}}\right)$$
Where $\lambda = \frac{\ln(2)}{180}$ (half-life of 180 days).

#### 3. Strategic Chokepoint Bridges (Cut-Edges)
Using Tarjan's Bridge-Finding Algorithm ($O(V + E)$), the engine detects critical bridge edges $e = (u, v)$ whose removal increases the number of connected components:
$$\text{Bridge}(u, v) \iff \text{low}[v] > \text{tin}[u]$$
In criminal network interdiction, cutting these bridges disconnects separate syndicate operational wings.

#### 4. The 4 Modus Operandi Anomaly Engines (`pattern_detector.py`)
1. **Cross-Domain Mastermind Hubs**: Identifies subjects active in $\ge 3$ distinct domains with high Betweenness Centrality ($C_B \ge 0.15$).
2. **Circular Hawala / Mule Loops**: Uses Tarjan's Strongly Connected Components (SCC) to detect directed cycles ($A \rightarrow B \rightarrow C \rightarrow A$) indicative of money laundering layering.
3. **Burner SIM Fleet Fast-Switching**: Detects clusters of $\ge 3$ disposable phone numbers linked to a single suspect with rapid switching frequency.
4. **Trafficking Corridors**: Identifies sequential 3-hop directed chains: $\text{Recruitment Hub} \rightarrow \text{Transit Waypoint} \rightarrow \text{Destination Exploitation}$.

---

## 4. Database Layer & Dual-Storage Architecture

NexusTrace uses a dual-engine architecture:
1. **Primary Relational Store**: **PostgreSQL 17.6 (Supabase Cloud)** with automated SQLite zero-config fallback.
2. **Graph Visual Mirror**: **Neo4j 5.x** via the official Python Bolt driver.

```
                                  ┌───────────────────────────┐
                                  │      SQLAlchemy ORM       │
                                  └─────────────┬─────────────┘
                                                │
                       ┌────────────────────────┴────────────────────────┐
                       ▼                                                 ▼
       ┌───────────────────────────────┐                 ┌───────────────────────────────┐
       │   PostgreSQL 17.6 (Supabase)  │                 │    Local SQLite Fallback      │
       │   ap-northeast-1 (Tokyo)      │                 │    (nexustrace.db)            │
       │   IPv4 Connection Pooler      │                 │    Zero-configuration file    │
       │   aws-0-ap-northeast-1:5432   │                 │    check_same_thread=False    │
       └───────────────────────────────┘                 └───────────────────────────────┘
                                                │
                                                ▼
                               ┌─────────────────────────────────┐
                               │       Neo4j 5.x Graph Mirror    │
                               │       bolt://localhost:7687     │
                               │       Cypher Visual Queries     │
                               └─────────────────────────────────┘
```

### 4.1 PostgreSQL on Supabase (`backend/db.py`)
- **Active Instance**: PostgreSQL 17.6 on Supabase (`ap-northeast-1`).
- **IPv4 Connection Pooler Configuration**:
  Direct Supabase hostnames (`db.xxx.supabase.co`) provide only IPv6 `AAAA` records. To support standard IPv4 Windows / ISP connections, the project connects via the **Supabase Session Pooler**:
  ```
  DATABASE_URL=postgresql://postgres.ssplbrksofzwfkzagcod:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres
  ```
- **Dialect Isolation**:
  ```python
  _engine_kwargs = {"connect_args": {"check_same_thread": False}} if DATABASE_URL.startswith("sqlite") else {}
  engine = create_engine(DATABASE_URL, **_engine_kwargs)
  ```

### 4.2 Database Schema & Table Definitions

| Table Name | Model Class | Primary Key | Description & Columns |
|---|---|---|---|
| `users` | `User` | `id` (UUID) | User accounts, `username`, `hashed_password` (bcrypt), `role` (`INVESTIGATOR`, `OFFICER_IN_CHARGE`, `AUDITOR`), `full_name`. |
| `cases` | `CaseRecord` | `id` (String) | Case folder registry: `case_id`, `title`, `entities_label`, `links_label`, `tag` (`Active`, `Cold Case`), `archived`, `hidden`. |
| `entities` | `EntityRecord` | `id` (String) | Canonical nodes: `canonical_name`, `type`, `aliases` (JSON), `domains` (JSON), `phone_numbers` (JSON), `hub_score`, `verified_by_officer`. |
| `relationships` | `RelationshipRecord` | `id` (String) | Canonical edges: `source_id`, `target_id`, `relationship_type`, `confidence`, `domain`, `evidence`, `verified_by_officer`, `weight_multiplier`. |
| `audit_logs` | `AuditLog` | `id` (Integer) | Section 65B hash-chain ledger: `user_id`, `action`, `resource_type`, `details`, `prev_hash`, `entry_hash`, `content_hash`. |
| `evidence_ledger` | `EvidenceLedgerRecord`| `id` (UUID) | Custody ledger: `doc_id`, `domain`, `sha256_hash`, `redacted_aadhaar_count`, `redacted_pan_count`. |
| `investigator_feedback`| `InvestigatorFeedback` | `id` (UUID) | Human-in-the-loop decisions: `target_type`, `target_id`, `verdict` (`CONFIRMED`, `REJECTED`), `officer_notes`. |
| `job_records` | `JobRecord` | `job_id` (String) | Pipeline asynchronous task status: `status` (`RUNNING`, `COMPLETED`, `FAILED`), entity/relationship counts. |

### 4.3 Section 65B Cryptographic Hash Chain
Every transaction is permanently sealed using a linked SHA-256 chain:
$$\text{entry\_hash}_i = \text{SHA256}(\text{prev\_hash}_{i-1} + \text{timestamp} + \text{user\_id} + \text{action} + \text{resource\_type} + \text{resource\_id} + \text{details} + \text{status} + \text{content\_hash})$$
- Genesis Entry: $\text{prev\_hash}_0 = \text{"0"} \times 64$.
- Traversal Endpoint (`GET /api/audit/verify`): Executes in $O(n)$ time, recomputing every hash from stored fields to pinpoint any unauthorized insertions, updates, or deletions.

### 4.4 Neo4j Graph Database Mirror (`pipeline/graph/neo4j_client.py`)
- **Connection**: Bolt protocol over port 7687 (`bolt://localhost:7687`).
- **Graph Modeling**:
  ```cypher
  // Node Creation with Multiple Labels
  MERGE (e:Entity:PERSON {id: $canonical_id})
  SET e.name = $canonical_name,
      e.aliases = $aliases,
      e.domains = $domains,
      e.hub_score = $hub_score;

  // Relationship Edge Creation
  MATCH (src:Entity {id: $source_id}), (tgt:Entity {id: $target_id})
  MERGE (src)-[r:COMMANDS {domain: $domain}]->(tgt)
  SET r.confidence = $confidence,
      r.evidence = $evidence;
  ```
- **Graceful Fallback**: If Neo4j is offline, the backend continues seamlessly from PostgreSQL and in-memory NetworkX graphs.

---

## 5. Backend REST API Architecture (11 Routers)

FastAPI acts as the API gateway between the frontend, databases, and analysis pipelines:

```
                                  ┌───────────────────────────┐
                                  │      FastAPI Gateway      │
                                  └─────────────┬─────────────┘
                                                │
   ┌──────────────┬──────────────┬──────────────┼──────────────┬──────────────┬──────────────┐
   ▼              ▼              ▼              ▼              ▼              ▼              ▼
 /auth          /cases         /graph        /entities      /documents     /patterns     /feedback
   │              │              │              │              │              │              │
   ▼              ▼              ▼              ▼              ▼              ▼              ▼
 /dossier       /pipeline      /audit        /evaluation
```

### 5.1 Endpoints Specification

#### 1. Authentication Router (`/api/auth`)
- `POST /login`: Issues JWT Bearer token with configurable expiry (60 min).
- `GET /me`: Returns profile of authenticated officer (`username`, `role`, `full_name`).
- `POST /logout`: Invalidates session and logs audit trail.
- `GET /audit-logs`: Paginated audit log retrieval.

#### 2. Case Management Router (`/api/cases`)
- `GET /`: Lists all active case folders (filters out `hidden == True`).
- `POST /`: Creates or re-registers a case investigation.
- `PATCH /{case_id}`: Updates archive state or status `tag` (`Active`, `Cold Case`), emitting distinct `CASE_STATUS_CHANGE` or `CASE_ARCHIVE` audit events.
- `DELETE /{case_id}`: Soft-deletes case (`hidden = True`) without destroying underlying domain graph data. `case-all` is protected.

#### 3. Graph & Analytics Router (`/api/graph`)
- `GET /`: Fetches nodes and edges with domain, type, and temporal decay filters.
- `GET /centrality`: Returns top-$N$ ranked syndicate influencers by combined Hub Score.
- `GET /timeline`: Chronological feed of interactions across wiretaps and transfers.
- `GET /explain`: XAI multi-hop pathfinding between two suspects with verbatim evidence citations.
- `GET /bridges`: Returns NetworkX cut-edges identifying strategic interdiction bottlenecks.
- `GET /export`: Exports graph topology in standard JSON or GraphML formats.

#### 4. Entities Registry Router (`/api/entities`)
- `GET /`: Fuzzy search by entity name, alias, or domain.
- `GET /{entity_id}`: Returns complete canonical profile, aliases, and metrics.

#### 5. Documents Router (`/api/documents`)
- `GET /`: Ingested case document catalog with `skip` and `limit` query pagination.
- `GET /{doc_id}`: Fetches primary document text and SHA-256 metadata.

#### 6. Suspicious Patterns Router (`/api/patterns`)
- `GET /suspicious`: Real-time crime pattern alerts (Cross-domain hubs, Hawala loops, Burner SIMs, Trafficking corridors).
- `GET /suspicious/{pattern_id}`: Fetches anomaly subgraph nodes and edges.

#### 7. Human Feedback Router (`/api/graph/feedback`)
- `POST /feedback`: Submits officer verification verdict (`CONFIRMED`, `REJECTED`, `UNCERTAIN`). Confirmed links receive $1.2\times$ weight boost; rejected links receive $0.05\times$ penalty.
- `GET /feedback`: Audit feed of past investigator decisions.

#### 8. Court Dossier Router (`/api/dossier`)
- `POST /generate`: Compiles ReportLab Section 65B certified PDF brief.
- `GET /download/{entity_id}`: Browser direct download for court briefs.

#### 9. Pipeline Router (`/api/pipeline`)
- `POST /run`: Re-runs extraction on built-in demo domains via `BackgroundTasks`.
- `POST /upload`: Multipart upload for `.pdf`, `.docx`, and `.txt` evidence files.
- `GET /status/{job_id}`: Real-time background job polling.

#### 10. Evaluation Router (`/api/evaluation`)
- `GET /`: Returns Precision, Recall, and F1 benchmarks across all 10 domains.
- `GET /{domain}`: Domain-specific benchmark scores against ground-truth keys.

#### 11. Security Audit Router (`/api/audit`)
- `GET /log`: Paginated digital chain-of-custody ledger (role-gated to Auditor / Admin).
- `GET /verify`: $O(n)$ cryptographic SHA-256 traversal verifying chain integrity.

### 5.2 Role-Based Access Control (RBAC) Matrix

| Endpoint | Investigator | Officer-in-Charge | Auditor | Public |
|---|:---:|:---:|:---:|:---:|
| `POST /api/auth/login` | ✅ | ✅ | ✅ | ✅ |
| `GET /api/graph` | ✅ | ✅ | ✅ | ❌ |
| `GET /api/graph/explain` | ✅ | ✅ | ✅ | ❌ |
| `POST /api/graph/feedback` | ✅ | ✅ | ❌ | ❌ |
| `POST /api/pipeline/upload` | ✅ | ✅ | ❌ | ❌ |
| `POST /api/dossier/generate` | ✅ | ✅ | ❌ | ❌ |
| `GET /api/audit/verify` | ❌ | ✅ | ✅ | ❌ |
| `GET /api/audit/log` | ❌ | ✅ | ✅ | ❌ |
| `DELETE /api/cases/{id}` | ❌ | ✅ | ❌ | ❌ |

---

## 6. Frontend & UI/UX Command Center Architecture

Built with **React 18** and **Vite**, the frontend serves as an operational Tactical Command Center.

### 6.1 Design Tokens & Forensic Styling (`index.css`)
- **Forensic Command Palette**:
  - Canvas Paper: `--paper` (`#F8FAFC` light / `#0B0F19` dark)
  - Raised Panels: `--panel` (`#FFFFFF` light / `#111827` dark)
  - Typography: `--ink` (`#0F172A` deep charcoal / `#F8FAFC` snow)
  - Forensic Status Stamps: `--stamp-red` (`#DC2626`), `--stamp-blue` (`#2563EB`), `--stamp-green` (`#16A34A`), `--tag-amber` (`#D97706`)
- **Typography**:
  - Headlines: `Space Grotesk` (clean, bold geometric styling).
  - Telephonic Data & Hashes: `IBM Plex Mono` (monospace forensic clarity).
  - Narrative Body: `IBM Plex Sans` (high-contrast legibility).

### 6.2 Core Modules & User Experience Workflows

```
[ Navigation Sidebar (Case Selector & System Tabs) ]
       │
       ├── 1. Case Board ──────────────► Radial Corkboard, Collision Repulsion, Hover Phone Decrypt
       ├── 2. Investigation Directory ──► Multi-File Ingestion, Real-Time Progress Polling
       ├── 3. Chronological Timeline ──► Wiretap, Call, and Financial Event Reconstruction
       ├── 4. Anomaly Hub ─────────────► Modus Operandi Alerts, Network Chokepoint Bridges
       ├── 5. Court Dossiers ──────────► Section 65B PDF Briefs, Document Repository
       ├── 6. Entities Registry ───────► Searchable Directory, Full Profile Dossier Modals
       ├── 7. XAI Pathfinder ──────────► Natural Language Evidentiary Hop-by-Hop Reasoning
       └── 8. Digital Custody Ledger ──► Live Chained Hash Ledger, O(n) Integrity Verification
```

#### 1. Interactive Case Board (`Board.jsx`, `PinNode.jsx`)
- **Two-Zone Canvas**:
  - *Central Connected Radial Canvas*: Connected nodes are arranged using polar coordinate geometry with collision repulsion ($r = R_0 + k \cdot \Delta R$, $\theta = \frac{2\pi i}{N}$).
  - *Right-Side Unpinned Dock*: Isolated subjects ($0\text{ connections}$) are docked neatly in the right margin.
- **Phone Decryption on Hover**: Phone numbers display as `🔒 Unknown` with a lock icon, decrypting with a smooth micro-animation to reveal the actual carrier line on hover.
- **Color-Coded Red Threads**: Visual SVG threads indicating relationship types (Red: `COMMANDS`, Blue: `TRANSACTED_WITH`, Cyan: `COMMUNICATED_WITH`, Orange: `ASSOCIATE_OF`).

#### 2. Full Profile Dossier Modal (`EntityJanamKundliModal.jsx`)
- 4-Tab Tabular Inspector:
  1. *Profile & Aliases*: Demographic attributes, observed aliases, phone numbers, and calculated risk score.
  2. *Direct Associates*: Tabular matrix of all connected suspects, relationship types, and domain sources.
  3. *Primary Evidence & Wiretaps*: Document excerpts with verified SHA-256 custody seals.
  4. *Kingpin Pathfinder*: Instant shortest-path calculation between the subject and syndicate kingpins.

#### 3. Investigation Directory & Ingestion Hub (`CaseFilesPage.jsx`)
- Direct multi-file uploader for `.pdf`, `.docx`, and `.txt` files via multipart form data.
- Real-time job status polling (`/api/pipeline/status/{job_id}`) displaying an animated progress banner and refreshing entity counts upon completion.

#### 4. Syndicate Anomaly Hub (`AnomalyHubPage.jsx`)
- Expand-on-click cards starting collapsed with natural language summaries and named suspect tags.
- Visualizes NetworkX chokepoint bridges with high-impact interdiction tags.

#### 5. Section 65B Court Prosecution Brief Generator (`DossiersPage.jsx`)
- Generates certified court briefs compiled by ReportLab with officer attestation and NCRB PKI verification rows.
- Searchable primary evidence repository categorized by document type pills (FIR, Intercept, Confession, Surveillance, Financial).

#### 6. XAI Evidentiary Pathfinder Console (`XaiConsolePage.jsx`)
- Discovers multi-hop linkages between any two suspects.
- Produces natural language explanations with verbatim document quotes for court presentation.

#### 7. Digital Chain-of-Custody & Audit Ledger (`AuditLogsPage.jsx`)
- Displays real-time database audit transactions with individual `prev_hash` and `entry_hash` seals.
- Interactive **"🛡️ Verify Chain Integrity (O(n))"** button triggers backend verification and renders a cryptographic validity seal.

#### 8. Compulsory Security Gate (`LoginGate.jsx`, `LoginModal.jsx`)
- Enforces mandatory authentication on application startup before dashboard rendering.
- Quick-switch credentials across 3 personas:
  - Lead Investigator: `investigator_01` / `Investigate#2026`
  - NCRB Administrator: `ncrb_admin` / `Admin#MHA2026`
  - Judicial Compliance Auditor: `judicial_auditor` / `Audit#Secure2026`

---

## 7. Verification & Automated Test Suite

### 7.1 Backend Automated Pytest Suite (`tests/`)
All **21 automated unit and integration tests** pass against the live PostgreSQL database:
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

### 7.2 Frontend Production Build
Compiled using Vite:
- **Build Output**: `dist/index.html` (0.70 kB), `dist/assets/index-RDtxqbYA.css` (29.07 kB), `dist/assets/index-Cl5escio.js` (304.22 kB).
- **Compilation**: 49 modules transformed in ~990ms with 0 errors.

---

## 8. Deployment & Operational Runbook

### 8.1 Environment Variables Reference (`.env`)

| Variable Name | Required | Example / Default | Description |
|---|:---:|---|---|
| `DATABASE_URL` | Yes | `postgresql://user:pass@host:5432/postgres` | PostgreSQL connection string (falls back to local SQLite if unset). |
| `NEO4J_URI` | No | `bolt://localhost:7687` | Neo4j Bolt protocol URI. |
| `NEO4J_USER` | No | `neo4j` | Neo4j database user. |
| `NEO4J_PASSWORD` | No | `password` | Neo4j database password. |
| `JWT_SECRET_KEY` | Yes | `[64-character-hex-string]` | Secret key for signing HS256 JWT tokens. |
| `CORS_ORIGINS` | Yes | `http://localhost:5173,http://127.0.0.1:5173` | Comma-separated list of allowed frontend origins. |
| `GEMINI_API_KEY` | Optional| `AIzaSy...` | Google Gemini API key for POLE extraction. |
| `BACKEND_HOST` | No | `0.0.0.0` | FastAPI host bind address. |
| `BACKEND_PORT` | No | `8000` | FastAPI port. |

### 8.2 Local Development Commands

```powershell
# 1. Run Automated Tests
.\venv\Scripts\python.exe -m pytest tests/ -v

# 2. Start FastAPI Backend (Port 8000)
.\venv\Scripts\uvicorn.exe backend.main:app --host 0.0.0.0 --port 8000 --reload

# 3. Start Vite React Frontend (Port 5173)
cd frontend\nexustrace-react-v3
npm run dev
```

### 8.3 Dockerized Production Deployment (`docker-compose.yml`)

```yaml
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://postgres:Investigate#2026@postgres:5432/nexustrace
      - NEO4J_URI=bolt://neo4j:7687
      - NEO4J_USER=neo4j
      - NEO4J_PASSWORD=Investigate#2026
      - JWT_SECRET_KEY=nexustrace_super_secure_mha_ncrb_secret_key_2026_prod
      - CORS_ORIGINS=http://localhost:5173
    depends_on:
      - postgres
      - neo4j

  frontend:
    build:
      context: ./frontend/nexustrace-react-v3
      dockerfile: Dockerfile
    ports:
      - "5173:5173"
    depends_on:
      - backend

  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=Investigate#2026
      - POSTGRES_DB=nexustrace
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  neo4j:
    image: neo4j:5-community
    environment:
      - NEO4J_AUTH=neo4j/Investigate#2026
    ports:
      - "7474:7474"
      - "7687:7687"
    volumes:
      - neo4jdata:/data

volumes:
  pgdata:
  neo4jdata:
```

---

## 9. Summary of Technical Differentiators

1. **Section 65B Indian Evidence Act Admissibility**: Implements an immutable cryptographic SHA-256 hash chain with $O(n)$ verification from a fixed genesis hash, guaranteeing evidentiary custody.
2. **Multi-Domain Syndicate Synthesis**: Overcomes jurisdictional silos by resolving criminal identities across 10 verticals through fuzzy matching and identifier correlation.
3. **Strategic Network Interdiction**: Implements Tarjan's bridge-finding algorithm to highlight single points of failure and communication bottlenecks between syndicate wings.
4. **Explainable AI (XAI)**: Replaces opaque black-box scoring with step-by-step natural language reasoning citing verbatim evidence excerpts.
5. **Dual-Store Resilience**: Combines PostgreSQL for transactional integrity with Neo4j for high-performance graph traversals, backed by automatic SQLite local fallback.
