import json
import pandas as pd
from pathlib import Path
from typing import Dict, List, Any
from pipeline.config import PROCESSED_DIR, STRUCTURED_DIR
from pipeline.graph.analytics import GraphAnalyticsEngine

class GraphService:
    """
    Service layer providing graph queries, subgraphs, search, and centrality rankings.
    """
    def __init__(self):
        self.processed_dir = PROCESSED_DIR

    def _load_entity_map(self) -> Dict[str, Any]:
        res_file = self.processed_dir / "entity_resolution_map.json"
        if res_file.exists():
            with open(res_file, "r", encoding="utf-8") as f:
                return json.load(f)
        return {}

    def _load_relationships(self) -> List[Dict[str, Any]]:
        rel_csv = self.processed_dir / "extracted_relationships.csv"
        if rel_csv.exists():
            df = pd.read_csv(rel_csv)
            return df.to_dict(orient="records")
        return []

    def get_full_graph(self, domain_filter: str = None, entity_type: str = None) -> Dict[str, Any]:
        entity_map = self._load_entity_map()
        relationships = self._load_relationships()

        # Compute graph analytics to get hub scores & clusters
        analytics = GraphAnalyticsEngine(list(entity_map.values()), relationships)
        hubs = {h["entity_id"]: h for h in analytics.get_ranked_key_influencers(top_n=500)}

        nodes = []
        for cid, meta in entity_map.items():
            if domain_filter and domain_filter not in meta.get("domains", []):
                continue
            if entity_type and entity_type.lower() != meta.get("type", "").lower():
                continue
            
            hub_meta = hubs.get(cid, {})
            nodes.append({
                "id": cid,
                "canonical_name": meta["canonical_name"],
                "type": meta["type"],
                "aliases": meta.get("aliases", []),
                "domains": meta.get("domains", []),
                "hub_score": hub_meta.get("combined_hub_score", 0.05),
                "community_cluster": hub_meta.get("community_cluster", 0)
            })

        edges = []
        valid_node_ids = set(n["id"] for n in nodes)
        for r in relationships:
            src = str(r.get("source_id", ""))
            tgt = str(r.get("target_id", ""))
            r_domain = str(r.get("domain", ""))

            if domain_filter and domain_filter != r_domain:
                continue

            if src in valid_node_ids and tgt in valid_node_ids:
                edges.append({
                    "source": r.get("source_canonical", src),
                    "source_id": src,
                    "relationship_type": r.get("relationship_type", "ASSOCIATE_OF"),
                    "raw_relationship_type": r.get("raw_relationship_type", ""),
                    "target": r.get("target_canonical", tgt),
                    "target_id": tgt,
                    "confidence": float(r.get("confidence", 0.9)),
                    "domain": r_domain,
                    "evidence": str(r.get("evidence", ""))
                })

        return {
            "nodes": nodes,
            "edges": edges,
            "total_nodes": len(nodes),
            "total_edges": len(edges)
        }

    def get_key_influencers(self, domain_filter: str = None, top_n: int = 10) -> List[Dict[str, Any]]:
        entity_map = self._load_entity_map()
        relationships = self._load_relationships()
        analytics = GraphAnalyticsEngine(list(entity_map.values()), relationships)
        hubs = analytics.get_ranked_key_influencers(top_n=top_n)
        return hubs
