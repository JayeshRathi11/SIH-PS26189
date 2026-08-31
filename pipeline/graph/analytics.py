import math
from datetime import datetime
import networkx as nx
from typing import Dict, List, Any, Optional

LAMBDA_DECAY = 0.005 # Temporal decay factor (days^-1)

class GraphAnalyticsEngine:
    """
    Graph Analytics Engine computing PageRank Centrality, Betweenness Centrality,
    Temporal Weight Decay, Officer Verification Re-tuning, and Louvain Community Detection.
    """
    def __init__(self, entities: List[Dict[str, Any]], relationships: List[Dict[str, Any]], as_of_date: Optional[str] = None):
        self.entities = entities
        self.relationships = relationships
        self.as_of_date = self._parse_date(as_of_date) if as_of_date else datetime.utcnow()
        self.G = nx.Graph()
        self._build_networkx_graph()

    def _parse_date(self, date_str: str) -> datetime:
        try:
            return datetime.strptime(date_str, "%Y-%m-%d")
        except Exception:
            return datetime.utcnow()

    def _calculate_edge_weight(self, rel: Dict[str, Any]) -> float:
        # Check if rejected by investigator feedback
        if rel.get("status") == "REJECTED":
            return 0.01

        confidence = float(rel.get("confidence", 0.9))
        weight_multiplier = float(rel.get("weight_multiplier", 1.0))
        
        # Base weight boosted if verified by officer
        if rel.get("verified_by_officer"):
            confidence = 1.0
            weight_multiplier = max(weight_multiplier, 1.2)

        base_weight = confidence * weight_multiplier

        # Apply exponential temporal decay if timestamp exists
        rel_time_str = rel.get("timestamp")
        if rel_time_str:
            try:
                rel_dt = self._parse_date(rel_time_str)
                delta_days = max(0, (self.as_of_date - rel_dt).days)
                decay_factor = math.exp(-LAMBDA_DECAY * delta_days)
                return max(0.05, base_weight * decay_factor)
            except Exception:
                pass

        return max(0.05, base_weight)

    def _build_networkx_graph(self):
        for e in self.entities:
            eid = e.get("canonical_id", e.get("id"))
            if not eid:
                continue
            self.G.add_node(
                eid,
                name=e.get("canonical_name", eid),
                type=e.get("type", "UNKNOWN"),
                domains=e.get("domains", []),
                verified_by_officer=e.get("verified_by_officer", False),
                status=e.get("status", "ACTIVE")
            )

        for r in self.relationships:
            src = str(r.get("source_id", ""))
            tgt = str(r.get("target_id", ""))
            if src and tgt and self.G.has_node(src) and self.G.has_node(tgt):
                weight = self._calculate_edge_weight(r)
                self.G.add_edge(
                    src, tgt,
                    weight=weight,
                    rel_type=r.get("relationship_type", "ASSOCIATE_OF"),
                    raw_type=r.get("raw_relationship_type", ""),
                    domain=r.get("domain", ""),
                    verified_by_officer=r.get("verified_by_officer", False),
                    status=r.get("status", "ACTIVE")
                )

    def compute_pagerank(self) -> Dict[str, float]:
        if len(self.G) == 0:
            return {}
        try:
            return nx.pagerank(self.G, alpha=0.85, weight="weight")
        except Exception:
            return {node: 1.0 / len(self.G) for node in self.G.nodes()}

    def compute_betweenness_centrality(self) -> Dict[str, float]:
        if len(self.G) == 0:
            return {}
        try:
            return nx.betweenness_centrality(self.G, weight="weight")
        except Exception:
            return {node: 0.0 for node in self.G.nodes()}

    def detect_communities(self) -> Dict[str, int]:
        """Runs Louvain community detection or greedy modularity communities."""
        if len(self.G) == 0:
            return {}
        try:
            communities = nx.community.greedy_modularity_communities(self.G, weight="weight")
            community_map = {}
            for cluster_id, node_set in enumerate(communities):
                for node in node_set:
                    community_map[node] = cluster_id
            return community_map
        except Exception:
            return {node: 0 for node in self.G.nodes()}

    def get_ranked_key_influencers(self, top_n: int = 10) -> List[Dict[str, Any]]:
        pagerank = self.compute_pagerank()
        betweenness = self.compute_betweenness_centrality()
        communities = self.detect_communities()

        ranked = []
        for node_id in self.G.nodes():
            node_data = self.G.nodes[node_id]
            pr_score = pagerank.get(node_id, 0.0)
            bt_score = betweenness.get(node_id, 0.0)
            
            # Combined hub score formula: 60% PageRank + 40% Betweenness
            combined_score = (pr_score * 0.6) + (bt_score * 0.4)
            
            ranked.append({
                "entity_id": node_id,
                "name": node_data.get("name", node_id),
                "type": node_data.get("type", "PERSON"),
                "pagerank_score": round(pr_score, 4),
                "betweenness_score": round(bt_score, 4),
                "combined_hub_score": round(combined_score, 4),
                "community_cluster": communities.get(node_id, 0),
                "degree": self.G.degree(node_id),
                "verified_by_officer": node_data.get("verified_by_officer", False),
                "status": node_data.get("status", "ACTIVE")
            })

        ranked.sort(key=lambda x: x["combined_hub_score"], reverse=True)
        return ranked[:top_n]
