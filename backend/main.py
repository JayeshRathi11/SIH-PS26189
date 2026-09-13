import sys
from pathlib import Path

# Add project root directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import os
import asyncio
from dotenv import load_dotenv

# Load environment variables from .env before anything else reads them
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.db import init_db
from backend.routers import graph, entities, documents, pipeline, evaluation, auth, patterns, feedback, dossier, audit, cases, ws
from backend.ws_manager import manager
from pipeline.graph.neo4j_client import get_neo4j_client, close_neo4j_client

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
app.include_router(audit.router)
app.include_router(cases.router)
app.include_router(ws.router)

# The pipeline's background tasks run on a worker thread, not this event
# loop -- ws_manager.broadcast() needs a live loop reference to hand
# outbound WebSocket sends back to from that thread (see ws_manager.py).
@app.on_event("startup")
async def _capture_event_loop_for_ws():
    manager.loop = asyncio.get_running_loop()

# Single persistent Neo4j driver for the whole app's lifetime, connected
# once here instead of per-request (GraphDatabase.driver() does a real
# network handshake + auth round-trip -- creating one per confirm/reject
# request was the source of the feedback endpoint's extra latency).
# connect() itself no-ops safely into self.driver = None if Neo4j isn't
# reachable, matching the existing "optional graph mirror" behavior.
@app.on_event("startup")
async def _connect_neo4j():
    get_neo4j_client()

@app.on_event("shutdown")
async def _close_neo4j():
    close_neo4j_client()

@app.get("/")
def root():
    return {
        "status": "online",
        "system": "NexusTrace AI Criminal Network Analysis API",
        "documentation": "/docs"
    }
