import os
from pathlib import Path
from typing import Dict, Any
from pipeline.config import RAW_TEXT_DIR, DOMAINS
from pipeline.ingestion.parse_documents import parse_raw_document_file

def validate_domain_batch(domain_key: str) -> Dict[str, Any]:
    """
    Validates documents in a domain folder against quality criteria.
    """
    domain_path = RAW_TEXT_DIR / domain_key
    txt_files = list(domain_path.glob("*.txt")) if domain_path.exists() else []
    
    total_docs = 0
    issues = []
    
    for f in txt_files:
        docs = parse_raw_document_file(f, domain_key)
        total_docs += len(docs)
        for doc in docs:
            if not doc.get("text"):
                issues.append(f"Empty document body in {doc['doc_id']}")
            if len(doc.get("text", "")) < 30:
                issues.append(f"Suspiciously short document text (<30 chars) in {doc['doc_id']}")

    return {
        "domain": domain_key,
        "files_found": len(txt_files),
        "total_docs": total_docs,
        "valid": len(issues) == 0,
        "issues": issues
    }

def validate_all_batches() -> Dict[str, Any]:
    results = {}
    for d in DOMAINS.keys():
        results[d] = validate_domain_batch(d)
    return results

if __name__ == "__main__":
    res = validate_all_batches()
    for domain, status in res.items():
        print(f"[{domain}] Files: {status['files_found']}, Docs: {status['total_docs']}, Valid: {status['valid']}")
