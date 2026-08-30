import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.db import init_db
from backend.routers import graph, entities, documents, pipeline, evaluation

app = FastAPI(
    title="NexusTrace API",
    description="AI-Powered Criminal Network Analysis System API (MHA / NCRB)",
    version="1.0.0"
)

# Enable CORS for Frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize SQLite tables
@app.on_event("startup")
def startup_event():
    init_db()

# Include API Routers
app.include_router(graph.router)
app.include_router(entities.router)
app.include_router(documents.router)
app.include_router(pipeline.router)
app.include_router(evaluation.router)

@app.get("/")
def root():
    return {
        "status": "online",
        "system": "NexusTrace AI Criminal Network Analysis API",
        "documentation": "/docs"
    }
