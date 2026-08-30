import os
import json
import re
from pathlib import Path
from typing import List, Dict, Any
from pipeline.config import RAW_TEXT_DIR, PROCESSED_DIR, DOMAINS

DELIMITER = "###_DOC_START_###"

def parse_raw_document_file(file_path: Path, domain_key: str) -> List[Dict[str, Any]]:
    """
    Parses a batch .txt file containing documents separated by ###_DOC_START_###.
    Returns list of dicts: {doc_id, doc_type, domain, text, source_file}
    """
    if not file_path.exists():
        return []

    content = file_path.read_text(encoding="utf-8")
    raw_blocks = content.split(DELIMITER)
    parsed_docs = []

    for block in raw_blocks:
        block = block.strip()
        if not block:
            continue
        
        # Parse document metadata header if present
        # e.g.: DOC_ID: FIR_01_001 | TYPE: FIR | DOMAIN: 01_narcotics_trafficking
        doc_id = None
        doc_type = "UNKNOWN"
        
        header_match = re.search(r"DOC_ID:\s*([^\s|]+)", block)
        type_match = re.search(r"TYPE:\s*([^\s|\n]+)", block)
        
        if header_match:
            doc_id = header_match.group(1).strip()
        if type_match:
            doc_type = type_match.group(1).strip()
            
        if not doc_id:
            # Fallback doc_id generation from index / content preview
            doc_id = f"DOC_{domain_key}_{len(parsed_docs)+1:03d}"

        parsed_docs.append({
            "doc_id": doc_id,
            "doc_type": doc_type,
            "domain": domain_key,
            "text": block,
            "source_file": file_path.name
        })

    return parsed_docs

def parse_all_domains() -> List[Dict[str, Any]]:
    """
    Scans all 10 domain folders in RAW_TEXT_DIR, parses all .txt files,
    and writes out data/processed/parsed_documents.jsonl.
    """
    all_docs = []
    
    for domain_folder, domain_meta in DOMAINS.items():
        domain_path = RAW_TEXT_DIR / domain_folder
        if not domain_path.exists():
            domain_path.mkdir(parents=True, exist_ok=True)
            continue
            
        for txt_file in domain_path.glob("*.txt"):
            docs = parse_raw_document_file(txt_file, domain_folder)
            all_docs.extend(docs)
            
    # Output to processed jsonl
    output_path = PROCESSED_DIR / "parsed_documents.jsonl"
    with open(output_path, "w", encoding="utf-8") as f:
        for doc in all_docs:
            f.write(json.dumps(doc, ensure_ascii=False) + "\n")
            
    print(f"[Ingestion] Parsed {len(all_docs)} documents across domains into {output_path}")
    return all_docs

if __name__ == "__main__":
    parse_all_domains()
