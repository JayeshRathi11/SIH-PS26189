# NexusTrace — Backend Deep Dive

`backend/` — FastAPI (Python), the API layer sitting between the frontend and both the database and the analysis pipeline.

## Stack

FastAPI + Uvicorn, SQLAlchemy ORM, PostgreSQL (Supabase-hosted) via `DATABASE_URL` in `.env` (falls back to local SQLite if unset), JWT auth + `bcrypt` password hashing, CORS restricted to an explicit origin allowlist (not `*`).

## Entry Point — `main.py`

Loads `.env` via `python-dotenv` before anything else reads env vars, builds the FastAPI app (`NexusTrace API`, MHA/NCRB description), sets up CORS from `CORS_ORIGINS`, calls `init_db()` (creates tables + seeds default users/cases on first run), and mounts 11 routers: `auth`, `graph`, `entities`, `documents`, `patterns`, `feedback`, `dossier`, `pipeline`, `evaluation`, `audit`, `cases`.

## Routers (`backend/routers/`)

| Router | Prefix | What it does |
|---|---|---|
| `auth.py` | `/auth` | Login (JWT issue), current-user (`/me`), logout, `require_role()` dependency used everywhere else for RBAC, `log_audit()` helper that every other router calls to write a chained audit entry. |
| `cases.py` | `/cases` | Full case-registry CRUD: list (hides soft-deleted), create (idempotent — re-registering an id un-hides it), patch (archive/restore **and**, as of this session, status/tag change), delete (soft — sets `hidden=True`, never touches the underlying entity/relationship data for that domain). `case-all` is protected from modification/deletion at the API level. |
| `pipeline.py` | `/pipeline` | `/run` (re-runs one of the 10 built-in demo domains), `/upload` (accepts real `.txt`/`.docx`/`.pdf` files, extracts text, runs live extraction — used for both brand-new cases and adding evidence to an existing one), `/status/{job_id}` (poll a running job). Background tasks via FastAPI's `BackgroundTasks`. |
| `graph.py` | `/graph` | The main graph read API: full graph data, centrality rankings, timeline events, and `explain` (shortest-path XAI reasoning between two entities). |
| `entities.py` | `/entities` | Search entities, get one entity's full detail. |
| `documents.py` | `/documents` | List/fetch parsed source documents by domain. |
| `patterns.py` | `/patterns` | Suspicious-pattern alerts (feeds the Anomaly Hub) — cross-domain hubs, circular hawala, burner-SIM rings, trafficking corridors (computed by the pipeline's `SuspiciousPatternDetector`). |
| `feedback.py` | `/graph/feedback` | Human-in-the-loop: investigator confirms/rejects a flagged entity or link (`CONFIRMED`/`REJECTED`/`UNCERTAIN`), and a listing of past feedback. |
| `dossier.py` | `/dossier` | Generates and serves the court-ready PDF dossier for an entity (`/generate`, `/download/{entity_id}`). |
| `evaluation.py` | `/evaluation` | Precision/recall/F1 metrics per domain, comparing extraction output against ground truth. |
| `audit.py` | `/audit` | `/log` — paginated ledger listing (role-gated to Officer-in-Charge/Auditor). `/verify` — walks the entire hash chain and confirms no entry has been tampered with (O(n)). |

## Database (`backend/db.py`)

SQLAlchemy models, all backed by PostgreSQL in production:

- **`User`** — username, hashed password (bcrypt), role (`INVESTIGATOR` / `OFFICER_IN_CHARGE` / `AUDITOR`). Seeded by `seed_default_users()`.
- **`CaseRecord`** — the case "folder" registry described in `cases.py` above: id, display case code, title, entity/link count labels, tag (status), `archived`, `hidden` (soft-delete), sort order, created_by/at. `DEFAULT_CASES` seeds 11 rows on first run (the 10 demo domains + the `case-all` master view) via `seed_default_cases()` — only runs if the table is empty.
- **`AuditLog`** — the tamper-evident ledger. Every row: id, user_id, username, action, resource_type, resource_id, details, status, `content_hash` (hash of a specific artifact, e.g. an uploaded document), and the chain-linking pair `prev_hash`/`entry_hash`. `entry_hash = sha256(prev_hash + canonical(row))`; the first row in the table chains from a fixed genesis value. This is what `/audit/verify` walks.
- **`EvidenceLedgerRecord`** — per-document hash/size/redaction-count record, separate from the audit log.
- **`InvestigatorFeedback`** — confirm/reject verdicts on entities or relationships.
- **`JobRecord`** — pipeline job tracking (status: RUNNING/COMPLETED/FAILED, entity/relationship counts, error message).
- Plus `EntityRecord`/`RelationshipRecord`-equivalent tables that store the resolved graph itself (populated by the pipeline, read by `graph.py`/`entities.py`).

**Note on Neo4j:** `pipeline/graph/neo4j_client.py` and a `neo4j>=5.0.0` dependency exist, and `.env` even has `NEO4J_URI=bolt://localhost:7687` pre-filled — but it's wired as an optional mirror in `build_graph.py` ("Load into Neo4j if available") that gracefully no-ops if the connection fails. PostgreSQL is the real, guaranteed-on data store; Neo4j only matters if a Neo4j server is actually running wherever the app is deployed.

## Services (`backend/services/`)

- `dossier_service.py` — builds the court dossier PDF (via `reportlab`), including the officer attestation block and a "Verification: Digitally Sealed & SHA-256 Hash-Chain Verified (NCRB PKI)" line (a leftover blank signature line was removed this session).
- `graph_service.py` — the query/assembly logic behind `graph.py`'s endpoints.

## Auth & RBAC

JWT bearer tokens, `bcrypt` for password hashing. `require_role([...])` is a FastAPI dependency used throughout the routers — a role not in the allowed list gets an HTTP 403, which the frontend's `client.js` detects by inspecting `response.status` (not `statusText`, which is unreliable).

## Fixed This Session

1. `cases.py`: `CaseUpdateRequest` extended with a `tag` field (status change), separate from `archived`; both are now logged as distinct audit actions (`CASE_STATUS_CHANGE` vs `CASE_ARCHIVE`/`CASE_RESTORE`).
2. `dossier_service.py`: removed a leftover blank signature line, replaced with a proper "Verification" row.
