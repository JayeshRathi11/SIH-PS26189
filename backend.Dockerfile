# NexusTrace backend container.
#
# The backend process (backend/main.py) imports modules from pipeline/ at
# request time (extraction, resolution, graph analytics) -- it is one
# integrated app, not two. backend/requirements.txt and
# pipeline/requirements.txt were previously separate and never combined
# for a container build, which meant a fresh image built from only
# backend/requirements.txt was missing google-genai (Gemini extraction)
# and rapidfuzz (entity resolution) -- the very first document upload
# would have crashed with a ModuleNotFoundError. This installs both.
#
# Build context must be the REPO ROOT (not backend/), since backend/main.py
# does `sys.path.insert(0, <repo root>)` to import the pipeline/ package
# as a sibling directory -- both backend/ and pipeline/ need to be present
# in the image at the same relative layout as in the repo.
FROM python:3.10-slim

WORKDIR /app

# System packages some of the PDF/graph-analytics deps need to compile.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./backend-requirements.txt
COPY pipeline/requirements.txt ./pipeline-requirements.txt
RUN pip install --no-cache-dir -r backend-requirements.txt -r pipeline-requirements.txt

# Now copy the actual application code.
COPY backend/ ./backend/
COPY pipeline/ ./pipeline/

# .env is NOT copied into the image -- it's supplied at run time via
# docker-compose's `env_file:` (see docker-compose.yml). Never bake secrets
# into an image layer; anyone with the image can extract them.

EXPOSE 8000

# Shell form (not exec-array) so ${PORT} actually expands -- Render assigns
# and injects its own PORT at runtime and routes external traffic to it;
# locally/in docker-compose PORT is unset so this falls back to 8000,
# matching the EXPOSE above and docker-compose.yml's port mapping.
CMD uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}
