import sys
import argparse
import json
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

# Add project root directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pandas as pd
from typing import List, Dict, Any
from pipeline.config import DOMAINS, RAW_TEXT_DIR, PROCESSED_DIR, STRUCTURED_DIR
from pipeline.ingestion.parse_documents import parse_all_domains, parse_raw_document_file, import_and_prepare_dataset
from pipeline.extraction.llm_extractor import LLMExtractor
from pipeline.normalization.schema_mapper import normalize_relationship, normalize_entity_type
from pipeline.resolution.entity_resolver import EntityResolver
from pipeline.graph.build_graph import build_graph_and_compute_analytics
from pipeline.evaluation.score_against_ground_truth import evaluate_domain
from backend.db import SessionLocal, init_db, upsert_resolved_graph

def run_pipeline_end_to_end(domain_filter: str = None) -> Dict[str, Any]:
    print("=" * 65, flush=True)
    print("  NexusTrace AI Pipeline — Cross-Domain Criminal Network Engine", flush=True)
    print("=" * 65, flush=True)

    # Step 0: Ensure all datasets and ground truths prepared
    import_and_prepare_dataset()

    # Step 1: Ingestion
    print("\n[Stage 1/5] Ingestion: Scanning and parsing documents across 10 domains...", flush=True)
    parsed_docs = parse_all_domains()

    if domain_filter:
        parsed_docs = [d for d in parsed_docs if domain_filter in d["domain"]]
        print(f"[Ingestion] Filtered to {len(parsed_docs)} docs for domain filter '{domain_filter}'", flush=True)

    # Step 2: Extraction (Multi-threaded)
    print(f"\n[Stage 2/5] Extraction: Extracting Entities & Triples for {len(parsed_docs)} documents...", flush=True)
    extractor = LLMExtractor()
    raw_triples = []
    
    def process_doc(doc):
        extracted = extractor.extract_from_document(doc["text"], doc["doc_id"])
        doc_triples = []
        for r in extracted.get("relationships", []):
            r["domain"] = doc["domain"]
            r["doc_id"] = doc["doc_id"]
            doc_triples.append(r)
        return doc_triples

    with ThreadPoolExecutor(max_workers=6) as executor:
        futures = {executor.submit(process_doc, doc): doc for doc in parsed_docs}
        completed = 0
        for future in as_completed(futures):
            completed += 1
            if completed % 25 == 0 or completed == len(parsed_docs):
                print(f"   - Processed {completed}/{len(parsed_docs)} documents...", flush=True)
            try:
                triples = future.result()
                raw_triples.extend(triples)
            except Exception as e:
                print(f"   [Error processing document]: {e}", flush=True)

    # Ingest structured CDR/financial dataset if available
    master_csv = STRUCTURED_DIR / "master_relationships.csv"
    if master_csv.exists():
        try:
            df_struct = pd.read_csv(master_csv)
            for _, row in df_struct.iterrows():
                raw_triples.append({
                    "source": str(row.get("source_entity", "")),
                    "source_type": str(row.get("source_type", "PERSON")),
                    "relationship_type": str(row.get("relationship_type", "ASSOCIATE_OF")),
                    "target": str(row.get("target_entity", "")),
                    "target_type": str(row.get("target_type", "PERSON")),
                    "confidence": float(row.get("confidence", 0.95)),
                    "domain": str(row.get("domain", "general")),
                    "evidence": f"Structured CDR/Financial record connecting {row.get('source_entity')} with {row.get('target_entity')} on phone {row.get('phone_number', '')}"
                })
            print(f"[Extraction] Ingested {len(df_struct)} structured cross-domain relationships from CSV.", flush=True)
        except Exception as e:
            print(f"[Extraction Warning] Could not load master_relationships.csv: {e}", flush=True)

    print(f"[Extraction] Total raw relationship triples extracted: {len(raw_triples)}", flush=True)

    # Step 3: Schema Normalization
    print("\n[Stage 3/5] Schema Normalization: Mapping to 7-type Master Schema...", flush=True)
    normalized_triples = [normalize_relationship(r) for r in raw_triples]

    # Step 4: Entity Resolution
    print("\n[Stage 4/5] Entity Resolution: Cross-Domain Alias Merging & Identifier Linking...", flush=True)
    resolver = EntityResolver()
    
    # Pre-seed from existing SQLite database
    init_db()
    db = SessionLocal()
    resolver.load_existing_from_db(db)

    resolved_triples = resolver.resolve_batch_triples(normalized_triples)
    resolved_entities_dict = resolver.export_resolution_map()

    # Step 5: Graph Building, Neo4j & SQLite Persistence, and Analytics
    print("\n[Stage 5/5] Graph Storage & Analytics: Upserting to Neo4j + SQLite & computing PageRank/Clusters...", flush=True)
    graph_results = build_graph_and_compute_analytics(resolved_entities_dict, resolved_triples)

    # Persist to SQLite
    upsert_resolved_graph(db, resolved_entities_dict, resolved_triples)
    db.close()

    # Evaluation Scoring
    evaluation_scores = {}
    target_domains = [domain_filter] if domain_filter else list(DOMAINS.keys())
    print("\n" + "-" * 65, flush=True)
    print("  Ground-Truth Evaluation Benchmark:", flush=True)
    print("-" * 65, flush=True)
    for d_key in target_domains:
        d_entities = [e for e in resolved_entities_dict.values() if d_key in e.get("domains", [])]
        d_rels = [r for r in resolved_triples if r.get("domain") == d_key]
        ev = evaluate_domain(d_key, d_entities, d_rels)
        evaluation_scores[d_key] = ev
        print(f"  [{d_key[:25]:<25}] Ent F1: {ev['entity_f1']:.2f} | Rel F1: {ev['relationship_f1']:.2f} | GT Matched: {ev['ground_truth_matched']}", flush=True)

    print("\n" + "=" * 65, flush=True)
    print("  Pipeline Execution Complete!", flush=True)
    print(f"  Total Resolved Entities:      {graph_results['total_entities']}", flush=True)
    print(f"  Total Resolved Relationships: {graph_results['total_relationships']}", flush=True)
    print("\n  Top Key Influencers Detected (Cross-Domain Hubs):", flush=True)
    for rank, hub in enumerate(graph_results["top_influencers"][:5], 1):
        print(f"   {rank}. {hub['name']} ({hub['type']}) | Hub Score: {hub['combined_hub_score']} | Cluster: {hub['community_cluster']}", flush=True)
    print("=" * 65, flush=True)

    return {
        "graph_summary": graph_results,
        "evaluations": evaluation_scores
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run NexusTrace NLP & Graph Analysis Pipeline")
    parser.add_argument("--domain", type=str, help="Specific domain key (e.g. 01_narcotics_trafficking)")
    args = parser.parse_args()

    run_pipeline_end_to_end(domain_filter=args.domain)
