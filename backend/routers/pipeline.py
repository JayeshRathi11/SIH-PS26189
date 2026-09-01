import io
import uuid
import hashlib
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, BackgroundTasks, Depends, Query, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from backend.models.schemas import PipelineJobResponse, PipelineRunRequest
from pipeline.extraction.llm_extractor import LLMExtractor
from pipeline.normalization.schema_mapper import normalize_relationship
from pipeline.resolution.entity_resolver import EntityResolver
from pipeline.graph.build_graph import build_graph_and_compute_analytics
from pipeline.ingestion.parse_documents import extract_text_from_docx, extract_text_from_pdf
from backend.db import get_db, JobRecord, SessionLocal, User, UserRole
from backend.routers.auth import require_role, log_audit
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
            # run_pipeline_end_to_end() already persists resolved entities and
            # relationships to SQLite internally (see pipeline/run_pipeline.py),
            # including real hub_score/community_cluster now that build_graph_
            # and_compute_analytics() writes them back onto each entity. The
            # old code here re-loaded a fresh EntityResolver from the DB and
            # re-upserted it with an EMPTY relationships list, which did
            # nothing useful and masked the fact that relationships were never
            # actually being written. Removed.
            results = run_pipeline_end_to_end(domain_filter=domain)
            total_e = results["graph_summary"]["total_entities"]
            total_r = results["graph_summary"]["total_relationships"]

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
    current_user: User = Depends(require_role([UserRole.INVESTIGATOR.value, UserRole.OFFICER_IN_CHARGE.value])),
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

    log_audit(
        db, action="PIPELINE_RUN_TRIGGERED", username=current_user.username, user_id=current_user.id,
        resource_type="JOB", resource_id=job_id, details=f"domain={target_domain}"
    )

    background_tasks.add_task(execute_pipeline_task, job_id, target_domain, raw_text)

    return PipelineJobResponse(
        job_id=job.id,
        domain=job.domain,
        status=job.status,
        total_entities=job.total_entities,
        total_relationships=job.total_relationships,
        created_at=job.created_at
    )

# Extensions this endpoint knows how to turn into raw text.
SUPPORTED_UPLOAD_EXTENSIONS = {".txt", ".docx", ".pdf"}

def _extract_text_from_upload(filename: str, raw_bytes: bytes) -> str:
    """Turn one uploaded file's bytes into plain text, by extension."""
    ext = ("." + filename.rsplit(".", 1)[-1].lower()) if "." in filename else ""
    if ext == ".docx":
        return extract_text_from_docx(io.BytesIO(raw_bytes))
    if ext == ".pdf":
        return extract_text_from_pdf(io.BytesIO(raw_bytes))
    # .txt
    try:
        return raw_bytes.decode("utf-8")
    except UnicodeDecodeError:
        return raw_bytes.decode("latin-1")

@router.post("/upload", response_model=PipelineJobResponse)
async def upload_case_document(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(..., description="One or more FIR / case source documents (.txt, .docx, .pdf)"),
    domain: str = Form(..., description="Target domain / case key these documents belong to"),
    current_user: User = Depends(require_role([UserRole.INVESTIGATOR.value, UserRole.OFFICER_IN_CHARGE.value])),
    db: Session = Depends(get_db)
):
    """
    Accepts one or more uploaded FIR/case documents from the frontend "Add
    New Case" form, extracts their raw text, and feeds the combined text
    into the same live-extraction pipeline path as POST /pipeline/run's
    `raw_text` field -- so a case created this way actually reflects the
    uploaded documents' content instead of running the pipeline on nothing.
    Files that fail to parse (wrong type, empty, unreadable) are skipped
    individually rather than failing the whole batch, as long as at least
    one file yields usable text.
    """
    combined_parts = []
    skipped = []
    accepted_files = []  # [(filename, sha256_hash), ...] -- for the audit chain below

    for f in files:
        filename = f.filename or "uploaded_document"
        ext = ("." + filename.rsplit(".", 1)[-1].lower()) if "." in filename else ""

        if ext not in SUPPORTED_UPLOAD_EXTENSIONS:
            skipped.append(f"{filename} (unsupported type '{ext or 'unknown'}')")
            continue

        raw_bytes = await f.read()
        if not raw_bytes:
            skipped.append(f"{filename} (empty file)")
            continue

        try:
            text = _extract_text_from_upload(filename, raw_bytes)
        except Exception as e:
            skipped.append(f"{filename} (failed to parse: {e})")
            continue

        text = (text or "").strip()
        if not text:
            skipped.append(f"{filename} (no extractable text)")
            continue

        combined_parts.append(f"=== Document: {filename} ===\n{text}")
        accepted_files.append((filename, hashlib.sha256(raw_bytes).hexdigest()))

    if not combined_parts:
        detail = "Could not extract any text from the uploaded document(s)."
        if skipped:
            detail += " Issues: " + "; ".join(skipped)
        raise HTTPException(status_code=400, detail=detail)

    raw_text = "\n\n".join(combined_parts)

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

    # One chained audit entry per accepted document, each carrying that
    # document's own SHA-256 as content_hash -- this is the chain-of-
    # custody record that a document with this exact content entered the
    # system, under this user, at this time, tied into the wider chain.
    for fname, fhash in accepted_files:
        log_audit(
            db, action="DOCUMENT_UPLOADED", username=current_user.username, user_id=current_user.id,
            resource_type="DOCUMENT", resource_id=fname, details=f"domain={domain}, job={job_id}",
            content_hash=fhash
        )
    if skipped:
        log_audit(
            db, action="DOCUMENT_UPLOAD_SKIPPED", username=current_user.username, user_id=current_user.id,
            resource_type="DOCUMENT", resource_id=job_id, details="; ".join(skipped), status="PARTIAL"
        )

    background_tasks.add_task(execute_pipeline_task, job_id, domain, raw_text)

    return PipelineJobResponse(
        job_id=job.id,
        domain=job.domain,
        status=job.status,
        total_entities=job.total_entities,
        total_relationships=job.total_relationships,
        created_at=job.created_at,
        skipped_files=skipped or None
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
