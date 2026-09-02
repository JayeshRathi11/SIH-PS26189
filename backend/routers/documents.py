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

@router.get("", response_model=List[DocumentResponse])
def list_documents(
    domain: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    current_user: User = Depends(get_current_user)
):
    docs = load_parsed_docs()
    if domain:
        docs = [d for d in docs if domain in d.get("domain", "")]
    
    paginated_docs = docs[skip:skip + limit]
    return [
        DocumentResponse(
            doc_id=d["doc_id"],
            doc_type=d.get("doc_type", "FIR"),
            domain=d.get("domain", ""),
            text=d.get("text", ""),
            source_file=d.get("source_file", "")
        )
        for d in paginated_docs
    ]

@router.get("/{doc_id}", response_model=DocumentResponse)
def get_document_by_id(doc_id: str, current_user: User = Depends(get_current_user)):
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
