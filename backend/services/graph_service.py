import json
import networkx as nx
import pandas as pd
from pathlib import Path
from typing import Dict, List, Any, Optional
from pipeline.config import PROCESSED_DIR, STRUCTURED_DIR
from pipeline.graph.analytics import GraphAnalyticsEngine
from pipeline.graph.neo4j_client import Neo4jClient

class GraphService:
    """
    Service layer providing graph queries, subgraphs, search, temporal decay filtering,
    centrality rankings, and explainable AI shortest path reasoning.
    """
    def __init__(self):
        self.processed_dir = PROCESSED_DIR

    def _load_entity_map(self) -> Dict[str, Any]:
        try:
            from backend.db import SessionLocal, EntityRecord
            db = SessionLocal()
            records = db.query(EntityRecord).all()
            if records:
                res = {}
                for r in records:
                    res[r.id] = {
                        "canonical_id": r.id,
                        "canonical_name": r.canonical_name,
                        "type": r.type,
                        "aliases": r.aliases or [],
                        "domains": r.domains or [],
                        "phone_numbers": r.phone_numbers or [],
                        "hub_score": r.hub_score or 0.05,
                        "community_cluster": r.community_cluster or 0,
                        "verified_by_officer": getattr(r, "verified_by_officer", False),
                        "status": getattr(r, "status", "ACTIVE")
                    }
                db.close()
                return res
            db.close()
        except Exception as e:
            print(f"[GraphService Warning] DB entity read error: {e}")

        res_file = self.processed_dir / "entity_resolution_map.json"
        if res_file.exists():
            with open(res_file, "r", encoding="utf-8") as f:
                return json.load(f)
        return {}

    def _load_relationships(self) -> List[Dict[str, Any]]:
        try:
            from backend.db import SessionLocal, RelationshipRecord
            db = SessionLocal()
            records = db.query(RelationshipRecord).all()
            if records:
                rels = []
                for r in records:
                    rels.append({
                        "id": r.id,
                        "source_id": r.source_id,
                        "source_canonical": r.source_canonical,
                        "relationship_type": r.relationship_type,
                        "raw_relationship_type": r.raw_relationship_type,
                        "target_id": r.target_id,
                        "target_canonical": r.target_canonical,
                        "confidence": r.confidence,
                        "domain": r.domain,
                        "evidence": r.evidence,
                        "timestamp": getattr(r, "timestamp", ""),
                        "verified_by_officer": getattr(r, "verified_by_officer", False),
                        "weight_multiplier": getattr(r, "weight_multiplier", 1.0),
                        "status": getattr(r, "status", "ACTIVE")
                    })
                db.close()
                return rels
            db.close()
        except Exception as e:
            print(f"[GraphService Warning] DB relationship read error: {e}")

        rel_csv = self.processed_dir / "extracted_relationships.csv"
        if rel_csv.exists():
            df = pd.read_csv(rel_csv)
            return df.to_dict(orient="records")
        return []

    def get_full_graph(self, domain_filter: str = None, entity_type: str = None, as_of_date: Optional[str] = None, include_rejected: bool = False) -> Dict[str, Any]:
        entity_map = self._load_entity_map()
        relationships = self._load_relationships()

        # Compute graph analytics with temporal decay & officer verification weights
        analytics = GraphAnalyticsEngine(list(entity_map.values()), relationships, as_of_date=as_of_date)
        hubs = {h["entity_id"]: h for h in analytics.get_ranked_key_influencers(top_n=500)}

        nodes = []
        for cid, meta in entity_map.items():
            if not include_rejected and meta.get("status") == "REJECTED":
                continue
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
                "community_cluster": hub_meta.get("community_cluster", 0),
                "verified_by_officer": meta.get("verified_by_officer", False),
                "status": meta.get("status", "ACTIVE")
            })

        edges = []
        valid_node_ids = set(n["id"] for n in nodes)
        for r in relationships:
            if not include_rejected and r.get("status") == "REJECTED":
                continue

            src = str(r.get("source_id", ""))
            tgt = str(r.get("target_id", ""))
            r_domain = str(r.get("domain", ""))

            if domain_filter and domain_filter != r_domain:
                continue

            if src in valid_node_ids and tgt in valid_node_ids:
                edges.append({
                    "id": r.get("id", f"REL_{src}_{tgt}"),
                    "source": r.get("source_canonical", src),
                    "source_id": src,
                    "relationship_type": r.get("relationship_type", "ASSOCIATE_OF"),
                    "raw_relationship_type": r.get("raw_relationship_type", ""),
                    "target": r.get("target_canonical", tgt),
                    "target_id": tgt,
                    "confidence": float(r.get("confidence", 0.9)),
                    "domain": r_domain,
                    "evidence": str(r.get("evidence", "")),
                    "timestamp": r.get("timestamp", ""),
                    "verified_by_officer": r.get("verified_by_officer", False),
                    "weight_multiplier": float(r.get("weight_multiplier", 1.0)),
                    "status": r.get("status", "ACTIVE")
                })

        return {
            "nodes": nodes,
            "edges": edges,
            "total_nodes": len(nodes),
            "total_edges": len(edges),
            "as_of_date": as_of_date
        }

    def get_key_influencers(self, domain_filter: str = None, top_n: int = 10, as_of_date: Optional[str] = None) -> List[Dict[str, Any]]:
        entity_map = self._load_entity_map()
        relationships = self._load_relationships()
        analytics = GraphAnalyticsEngine(list(entity_map.values()), relationships, as_of_date=as_of_date)
        hubs = analytics.get_ranked_key_influencers(top_n=top_n)
        return hubs

    def get_timeline_events(self, domain_filter: str = None, include_rejected: bool = False) -> List[Dict[str, Any]]:
        """
        Chronological feed of every recorded interaction for the Timeline page.
        There is no separate "events" table -- every relationship record already
        carries a timestamp, both parties' names, and the evidence behind it, so
        the timeline is just that same data re-shaped and sorted by time.
        """
        relationships = self._load_relationships()
        events = []
        for r in relationships:
            if not include_rejected and r.get("status") == "REJECTED":
                continue
            if domain_filter and r.get("domain") != domain_filter:
                continue
            events.append({
                "event_type": r.get("relationship_type", "ASSOCIATE_OF"),
                "source": r.get("source_canonical") or r.get("source_id", ""),
                "target": r.get("target_canonical") or r.get("target_id", ""),
                "evidence": r.get("evidence", ""),
                "domain": r.get("domain", ""),
                "timestamp": r.get("timestamp") or "",
                "confidence": r.get("confidence", 0.9),
                "verified_by_officer": r.get("verified_by_officer", False),
            })

        events.sort(key=lambda e: e["timestamp"] or "")
        return events

    def explain_path(self, source_id: str, target_id: str, max_depth: int = 4) -> Dict[str, Any]:
        """
        Explainable AI (XAI) Pathfinding:
        Computes shortest paths between two subjects and constructs step-by-step textual reasoning
        linking entities via verbatim evidence quotes and domain context.
        """
        entity_map = self._load_entity_map()
        relationships = self._load_relationships()

        # Build NetworkX graph
        G = nx.Graph()
        for cid, meta in entity_map.items():
            G.add_node(cid, name=meta.get("canonical_name", cid), type=meta.get("type", "PERSON"))

        for r in relationships:
            src = str(r.get("source_id", ""))
            tgt = str(r.get("target_id", ""))
            if src and tgt and G.has_node(src) and G.has_node(tgt):
                G.add_edge(
                    src, tgt,
                    rel_type=r.get("relationship_type", "ASSOCIATE_OF"),
                    domain=r.get("domain", "general"),
                    evidence=r.get("evidence", ""),
                    confidence=r.get("confidence", 0.9)
                )

        # Normalize source & target if names were passed instead of IDs
        s_id = source_id
        t_id = target_id
        for cid, meta in entity_map.items():
            if meta.get("canonical_name", "").lower() == source_id.lower():
                s_id = cid
            if meta.get("canonical_name", "").lower() == target_id.lower():
                t_id = cid

        if not G.has_node(s_id) or not G.has_node(t_id):
            return {
                "source": source_id,
                "target": target_id,
                "path_found": False,
                "message": f"One or both entities ('{source_id}', '{target_id}') not found in graph."
            }

        try:
            paths = list(nx.all_shortest_paths(G, source=s_id, target=t_id))
        except nx.NetworkXNoPath:
            return {
                "source": entity_map.get(s_id, {}).get("canonical_name", s_id),
                "target": entity_map.get(t_id, {}).get("canonical_name", t_id),
                "path_found": False,
                "message": "No direct or indirect chain connecting these two subjects within known intelligence."
            }

        detailed_paths = []
        for path_nodes in paths[:5]:
            steps = []
            reasoning_sentences = []
            
            for i in range(len(path_nodes) - 1):
                u = path_nodes[i]
                v = path_nodes[i+1]
                edge_data = G.get_edge_data(u, v) or {}
                
                u_name = entity_map.get(u, {}).get("canonical_name", u)
                v_name = entity_map.get(v, {}).get("canonical_name", v)
                rel_t = edge_data.get("rel_type", "ASSOCIATE_OF")
                dom = edge_data.get("domain", "").replace("_", " ").title()
                ev = edge_data.get("evidence", "Recorded association")
                
                step_obj = {
                    "from_id": u,
                    "from_name": u_name,
                    "to_id": v,
                    "to_name": v_name,
                    "relationship_type": rel_t,
                    "domain": dom,
                    "evidence": ev,
                    "confidence": edge_data.get("confidence", 0.9)
                }
                steps.append(step_obj)
                
                reasoning_sentences.append(
                    f"Step {i+1}: '{u_name}' is connected to '{v_name}' via [{rel_t}] in domain ({dom}). Evidence: \"{ev}\""
                )

            detailed_paths.append({
                "hops": len(path_nodes) - 1,
                "nodes": [entity_map.get(n, {}).get("canonical_name", n) for n in path_nodes],
                "steps": steps,
                "narrative_explanation": " ➔ ".join(reasoning_sentences)
            })

        s_name = entity_map.get(s_id, {}).get("canonical_name", s_id)
        t_name = entity_map.get(t_id, {}).get("canonical_name", t_id)

        return {
            "source": s_name,
            "target": t_name,
            "path_found": True,
            "total_shortest_paths": len(paths),
            "shortest_distance_hops": len(paths[0]) - 1 if paths else 0,
            "summary_conclusion": (
                f"Definitive intelligence chain established between '{s_name}' and '{t_name}' "
                f"across {len(paths[0]) - 1} operational hop(s). "
                f"Primary intermediate hub: '{detailed_paths[0]['nodes'][1] if len(detailed_paths[0]['nodes']) > 2 else 'Direct Link'}'."
            ),
            "paths": detailed_paths
        }
