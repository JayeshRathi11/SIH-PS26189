import io
import csv
import json
import uuid
import hashlib
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, BackgroundTasks, Depends, Query, HTTPException, UploadFile, File, Form, Request
from sqlalchemy.orm import Session
from backend.models.schemas import PipelineJobResponse, PipelineRunRequest, StructuredImportResponse
from pipeline.extraction.llm_extractor import LLMExtractor
from pipeline.normalization.schema_mapper import normalize_relationship
from pipeline.resolution.entity_resolver import EntityResolver
from pipeline.graph.build_graph import build_graph_and_compute_analytics
from pipeline.ingestion.parse_documents import extract_text_from_docx, extract_text_from_pdf, extract_text_from_image
from pipeline.config import EntityType, MasterRelationshipType
from backend.db import get_db, JobRecord, SessionLocal, User, UserRole
from backend.routers.auth import require_role, get_current_user, log_audit, get_client_ip
from backend.ws_manager import manager
from pipeline.run_pipeline import run_pipeline_end_to_end

router = APIRouter(prefix="/pipeline", tags=["Pipeline Execution"])

from pipeline.resolution.incremental_resolver import ingest_new_case_incrementally

def execute_pipeline_task(job_id: str, domain: str = None, raw_text: str = None,
                           triggered_by_username: str = None, triggered_by_user_id: str = None,
                           triggered_from_ip: str = None):
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
            inc_res = ingest_new_case_incrementally(
                extracted_entities, normalized_triples, case_id=domain,
                triggered_by_username=triggered_by_username, triggered_by_user_id=triggered_by_user_id
            )

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

        # This background task is itself the action the WebSocket event
        # below announces -- the request that triggered it (/pipeline/run
        # or /pipeline/upload) already logged PIPELINE_RUN_TRIGGERED, but
        # completion happens later on this worker thread, outside any
        # request. Without this, a live-synced graph update would have no
        # matching audit entry, breaking the "every action is logged"
        # guarantee for anything that finishes asynchronously.
        log_audit(
            db, action="PIPELINE_COMPLETED", username=triggered_by_username, user_id=triggered_by_user_id,
            resource_type="JOB", resource_id=job_id, ip_address=triggered_from_ip,
            details=f"domain={domain}, total_entities={total_e}, total_relationships={total_r} (broadcast over WebSocket)"
        )
        manager.broadcast(domain, "PIPELINE_COMPLETED", job_id=job_id, total_entities=total_e, total_relationships=total_r)
    except Exception as e:
        job = db.query(JobRecord).filter(JobRecord.id == job_id).first()
        if job:
            job.status = "FAILED"
            job.error_message = str(e)
            db.commit()
        log_audit(
            db, action="PIPELINE_FAILED", username=triggered_by_username, user_id=triggered_by_user_id,
            resource_type="JOB", resource_id=job_id, ip_address=triggered_from_ip,
            details=f"domain={domain}, error={e}", status="FAILED"
        )
        manager.broadcast(domain, "PIPELINE_FAILED", job_id=job_id, error=str(e))
    finally:
        db.close()

@router.post("/run", response_model=PipelineJobResponse)
def trigger_pipeline(
    background_tasks: BackgroundTasks,
    request: Request,
    request_body: Optional[PipelineRunRequest] = None,
    domain: Optional[str] = Query(None, description="Optional domain key to run"),
    current_user: User = Depends(require_role([UserRole.INVESTIGATOR.value, UserRole.OFFICER_IN_CHARGE.value])),
    db: Session = Depends(get_db)
):
    target_domain = (request_body.domain if request_body and request_body.domain else domain)
    raw_text = request_body.raw_text if request_body else None
    client_ip = get_client_ip(request)

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

    # ip_address is what actually distinguishes "the web frontend called
    # this" from "a script/mobile client hit the API directly" (e.g.
    # scripts/direct_upload.py) -- action + resource alone look identical
    # either way, since this route doesn't otherwise care who's calling it.
    log_audit(
        db, action="PIPELINE_RUN_TRIGGERED", username=current_user.username, user_id=current_user.id,
        resource_type="JOB", resource_id=job_id, details=f"domain={target_domain}", ip_address=client_ip
    )

    background_tasks.add_task(
        execute_pipeline_task, job_id, target_domain, raw_text,
        current_user.username, current_user.id, client_ip
    )

    return PipelineJobResponse(
        job_id=job.id,
        domain=job.domain,
        status=job.status,
        total_entities=job.total_entities,
        total_relationships=job.total_relationships,
        created_at=job.created_at
    )

