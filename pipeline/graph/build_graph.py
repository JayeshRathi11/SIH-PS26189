import json
import pandas as pd
from pathlib import Path
from typing import Dict, List, Any
from pipeline.config import PROCESSED_DIR, STRUCTURED_DIR
from pipeline.graph.neo4j_client import get_neo4j_client
from pipeline.graph.analytics import GraphAnalyticsEngine

def export_processed_graph_files(entities_dict: Dict[str, Any], relationships: List[Dict[str, Any]]):
    """
    Saves graph output to data/processed/:
    - extracted_entities.csv
    - extracted_relationships.csv
    - entity_resolution_map.json
    """
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Entity resolution map JSON
    res_map_path = PROCESSED_DIR / "entity_resolution_map.json"
    with open(res_map_path, "w", encoding="utf-8") as f:
        json.dump(entities_dict, f, indent=2, ensure_ascii=False)

    # 2. Extracted entities CSV
    entity_rows = []
    for cid, meta in entities_dict.items():
        entity_rows.append({
            "canonical_id": cid,
            "canonical_name": meta["canonical_name"],
            "type": meta["type"],
            "aliases": "|".join(meta.get("aliases", [])),
            "domains": "|".join(meta.get("domains", []))
        })
    df_entities = pd.DataFrame(entity_rows)
    df_entities.to_csv(PROCESSED_DIR / "extracted_entities.csv", index=False)

    # 3. Extracted relationships CSV
    df_rels = pd.DataFrame(relationships)
    df_rels.to_csv(PROCESSED_DIR / "extracted_relationships.csv", index=False)

    print(f"[BuildGraph] Exported {len(entity_rows)} entities & {len(relationships)} relationships to {PROCESSED_DIR}")

def build_graph_and_compute_analytics(entities_dict: Dict[str, Any], relationships: List[Dict[str, Any]]) -> Dict[str, Any]:
    # Export CSV and JSON artifacts
    export_processed_graph_files(entities_dict, relationships)

    # Compute Network Analytics
    entities_list = list(entities_dict.values())
    analytics = GraphAnalyticsEngine(entities_list, relationships)
    top_hubs = analytics.get_ranked_key_influencers(top_n=500)
    hubs_lookup = {h["entity_id"]: h for h in top_hubs}

    # Write computed centrality back onto each entity in place. Without this,
    # hub_score/community_cluster only ever reached Neo4j below (optional, may
    # not be running) and every entity persisted to SQLite via
    # upsert_resolved_graph() kept the flat 0.05 default forever.
    for cid, meta in entities_dict.items():
        h_data = hubs_lookup.get(cid, {})
        meta["hub_score"] = h_data.get("combined_hub_score", 0.05)
        meta["community_cluster"] = h_data.get("community_cluster", 0)

    # Mirror into Neo4j if reachable -- same process-wide singleton the
    # backend uses, so a standalone CLI pipeline run and the live API share
    # the same connection lifecycle logic (connect once, reuse).
    neo4j = get_neo4j_client()
    if neo4j.is_connected:
        # SQLite/Postgres persistence happens separately in run_pipeline.py
        # right after this call -- a Neo4j hiccup here must not take down
        # the batch run or lose the already-computed analytics results.
        try:
            for cid, meta in entities_dict.items():
                h_data = hubs_lookup.get(cid, {})
                neo4j.add_entity_node(
                    cid,
                    meta["canonical_name"],
                    meta["type"],
                    list(meta.get("aliases", [])),
                    list(meta.get("domains", [])),
                    hub_score=h_data.get("combined_hub_score", 0.05),
                    community_cluster=h_data.get("community_cluster", 0),
                    verified_by_officer=meta.get("verified_by_officer", False),
                    status=meta.get("status", "ACTIVE"),
                    phone_numbers=list(meta.get("phone_numbers", []))
                )
            for r in relationships:
                src, tgt = r["source_id"], r["target_id"]
                rel_t = r.get("relationship_type", "ASSOCIATE_OF")
                dom = r.get("domain", "general")
                neo4j.add_relationship_edge(
                    source_id=src,
                    target_id=tgt,
                    rel_type=rel_t,
                    raw_rel_type=r.get("raw_relationship_type", ""),
                    domain=dom,
                    evidence=r.get("evidence", ""),
                    confidence=float(r.get("confidence", 0.9)),
                    verified_by_officer=r.get("verified_by_officer", False),
                    weight_multiplier=r.get("weight_multiplier", 1.0),
                    timestamp=r.get("timestamp", ""),
                    # Same deterministic id scheme as backend/db.py's
                    # upsert_resolved_graph(), so postgres_id in Neo4j always
                    # matches RelationshipRecord.id in Postgres for this edge.
                    postgres_id=f"REL_{src}_{tgt}_{rel_t}_{dom}",
                    status=r.get("status", "ACTIVE")
                )
        except Exception as e:
            print(f"[BuildGraph Warning] Neo4j mirror write failed (SQLite/Postgres persistence is unaffected): {e}")

    return {
        "total_entities": len(entities_dict),
        "total_relationships": len(relationships),
        "top_influencers": top_hubs[:10]
    }
