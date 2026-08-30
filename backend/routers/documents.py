import json
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from pipeline.config import PROCESSED_DIR
from backend.models.schemas import DocumentResponse

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

@router.get("", response_model=List[DocumentResponse])
def list_documents(domain: Optional[str] = Query(None)):
    docs = load_parsed_docs()
    if domain:
        docs = [d for d in docs if domain in d.get("domain", "")]
    return [
        DocumentResponse(
            doc_id=d["doc_id"],
            doc_type=d.get("doc_type", "FIR"),
            domain=d.get("domain", ""),
            text=d.get("text", ""),
            source_file=d.get("source_file", "")
        )
        for d in docs
    ]

@router.get("/{doc_id}", response_model=DocumentResponse)
def get_document_by_id(doc_id: str):
    docs = load_parsed_docs()
    for d in docs:
        if d["doc_id"] == doc_id:
            return DocumentResponse(
                doc_id=d["doc_id"],
                doc_type=d.get("doc_type", "FIR"),
                domain=d.get("domain", ""),
                text=d.get("text", ""),
                source_file=d.get("source_file", "")
            )
    raise HTTPException(status_code=404, detail=f"Document with ID '{doc_id}' not found.")
