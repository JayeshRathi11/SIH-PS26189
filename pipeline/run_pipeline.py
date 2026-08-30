import sys
import argparse
import json
from pathlib import Path

# Add project root directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pandas as pd
from typing import List, Dict, Any
from pipeline.config import DOMAINS, RAW_TEXT_DIR, PROCESSED_DIR, STRUCTURED_DIR
from pipeline.ingestion.parse_documents import parse_all_domains, parse_raw_document_file
from pipeline.extraction.llm_extractor import LLMExtractor
from pipeline.normalization.schema_mapper import normalize_relationship, normalize_entity_type
from pipeline.resolution.entity_resolver import EntityResolver
from pipeline.graph.build_graph import build_graph_and_compute_analytics
from pipeline.evaluation.score_against_ground_truth import evaluate_domain

# Sample Synthetic Data Seeder if raw files are empty during initial setup
SAMPLE_DOCUMENTS = {
    "01_narcotics_trafficking": [
        "DOC_ID: FIR_01_001 | TYPE: FIR | DOMAIN: 01_narcotics_trafficking\nConfidential informant reports that Sethji contacted Devendra Solanki alias Bunty regarding a shipment of 50kg illicit narcotics. Bunty coordinated with handler Iliyas Khan near Mumbai port using vehicle MH12AB5678. Call intercept confirms Bunty called Sethji on +91 99870 12345.",
        "DOC_ID: INT_01_002 | TYPE: CALL_INTERCEPT | DOMAIN: 01_narcotics_trafficking\nCall transcript between Sethji and Iliyas Khan. Sethji instructed Iliyas Khan to arrange payment via hawala channel. Iliyas Khan received payment of Rs 25 Lakhs."
    ],
    "05_organized_extortion": [
        "DOC_ID: FIR_05_001 | TYPE: FIR | DOMAIN: 05_organized_extortion\nComplainant states Bhai threatened real estate developer demanding extortion sum. Rakesh Pawar alias Rocky and Salim Sheikh delivered threat letters using vehicle MH04XY2345. Rocky called Bhai on +91 99870 12345."
    ]
}

def seed_sample_raw_files_if_needed():
    """Seeds initial sample text files so pipeline can execute instantly."""
    for domain_folder, docs in SAMPLE_DOCUMENTS.items():
        domain_dir = RAW_TEXT_DIR / domain_folder
        domain_dir.mkdir(parents=True, exist_ok=True)
        combined_file = domain_dir / "combined.txt"
        if not combined_file.exists() or combined_file.stat().st_size == 0:
            content = "\n\n###_DOC_START_###\n\n".join(docs)
            combined_file.write_text(content, encoding="utf-8")
            print(f"[Seed] Created sample document file in {combined_file}")

    # Seed master_relationships.csv if missing
    STRUCTURED_DIR.mkdir(parents=True, exist_ok=True)
    master_csv = STRUCTURED_DIR / "master_relationships.csv"
    if not master_csv.exists():
        df_sample = pd.DataFrame([
            {
                "source_entity": "Sethji", "source_type": "PERSON",
                "relationship_type": "INSTRUCTED", "target_entity": "Devendra Solanki",
                "target_type": "PERSON", "domain": "01_narcotics_trafficking",
                "phone_number": "+91 99870 12345", "confidence": 0.95
            },
            {
                "source_entity": "Bhai", "source_type": "PERSON",
                "relationship_type": "CALLED", "target_entity": "Rakesh Pawar",
                "target_type": "PERSON", "domain": "05_organized_extortion",
                "phone_number": "+91 99870 12345", "confidence": 0.98
            }
        ])
        df_sample.to_csv(master_csv, index=False)

def run_pipeline_end_to_end(domain_filter: str = None) -> Dict[str, Any]:
    print("=" * 60)
    print("  NexusTrace AI Pipeline — Criminal Network Extraction Engine")
    print("=" * 60)

    # Step 0: Ensure sample data seeded
    seed_sample_raw_files_if_needed()

    # Step 1: Ingestion
    print("\n[Stage 1/5] Ingestion: Parsing raw documents...")
    parsed_docs = parse_all_domains()

    if domain_filter:
        parsed_docs = [d for d in parsed_docs if domain_filter in d["domain"]]
        print(f"[Ingestion] Filtered to {len(parsed_docs)} docs for domain filter '{domain_filter}'")

    # Step 2: Extraction
    print("\n[Stage 2/5] Extraction: Extracting Entities & Triples via LLMExtractor...")
    extractor = LLMExtractor()
    raw_triples = []
    
    for doc in parsed_docs:
        extracted = extractor.extract_from_document(doc["text"], doc["doc_id"])
        for r in extracted.get("relationships", []):
            r["domain"] = doc["domain"]
            r["doc_id"] = doc["doc_id"]
            raw_triples.append(r)

    print(f"[Extraction] Extracted {len(raw_triples)} raw relationship triples across documents.")

    # Step 3: Schema Normalization
    print("\n[Stage 3/5] Schema Normalization: Mapping to 7-type Master Schema...")
    normalized_triples = [normalize_relationship(r) for r in raw_triples]

    # Step 4: Entity Resolution
    print("\n[Stage 4/5] Entity Resolution: Merging Aliases & Canonical Identifiers...")
    resolver = EntityResolver()
    resolved_triples = resolver.resolve_batch_triples(normalized_triples)
    resolved_entities_dict = resolver.export_resolution_map()

    # Step 5: Graph Building & Analytics
    print("\n[Stage 5/5] Graph Analytics: Computing PageRank & Community Clusters...")
    graph_results = build_graph_and_compute_analytics(resolved_entities_dict, resolved_triples)

    # Evaluation Scoring
    evaluation_scores = {}
    target_domains = [domain_filter] if domain_filter else list(DOMAINS.keys())
    for d_key in target_domains:
        d_entities = [e for e in resolved_entities_dict.values() if d_key in e.get("domains", [])]
        d_rels = [r for r in resolved_triples if r.get("domain") == d_key]
        evaluation_scores[d_key] = evaluate_domain(d_key, d_entities, d_rels)

    print("\n" + "=" * 60)
    print("  Pipeline Execution Complete!")
    print(f"  Total Resolved Entities: {graph_results['total_entities']}")
    print(f"  Total Resolved Relationships: {graph_results['total_relationships']}")
    print("\n  Top Key Influencer Hubs Detected:")
    for hub in graph_results["top_influencers"]:
        print(f"   - {hub['name']} ({hub['type']}) | Combined Hub Score: {hub['combined_hub_score']} | Cluster: {hub['community_cluster']}")
    print("=" * 60)

    return {
        "graph_summary": graph_results,
        "evaluations": evaluation_scores
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run NexusTrace NLP & Graph Analysis Pipeline")
    parser.add_argument("--domain", type=str, help="Specific domain key (e.g. 01_narcotics_trafficking)")
    args = parser.parse_args()

    run_pipeline_end_to_end(domain_filter=args.domain)