# Extensions this endpoint knows how to turn into raw text. .jpg/.jpeg/.png
# cover both a directly-uploaded scanned photo and a webcam capture (see
# WebcamCaptureModal.jsx, which always produces a .jpg) -- both go through
# the exact same OCR branch below, there's no separate "webcam" code path.
SUPPORTED_UPLOAD_EXTENSIONS = {".txt", ".docx", ".pdf", ".jpg", ".jpeg", ".png"}
IMAGE_UPLOAD_EXTENSIONS = {".jpg", ".jpeg", ".png"}

def _extract_text_from_upload(filename: str, raw_bytes: bytes) -> str:
    """Turn one uploaded file's bytes into plain text, by extension."""
    ext = ("." + filename.rsplit(".", 1)[-1].lower()) if "." in filename else ""
    if ext == ".docx":
        return extract_text_from_docx(io.BytesIO(raw_bytes))
    if ext == ".pdf":
        return extract_text_from_pdf(io.BytesIO(raw_bytes))
    if ext in IMAGE_UPLOAD_EXTENSIONS:
        return extract_text_from_image(raw_bytes)
    # .txt
    try:
        return raw_bytes.decode("utf-8")
    except UnicodeDecodeError:
        return raw_bytes.decode("latin-1")

@router.post("/upload", response_model=PipelineJobResponse)
async def upload_case_document(
    background_tasks: BackgroundTasks,
    request: Request,
    files: List[UploadFile] = File(..., description="One or more FIR / case source documents (.txt, .docx, .pdf, .jpg, .png -- images are run through OCR)"),
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
        file_hash = hashlib.sha256(raw_bytes).hexdigest()
        accepted_files.append((filename, file_hash))

        # Also record this document for the Dossiers/"Primary Evidence
        # Documents" page, which -- unlike everything else in this app --
        # reads from a local parsed_documents.jsonl file rather than the
        # database. Only the original bulk-loaded demo cases ever wrote to
        # it, so live uploads (i.e. every real case used in the demo) showed
        # "No source documents indexed" despite having real extracted data.
        # Wrapped defensively: this is a nice-to-have for the evidence
        # viewer page, never a reason to fail the actual upload/extraction.
        try:
            from pipeline.config import PROCESSED_DIR
            PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
            jsonl_path = PROCESSED_DIR / "parsed_documents.jsonl"
            doc_record = {
                "doc_id": f"LIVE_{uuid.uuid4().hex[:8].upper()}_{filename}",
                "doc_type": ext.lstrip(".").upper() or "DOC",
                "domain": domain,
                "text": text,
                "source_file": filename,
                "sha256_hash": file_hash,
            }
            with open(jsonl_path, "a", encoding="utf-8") as jf:
                jf.write(json.dumps(doc_record, ensure_ascii=False) + "\n")
        except Exception:
            pass

    if not combined_parts:
        detail = "Could not extract any text from the uploaded document(s)."
        if skipped:
            detail += " Issues: " + "; ".join(skipped)
        raise HTTPException(status_code=400, detail=detail)

    raw_text = "\n\n".join(combined_parts)
    client_ip = get_client_ip(request)

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
    # ip_address is recorded too -- same reasoning as /pipeline/run: it's
    # what tells apart the web upload form from a script/mobile client
    # hitting this endpoint directly (e.g. scripts/direct_upload.py).
    for fname, fhash in accepted_files:
        log_audit(
            db, action="DOCUMENT_UPLOADED", username=current_user.username, user_id=current_user.id,
            resource_type="DOCUMENT", resource_id=fname, details=f"domain={domain}, job={job_id}",
            content_hash=fhash, ip_address=client_ip
        )
    if skipped:
        log_audit(
            db, action="DOCUMENT_UPLOAD_SKIPPED", username=current_user.username, user_id=current_user.id,
            resource_type="DOCUMENT", resource_id=job_id, details="; ".join(skipped), status="PARTIAL",
            ip_address=client_ip
        )

    background_tasks.add_task(
        execute_pipeline_task, job_id, domain, raw_text,
        current_user.username, current_user.id, client_ip
    )

    return PipelineJobResponse(
        job_id=job.id,
        domain=job.domain,
        status=job.status,
        total_entities=job.total_entities,
        total_relationships=job.total_relationships,
        created_at=job.created_at,
        skipped_files=skipped or None
    )

STRUCTURED_IMPORT_COLUMNS = {
    "cdr": {"caller", "receiver", "timestamp", "duration"},
    "financial": {"sender_account", "receiver_account", "amount", "date"},
}

def _parse_cdr_row(row: dict, domain: str):
    """Turns one CDR CSV row into (entities, relationship) dicts shaped
    exactly like the LLM extractor's output, so they can go straight into
    ingest_new_case_incrementally() -- same resolution/merge + Postgres/
    Neo4j write path as document-derived entities. Returns None to skip
    a row missing its required caller/receiver values."""
    caller = (row.get("caller") or "").strip()
    receiver = (row.get("receiver") or "").strip()
    timestamp = (row.get("timestamp") or "").strip() or "unknown"
    duration = (row.get("duration") or "").strip() or "unknown"
    if not caller or not receiver:
        return None

    entities = [
        {"name": caller, "type": EntityType.PHONE_NUMBER.value, "aliases": [], "domain": domain},
        {"name": receiver, "type": EntityType.PHONE_NUMBER.value, "aliases": [], "domain": domain},
    ]
    relationship = {
        "source": caller,
        "target": receiver,
        "relationship_type": MasterRelationshipType.CALLED.value,
        "raw_relationship_type": "CDR_IMPORT",
        "confidence": 1.0,
        "domain": domain,
        "evidence": f"CDR import: {caller} called {receiver} at {timestamp}, duration {duration}s",
    }
    return entities, relationship

def _parse_financial_row(row: dict, domain: str):
    """Same idea as _parse_cdr_row() for a financial-transaction CSV row --
    resolves/creates BANK_ACCOUNT entities and a FINANCIAL_TRANSACTION_WITH
    edge with amount/date folded into the evidence text."""
    sender = (row.get("sender_account") or "").strip()
    receiver = (row.get("receiver_account") or "").strip()
    amount = (row.get("amount") or "").strip() or "unknown"
    date = (row.get("date") or "").strip() or "unknown"
    if not sender or not receiver:
        return None

    entities = [
        {"name": sender, "type": EntityType.BANK_ACCOUNT.value, "aliases": [], "domain": domain},
        {"name": receiver, "type": EntityType.BANK_ACCOUNT.value, "aliases": [], "domain": domain},
    ]
    relationship = {
        "source": sender,
        "target": receiver,
        "relationship_type": MasterRelationshipType.FINANCIAL_TRANSACTION_WITH.value,
        "raw_relationship_type": "FINANCIAL_IMPORT",
        "confidence": 1.0,
        "domain": domain,
        "evidence": f"Financial import: {sender} transferred {amount} to {receiver} on {date}",
    }
    return entities, relationship

STRUCTURED_ROW_PARSERS = {
    "cdr": _parse_cdr_row,
    "financial": _parse_financial_row,
}

@router.post("/import-structured", response_model=StructuredImportResponse)
async def import_structured_data(
    request: Request,
    file: UploadFile = File(..., description="CSV file of CDR or financial-transaction records"),
    type: str = Form(..., description="Kind of structured data in the CSV: 'cdr' or 'financial'"),
    domain: str = Form(..., description="Target case/domain key these records belong to"),
    current_user: User = Depends(require_role([UserRole.INVESTIGATOR.value, UserRole.OFFICER_IN_CHARGE.value])),
    db: Session = Depends(get_db)
):
    """
    Structured-data ingestion path for CDR and financial-transaction CSVs --
    separate from the document/OCR pipeline above because this data already
    arrives structured and needs no LLM extraction. Builds entity/relationship
    dicts in the exact shape LLMExtractor produces, then hands them to the
    same ingest_new_case_incrementally() resolver every other ingestion route
    uses, so a phone number or account already known from a prior document
    upload merges into its existing entity instead of duplicating it, and the
    same Postgres + Neo4j write path is used.
    """
    import_type = (type or "").strip().lower()
    if import_type not in STRUCTURED_IMPORT_COLUMNS:
        raise HTTPException(status_code=400, detail=f"type must be one of {sorted(STRUCTURED_IMPORT_COLUMNS)}, got '{type}'")

    raw_bytes = await file.read()
    if not raw_bytes:
        raise HTTPException(status_code=400, detail="Uploaded CSV file is empty.")
    try:
        text = raw_bytes.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = raw_bytes.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text))
    header_fields = {(h or "").strip().lower() for h in (reader.fieldnames or [])}
    required_columns = STRUCTURED_IMPORT_COLUMNS[import_type]
    missing_columns = required_columns - header_fields
    if missing_columns:
        raise HTTPException(
            status_code=400,
            detail=f"CSV is missing required column(s) for type='{import_type}': {sorted(missing_columns)}"
        )

    parse_row = STRUCTURED_ROW_PARSERS[import_type]
    entities: List[dict] = []
    relationships: List[dict] = []
    skipped_rows: List[str] = []

    for i, raw_row in enumerate(reader, start=2):  # row 1 is the header
        row = {(k or "").strip().lower(): (v or "").strip() for k, v in raw_row.items()}
        parsed = parse_row(row, domain)
        if parsed is None:
            skipped_rows.append(f"row {i}: missing required value(s)")
            continue
        row_entities, relationship = parsed
        entities.extend(row_entities)
        relationships.append(relationship)

    if not relationships:
        detail = f"No valid rows found in CSV for type='{import_type}'."
        if skipped_rows:
            detail += " Issues: " + "; ".join(skipped_rows)
        raise HTTPException(status_code=400, detail=detail)

    client_ip = get_client_ip(request)
    file_hash = hashlib.sha256(raw_bytes).hexdigest()

    result = ingest_new_case_incrementally(
        entities, relationships, case_id=domain,
        triggered_by_username=current_user.username, triggered_by_user_id=current_user.id
    )

    log_audit(
        db, action="STRUCTURED_DATA_IMPORTED", username=current_user.username, user_id=current_user.id,
        resource_type="STRUCTURED_IMPORT", resource_id=file.filename or f"{import_type}_import",
        details=(
            f"type={import_type}, domain={domain}, rows_processed={len(relationships)}, "
            f"rows_skipped={len(skipped_rows)}, new_entities={result['new_entities_count']}, "
            f"merged_entities={result['merged_entities_count']}"
        ),
        content_hash=file_hash, ip_address=client_ip
    )

    # Same live-sync event the document-upload path fires on completion, so
    # a Case Board / graph view open on this domain refreshes immediately.
    manager.broadcast(
        domain, "PIPELINE_COMPLETED",
        job_id=f"CSV_{import_type.upper()}_{uuid.uuid4().hex[:8].upper()}",
        total_entities=result["total_entities"], total_relationships=result["total_relationships"]
    )

    return StructuredImportResponse(
        import_type=import_type,
        domain=domain,
        rows_processed=len(relationships),
        rows_skipped=skipped_rows or None,
        total_entities=result["total_entities"],
        total_relationships=result["total_relationships"],
        new_entities_count=result["new_entities_count"],
        merged_entities_count=result["merged_entities_count"],
    )

@router.get("/status/{job_id}", response_model=PipelineJobResponse)
def get_job_status(job_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
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
