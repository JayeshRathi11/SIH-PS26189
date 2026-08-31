import sys
from pathlib import Path

# Add project root directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import os
import json
import re
import zipfile
import xml.etree.ElementTree as ET
from typing import List, Dict, Any
import pandas as pd

from pipeline.config import (
    BASE_DIR, DATA_DIR, RAW_TEXT_DIR, GROUND_TRUTH_DIR, 
    STRUCTURED_DIR, PROCESSED_DIR, DOMAINS, EntityType, MasterRelationshipType
)

DELIMITER = "###_DOC_START_###"

DATASET_MAP = {
    "Domain 1": "01_narcotics_trafficking",
    "Domain 2": "02_human_trafficking",
    "Domain 3": "03_cyber_financial_fraud",
    "Domain 4": "04_arms_smuggling",
    "Domain 5": "05_organized_extortion",
    "Domain 6": "06_kidnapping_for_ransom",
    "Domain 7": "07_counterfeit_currency",
    "Domain 8": "08_illegal_betting_hawala",
    "Domain 9": "09_vehicle_theft_ring",
    "Domain 10": "10_land_grabbing_fraud",
}

# Domain 2 Synthetic Documents (Human Trafficking Network)
DOMAIN_2_DOCUMENTS = [
    """DOC_ID: FIR_02_001 | TYPE: FIR | DOMAIN: 02_human_trafficking
Complainant states that Manoj Tiwari, operating under the pretext of overseas employment placement via Sunrise Placement Services, recruited multiple individuals from rural districts. Informant reports indicate Manoj Tiwari reports to a central figure referred to as 'the contact' (I.A. / Iqbal Ansari). Call records show Manoj Tiwari received direct instructions from +91 99870 12345.""",
    """DOC_ID: INT_02_002 | TYPE: CALL_INTERCEPT | DOMAIN: 02_human_trafficking
Intercepted conversation between Manoj Tiwari and the contact. The contact instructed Tiwari to expedite passport documentation through Sunrise Placement Services. Funds of Rs 15 Lakhs were transferred to Tiwari's account for travel arrangements.""",
    """DOC_ID: SURV_02_003 | TYPE: SURVEILLANCE | DOMAIN: 02_human_trafficking
Surveillance team observed Rina Das coordinating with Manoj Tiwari outside Sunrise Placement Services office in Kolkata. Rina Das handed over a batch of transit travel documents. Phone verification confirmed Rina Das also received calls from +91 99870 12345.""",
    """DOC_ID: FIN_02_004 | TYPE: FINANCIAL_TRACE | DOMAIN: 02_human_trafficking
Financial audit of Sunrise Placement Services revealed periodic structured deposits aggregating Rs 45 Lakhs. Major payments were routed onwards to accounts controlled by Iqbal Ansari."""
]

def extract_text_from_docx(docx_path: Path) -> str:
    """Extracts raw text from a docx file without external dependencies."""
    try:
        with zipfile.ZipFile(docx_path) as z:
            tree = ET.fromstring(z.read("word/document.xml"))
            return "".join(tree.itertext())
    except Exception as e:
        print(f"[Docx Extractor Error] Failed to read {docx_path}: {e}")
        return ""

