import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, BackgroundTasks, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from backend.models.schemas import PipelineJobResponse, PipelineRunRequest
from pipeline.extraction.llm_extractor import LLMExtractor
from pipeline.normalization.schema_mapper import normalize_relationship
from pipeline.resolution.entity_resolver import EntityResolver
from pipeline.graph.build_graph import build_graph_and_compute_analytics
from backend.db import get_db, JobRecord, SessionLocal, upsert_resolved_graph
from pipeline.run_pipeline import run_pipeline_end_to_end

router = APIRouter(prefix="/pipeline", tags=["Pipeline Execution"])

from pipeline.resolution.incremental_resolver import ingest_new_case_incrementally

def execute_pipeline_task(job_id: str, domain: str = None, raw_text: str = None):
    db = SessionLocal()
    try:
        if raw_text:
            extractor = LLMExtractor()
            extracted = extractor.extract_from_document(raw_text, doc_id=f"LIVE_{job_id}")
            extracted_entities = extracted.get("entities", [])
            raw_triples = extracted.get("relationships", [])
            for r in raw_triples:
                r["domain"] = domain or "general"

            normalized_triples = [normalize_relationship(r) for r in raw_triples]

            # Ingest incrementally against persistent database
            inc_res = ingest_new_case_incrementally(extracted_entities, normalized_triples, case_id=domain)

            total_e = inc_res["total_entities"]
            total_r = inc_res["total_relationships"]
        else:
            # Run end-to-end pipeline with DB sync
            results = run_pipeline_end_to_end(domain_filter=domain)
            total_e = results["graph_summary"]["total_entities"]
            total_r = results["graph_summary"]["total_relationships"]

            # Upsert results to DB
            from pipeline.resolution.entity_resolver import EntityResolver
            resolver = EntityResolver()
            resolver.load_existing_from_db(db)
            upsert_resolved_graph(db, resolver.export_resolution_map(), [])

        job = db.query(JobRecord).filter(JobRecord.id == job_id).first()
        if job:
            job.status = "COMPLETED"
            job.total_entities = total_e
            job.total_relationships = total_r
            job.completed_at = datetime.utcnow()
            db.commit()
    except Exception as e:
        job = db.query(JobRecord).filter(JobRecord.id == job_id).first()
        if job:
            job.status = "FAILED"
            job.error_message = str(e)
            db.commit()
    finally:
        db.close()

@router.post("/run", response_model=PipelineJobResponse)
def trigger_pipeline(
    background_tasks: BackgroundTasks,
    request_body: Optional[PipelineRunRequest] = None,
    domain: Optional[str] = Query(None, description="Optional domain key to run"),
    db: Session = Depends(get_db)
):
    target_domain = (request_body.domain if request_body and request_body.domain else domain)
    raw_text = request_body.raw_text if request_body else None

    job_id = f"JOB_{uuid.uuid4().hex[:8].upper()}"
    job = JobRecord(
        id=job_id,
        domain=target_domain,
        status="RUNNING",
        created_at=datetime.utcnow()
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    background_tasks.add_task(execute_pipeline_task, job_id, target_domain, raw_text)

    return PipelineJobResponse(
        job_id=job.id,
        domain=job.domain,
        status=job.status,
        total_entities=job.total_entities,
        total_relationships=job.total_relationships,
        created_at=job.created_at
    )

@router.get("/status/{job_id}", response_model=PipelineJobResponse)
def get_job_status(job_id: str, db: Session = Depends(get_db)):
    job = db.query(JobRecord).filter(JobRecord.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")
    return PipelineJobResponse(
        job_id=job.id,
        domain=job.domain,
        status=job.status,
        total_entities=job.total_entities,
        total_relationships=job.total_relationships,
        created_at=job.created_at,
        error_message=job.error_message
    )
