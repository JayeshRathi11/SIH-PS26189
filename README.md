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

## Quick Start

### 1. Requirements
- Python 3.11+
- Node.js 18+
- Docker (for Neo4j graph database)

### 2. Setup Environment & Pipeline
```bash
# Set up Python virtual environment (optional)
python -m venv venv
# On Windows: venv\Scripts\activate

# Install pipeline dependencies
cd pipeline
pip install -r requirements.txt

# Run pipeline on domain data
python run_pipeline.py --all
```

### 3. Run Backend API
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 4. Run Frontend Dashboard
```bash
cd frontend
npm install
npm run dev
```

License: Open Source / SIH 2026.