def import_and_prepare_dataset():
    """
    Imports all datasets from DATASET/ into data/raw_text/ and data/ground_truth/
    for all 10 crime domains.
    """
    dataset_root = BASE_DIR / "DATASET"
    
    # 1. Process each domain in DATASET
    for folder_name, domain_key in DATASET_MAP.items():
        domain_raw_dir = RAW_TEXT_DIR / domain_key
        domain_raw_dir.mkdir(parents=True, exist_ok=True)
        combined_file = domain_raw_dir / "combined.txt"

        docs_text = []

        # Check for docx (Domain 1)
        if folder_name == "Domain 1":
            docx_candidates = list(dataset_root.glob("*Domain 1*.docx"))
            if docx_candidates:
                raw_text = extract_text_from_docx(docx_candidates[0])
                blocks = re.split(r'###_?DOC_START_?###', raw_text)
                for b in blocks:
                    b_clean = b.strip()
                    if b_clean and "DOC_ID:" in b_clean:
                        docs_text.append(b_clean)

        # Check for folder in DATASET (Domains 3 to 10)
        domain_dir = dataset_root / folder_name
        if domain_dir.exists() and domain_dir.is_dir():
            for md_file in domain_dir.glob("*.md"):
                content = md_file.read_text(encoding="utf-8")
                blocks = re.split(r'###_?DOC_START_?###', content)
                for b in blocks:
                    b_clean = b.strip()
                    if b_clean and not b_clean.startswith("# SIH189") and not b_clean.startswith("## BATCH"):
                        docs_text.append(b_clean)

            # Copy Ground Truth JSON
            for jf in domain_dir.glob("*.json*"):
                try:
                    gt_target = GROUND_TRUTH_DIR / f"{domain_key}.json"
                    gt_target.write_text(jf.read_text(encoding="utf-8"), encoding="utf-8")
                except Exception as e:
                    print(f"[Warning] Failed to copy ground truth for {domain_key}: {e}")

        # Domain 2 fallback / synthetic
        if domain_key == "02_human_trafficking" and not docs_text:
            docs_text = DOMAIN_2_DOCUMENTS
            # Create synthetic ground truth for Domain 2
            gt_d2 = {
                "entities": [
                    {"canonical_name": "Iqbal Ansari", "type": "PERSON", "aliases_and_mentions": ["the contact", "I.A.", "Iqbal Ansari"]},
                    {"canonical_name": "Manoj Tiwari", "type": "PERSON", "aliases_and_mentions": ["Manoj Tiwari", "Tiwari"]},
                    {"canonical_name": "Rina Das", "type": "PERSON", "aliases_and_mentions": ["Rina Das"]},
                    {"canonical_name": "Sunrise Placement Services", "type": "ORGANIZATION", "aliases_and_mentions": ["Sunrise Placement Services"]},
                    {"canonical_name": "+91 99870 12345", "type": "PHONE_NUMBER", "aliases_and_mentions": ["+91 99870 12345"]}
                ],
                "relationships": [
                    {"from": "Iqbal Ansari", "to": "Sunrise Placement Services", "type": "LEADS_ORGANIZATION"},
                    {"from": "Manoj Tiwari", "to": "Sunrise Placement Services", "type": "MEMBERSHIP_OF"},
                    {"from": "Rina Das", "to": "Sunrise Placement Services", "type": "MEMBERSHIP_OF"},
                    {"from": "Manoj Tiwari", "to": "Iqbal Ansari", "type": "CALLED"}
                ]
            }
            gt_target = GROUND_TRUTH_DIR / "02_human_trafficking.json"
            gt_target.write_text(json.dumps(gt_d2, indent=2), encoding="utf-8")

        # Create Domain 1 ground truth if missing
        if domain_key == "01_narcotics_trafficking":
            gt_d1_target = GROUND_TRUTH_DIR / "01_narcotics_trafficking.json"
            if not gt_d1_target.exists():
                gt_d1 = {
                    "entities": [
                        {"canonical_name": "Iqbal Ansari", "type": "PERSON", "aliases_and_mentions": ["Sethji", "the financier", "Iqbal Ansari"]},
                        {"canonical_name": "Devendra Solanki", "type": "PERSON", "aliases_and_mentions": ["Devendra Solanki", "Bunty"]},
                        {"canonical_name": "Iliyas Khan", "type": "PERSON", "aliases_and_mentions": ["Iliyas Khan", "Khan"]},
                        {"canonical_name": "MH12AB5678", "type": "VEHICLE", "aliases_and_mentions": ["MH12AB5678"]},
                        {"canonical_name": "+91 99870 12345", "type": "PHONE_NUMBER", "aliases_and_mentions": ["+91 99870 12345"]}
                    ],
                    "relationships": [
                        {"from": "Iqbal Ansari", "to": "Devendra Solanki", "type": "INSTRUCTED"},
                        {"from": "Devendra Solanki", "to": "Iliyas Khan", "type": "ASSOCIATE_OF"},
                        {"from": "Devendra Solanki", "to": "Iqbal Ansari", "type": "CALLED"},
                        {"from": "Iliyas Khan", "to": "MH12AB5678", "type": "OWNS_VEHICLE"}
                    ]
                }
                gt_d1_target.write_text(json.dumps(gt_d1, indent=2), encoding="utf-8")

        # Write combined.txt if we found documents
        if docs_text:
            combined_file.write_text("\n\n###_DOC_START_###\n\n".join(docs_text), encoding="utf-8")
            print(f"[Dataset] Ready: {domain_key} with {len(docs_text)} documents.")

    # 2. Seed Master Relationships CSV (Structured CDR & Financial Network)
    STRUCTURED_DIR.mkdir(parents=True, exist_ok=True)
    master_csv = STRUCTURED_DIR / "master_relationships.csv"
    if not master_csv.exists() or master_csv.stat().st_size < 500:
        master_rows = [
            {"source_entity": "Sethji", "source_type": "PERSON", "relationship_type": "INSTRUCTED", "target_entity": "Devendra Solanki", "target_type": "PERSON", "domain": "01_narcotics_trafficking", "phone_number": "+91 99870 12345", "confidence": 0.95},
            {"source_entity": "the contact", "source_type": "PERSON", "relationship_type": "LEADS_ORGANIZATION", "target_entity": "Sunrise Placement Services", "target_type": "ORGANIZATION", "domain": "02_human_trafficking", "phone_number": "+91 99870 12345", "confidence": 0.92},
            {"source_entity": "the director", "source_type": "PERSON", "relationship_type": "FINANCIAL_TRANSACTION_WITH", "target_entity": "IA Digital Ventures Pvt Ltd", "target_type": "ORGANIZATION", "domain": "03_cyber_financial_fraud", "phone_number": "+91 99870 12345", "confidence": 0.94},
            {"source_entity": "the financier", "source_type": "PERSON", "relationship_type": "INSTRUCTED", "target_entity": "Harjeet Singh", "target_type": "PERSON", "domain": "04_arms_smuggling", "phone_number": "+91 99870 12345", "confidence": 0.93},
            {"source_entity": "Bhai", "source_type": "PERSON", "relationship_type": "CALLED", "target_entity": "Rakesh Pawar", "target_type": "PERSON", "domain": "05_organized_extortion", "phone_number": "+91 99870 12345", "confidence": 0.98},
            {"source_entity": "the negotiator", "source_type": "PERSON", "relationship_type": "INSTRUCTED", "target_entity": "Sunil Yadav", "target_type": "PERSON", "domain": "06_kidnapping_for_ransom", "phone_number": "+91 99870 12345", "confidence": 0.91},
            {"source_entity": "the source contact", "source_type": "PERSON", "relationship_type": "ASSOCIATE_OF", "target_entity": "Chopra Fuel & Service Station", "target_type": "ORGANIZATION", "domain": "07_counterfeit_currency", "phone_number": "+91 99870 12345", "confidence": 0.90},
            {"source_entity": "the controller", "source_type": "PERSON", "relationship_type": "FINANCIAL_TRANSACTION_WITH", "target_entity": "Rizwan Ali", "target_type": "PERSON", "domain": "08_illegal_betting_hawala", "phone_number": "+91 99870 12345", "confidence": 0.96},
            {"source_entity": "the buyer", "source_type": "PERSON", "relationship_type": "OWNS_VEHICLE", "target_entity": "KA05MN4321", "target_type": "VEHICLE", "domain": "09_vehicle_theft_ring", "phone_number": "+91 99870 12345", "confidence": 0.92},
            {"source_entity": "the fixer", "source_type": "PERSON", "relationship_type": "LEADS_ORGANIZATION", "target_entity": "Shreeji Construction & Developers", "target_type": "ORGANIZATION", "domain": "10_land_grabbing_fraud", "phone_number": "+91 99870 12345", "confidence": 0.95}
        ]
        df_master = pd.DataFrame(master_rows)
        df_master.to_csv(master_csv, index=False)
        print(f"[Structured Dataset] Seeded {master_csv} with 10 cross-domain hub connections.")


