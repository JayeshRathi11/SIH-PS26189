import json
from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Optional
from pipeline.config import PROCESSED_DIR
from backend.models.schemas import DocumentResponse
from backend.routers.auth import get_current_user, User

router = APIRouter(prefix="/documents", tags=["Documents"])

def load_parsed_docs() -> List[dict]:
    jsonl_path = PROCESSED_DIR / "parsed_documents.jsonl"
    if not jsonl_path.exists():
        return []
    docs = []
    with open(jsonl_path, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                docs.append(json.loads(line))
    return docs

def load_all_documents() -> List[dict]:
    """
    Postgres (DocumentMetadata) is the durable, primary source -- both the
    original batch-loaded domains (synced by parse_all_domains()) and live
    uploads (synced by upload_case_document() in backend/routers/
    pipeline.py) persist there. The local JSONL is merged in only as a
    fallback for whatever it has that Postgres doesn't (e.g. a document
    synced before DocumentMetadata was written for live uploads), keyed by
    domain+doc_id since doc_id alone isn't guaranteed unique across
    domains -- so nothing already on disk is silently dropped by
    preferring Postgres.
    """
    docs_by_key: dict = {}
    try:
        from backend.db import SessionLocal, DocumentMetadata
        db = SessionLocal()
        try:
            for rec in db.query(DocumentMetadata).all():
                if rec.parsed_json:
                    docs_by_key[rec.id] = rec.parsed_json
        finally:
            db.close()
    except Exception as e:
        print(f"[Documents Warning] Failed to load DocumentMetadata from DB: {e}")

    for doc in load_parsed_docs():
        key = f"{doc.get('domain', '')}_{doc.get('doc_id', '')}"
        docs_by_key.setdefault(key, doc)

    return list(docs_by_key.values())

@router.get("", response_model=List[DocumentResponse])
def list_documents(domain: Optional[str] = Query(None), current_user: User = Depends(get_current_user)):
    docs = load_all_documents()
    if domain:
        docs = [d for d in docs if domain in d.get("domain", "")]
    return [
        DocumentResponse(
            doc_id=d["doc_id"],
            doc_type=d.get("doc_type", "FIR"),
            domain=d.get("domain", ""),
            text=d.get("text", ""),
            source_file=d.get("source_file", ""),
            sha256_hash=d.get("sha256_hash")
        )
        for d in docs
    ]

@router.get("/{doc_id}", response_model=DocumentResponse)
def get_document_by_id(doc_id: str, current_user: User = Depends(get_current_user)):
    docs = load_all_documents()
    for d in docs:
        if d["doc_id"] == doc_id:
            return DocumentResponse(
                doc_id=d["doc_id"],
                doc_type=d.get("doc_type", "FIR"),
                domain=d.get("domain", ""),
                text=d.get("text", ""),
                source_file=d.get("source_file", ""),
                sha256_hash=d.get("sha256_hash")
            )
    raise HTTPException(status_code=404, detail=f"Document with ID '{doc_id}' not found.")
