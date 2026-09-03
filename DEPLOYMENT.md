# NexusTrace — Deployment Verification Notes

Written after checking the project's actual deployability (not just reading the code) — here's what was confirmed, what was fixed, and what still needs *you* to verify, because I hit a hard limitation partway through.

## What I could verify from here

- `.env` has every key the app needs, populated: `GEMINI_API_KEY`, `DATABASE_URL`, `JWT_SECRET_KEY`, `CORS_ORIGINS`, etc. (`OPENAI_API_KEY` is empty, which is fine — Gemini is the primary extractor and is checked first.)
- Core Python dependencies (FastAPI, SQLAlchemy, uvicorn, bcrypt, psycopg2) are installed and importable.
- `google-genai` and `rapidfuzz` (needed by the pipeline) are installed in your current environment. `spacy` is not — but that only backs the optional, non-primary baseline extractor, not the Gemini path your app actually uses.

## What I found and fixed

**`docker-compose.yml` only defined Neo4j.** No backend service, no frontend service — running `docker-compose up` would have started an unused Neo4j container and nothing else. Meanwhile `frontend/nexustrace-react-v3/Dockerfile` already expects to proxy `/api/` to `http://backend:8000/`, assuming a compose service named `backend` that didn't exist. I added `backend` and `frontend` services and made `neo4j` an opt-in profile (`docker compose --profile neo4j up`) since it isn't required for the app to work.

**`backend/requirements.txt` and `pipeline/requirements.txt` were never combined for a container build.** The backend process imports `pipeline/` modules at request time (Gemini extraction, entity resolution) — it's one integrated app. A container built from only `backend/requirements.txt` would be missing `google-genai` and `rapidfuzz`, and the first document upload would crash with `ModuleNotFoundError`. Added `backend.Dockerfile` (repo root) that installs both requirements files.

## What I could NOT verify — and why

I could not start the backend and confirm it actually connects to your database or runs a document through the pipeline. The sandboxed shell I'm working in has no network route to Supabase (`could not translate host name ... Temporary failure in name resolution`) — this is a restriction of *my* environment, not evidence of a bug in your app. You've been using the live app all session against real data, which is already strong evidence the DB connection and core pipeline work fine when run normally on your machine.

**Please run these yourself to close the loop** (in a normal terminal, not through me):

1. Start the backend the way you normally do (e.g. `uvicorn backend.main:app --reload`) and confirm it boots with no errors.
2. Upload one small `.txt` file through "+ Add New Case" in the app and confirm entities come back and the case shows real data (not zero entities).
3. If you want to test the Docker path before presenting: `docker compose build && docker compose up backend frontend` (from the repo root), then open `http://localhost:3000`. This has never been run end-to-end (Docker itself isn't installed in my sandbox), so treat this as unverified until you've tried it once.

## Files changed

- `backend.Dockerfile` — new
- `docker-compose.yml` — added `backend` + `frontend` services, made `neo4j` opt-in via profile