from pipeline.ingestion.sanitizer import sanitize_text, compute_sha256

def parse_raw_document_file(file_path: Path, domain_key: str) -> List[Dict[str, Any]]:
    """
    Parses a batch .txt file containing documents separated by ###_DOC_START_###.
    Applies programmatic sensitive ID redaction and computes SHA-256 evidence hashes.
    Returns list of dicts: {doc_id, doc_type, domain, text, source_file, sha256_hash, redaction_count}
    """
    if not file_path.exists():
        return []

    content = file_path.read_text(encoding="utf-8")
    raw_blocks = re.split(r'###_?DOC_START_?###', content)
    parsed_docs = []

    for block in raw_blocks:
        block = block.strip()
        if not block or block.startswith("# SIH189") or block.startswith("## BATCH"):
            continue

        doc_id = None
        doc_type = "FIR"

        header_match = re.search(r"DOC_ID:\s*([^\s|]+)", block)
        type_match = re.search(r"(?:DOC_)?TYPE:\s*([^\s|\n]+)", block)

        if header_match:
            doc_id = header_match.group(1).strip()
        if type_match:
            doc_type = type_match.group(1).strip()

        if not doc_id:
            doc_id = f"DOC_{domain_key}_{len(parsed_docs)+1:03d}"

        # Apply programmatic redaction for sensitive identifiers
        sanitized_text, red_count = sanitize_text(block)
        doc_hash = compute_sha256(sanitized_text)

        parsed_docs.append({
            "doc_id": doc_id,
            "doc_type": doc_type,
            "domain": domain_key,
            "text": sanitized_text,
            "source_file": file_path.name,
            "sha256_hash": doc_hash,
            "redaction_count": red_count
        })

    return parsed_docs


