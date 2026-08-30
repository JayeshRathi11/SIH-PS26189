import uuid
from datetime import datetime
from fastapi import APIRouter, BackgroundTasks, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from backend.db import get_db, JobRecord
from backend.models.schemas import PipelineJobResponse
from pipeline.run_pipeline import run_pipeline_end_to_end

router = APIRouter(prefix="/pipeline", tags=["Pipeline Execution"])

def execute_pipeline_task(job_id: str, domain: str = None):
    # In background, run pipeline
    try:
        results = run_pipeline_end_to_end(domain_filter=domain)
        # Update SQLite job record
        from backend.db import SessionLocal
        db = SessionLocal()
        job = db.query(JobRecord).filter(JobRecord.id == job_id).first()
        if job:
            job.status = "COMPLETED"
            job.total_entities = results["graph_summary"]["total_entities"]
            job.total_relationships = results["graph_summary"]["total_relationships"]
            job.completed_at = datetime.utcnow()
            db.commit()
        db.close()
    except Exception as e:
        from backend.db import SessionLocal
        db = SessionLocal()
        job = db.query(JobRecord).filter(JobRecord.id == job_id).first()
        if job:
            job.status = "FAILED"
            job.error_message = str(e)
            db.commit()
        db.close()

@router.post("/run", response_model=PipelineJobResponse)
def trigger_pipeline(
    background_tasks: BackgroundTasks,
    domain: Optional[str] = Query(None, description="Optional domain key to run"),
    db: Session = Depends(get_db)
):
    job_id = f"JOB_{uuid.uuid4().hex[:8].upper()}"
    job = JobRecord(
        id=job_id,
        domain=domain,
        status="RUNNING",
        created_at=datetime.utcnow()
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    background_tasks.add_task(execute_pipeline_task, job_id, domain)

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
