import sys
from pathlib import Path

# Add project root directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import os
from dotenv import load_dotenv

# Load environment variables from .env before anything else reads them
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.db import init_db
from backend.routers import graph, entities, documents, pipeline, evaluation, auth, patterns, feedback, dossier

app = FastAPI(
    title="NexusTrace API",
    description="AI-Powered Criminal Network Analysis System API (MHA / NCRB)",
    version="1.0.0"
)

# Enable CORS for the frontend dev server. allow_origins=["*"] combined
# with allow_credentials=True is both rejected by browsers per the CORS
# spec and unnecessarily permissive for a system handling investigative
# data -- restrict to an explicit, configurable allowlist instead.
cors_origins = [o.strip() for o in os.getenv(
    "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
).split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize SQLite tables, column migrations & default users
init_db()

# Include API Routers
app.include_router(auth.router)
app.include_router(graph.router)
app.include_router(entities.router)
app.include_router(documents.router)
app.include_router(patterns.router)
app.include_router(feedback.router)
app.include_router(dossier.router)
app.include_router(pipeline.router)
app.include_router(evaluation.router)

@app.get("/")
def root():
    return {
        "status": "online",
        "system": "NexusTrace AI Criminal Network Analysis API",
        "documentation": "/docs"
    }