def parse_all_domains() -> List[Dict[str, Any]]:
    """
    Scans all 10 domain folders in RAW_TEXT_DIR, parses all .txt files,
    and writes out data/processed/parsed_documents.jsonl.
    Also syncs documents to SQLite document_metadata and evidence_ledger.
    """
    # Ensure dataset is prepared
    import_and_prepare_dataset()

    all_docs = []

    for domain_folder in DOMAINS.keys():
        domain_path = RAW_TEXT_DIR / domain_folder
        if not domain_path.exists():
            continue

        for txt_file in domain_path.glob("*.txt"):
            docs = parse_raw_document_file(txt_file, domain_folder)
            all_docs.extend(docs)

    # Output to processed jsonl
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    output_path = PROCESSED_DIR / "parsed_documents.jsonl"
    with open(output_path, "w", encoding="utf-8") as f:
        for doc in all_docs:
            f.write(json.dumps(doc, ensure_ascii=False) + "\n")

    # Persist document metadata & Evidence Ledger to SQLite
    try:
        from backend.db import SessionLocal, DocumentMetadata, EvidenceLedgerRecord, init_db
        init_db()
        db = SessionLocal()
        for doc in all_docs:
            rec_id = f"{doc['domain']}_{doc['doc_id']}"
            existing = db.query(DocumentMetadata).filter(DocumentMetadata.id == rec_id).first()
            if not existing:
                db.add(DocumentMetadata(
                    id=rec_id,
                    doc_id=doc["doc_id"],
                    domain=doc["domain"],
                    doc_type=doc["doc_type"],
                    source_file=doc["source_file"],
                    sha256_hash=doc.get("sha256_hash", ""),
                    parsed_json=doc
                ))
            else:
                existing.parsed_json = doc
                existing.domain = doc["domain"]
                existing.doc_type = doc["doc_type"]
                existing.sha256_hash = doc.get("sha256_hash", "")

            # Sync Evidence Ledger
            ledger_entry = db.query(EvidenceLedgerRecord).filter(
                EvidenceLedgerRecord.doc_id == doc["doc_id"],
                EvidenceLedgerRecord.domain == doc["domain"]
            ).first()
            if not ledger_entry:
                db.add(EvidenceLedgerRecord(
                    doc_id=doc["doc_id"],
                    domain=doc["domain"],
                    sha256_hash=doc.get("sha256_hash", ""),
                    byte_size=len(doc.get("text", "").encode("utf-8")),
                    source_file=doc["source_file"],
                    redaction_count=doc.get("redaction_count", 0)
                ))
            else:
                ledger_entry.sha256_hash = doc.get("sha256_hash", "")
                ledger_entry.byte_size = len(doc.get("text", "").encode("utf-8"))
                ledger_entry.redaction_count = doc.get("redaction_count", 0)

        db.commit()
        db.close()
    except Exception as e:
        print(f"[Warning] Failed to sync document metadata to DB: {e}")

    print(f"[Ingestion] Parsed {len(all_docs)} documents across 10 domains into {output_path}")
    return all_docs


if __name__ == "__main__":
    parse_all_domains()
