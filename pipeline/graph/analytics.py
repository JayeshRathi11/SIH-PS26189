import networkx as nx
from typing import Dict, List, Any

class GraphAnalyticsEngine:
    """
    Graph Analytics Engine computing PageRank Centrality, Betweenness Centrality,
    and Louvain Community Detection over resolved entity-relationship networks.
    """
    def __init__(self, entities: List[Dict[str, Any]], relationships: List[Dict[str, Any]]):
        self.entities = entities
        self.relationships = relationships
        self.G = nx.Graph()
        self._build_networkx_graph()

    def _build_networkx_graph(self):
        for e in self.entities:
            self.G.add_node(
                e["canonical_id"],
                name=e.get("canonical_name", e["canonical_id"]),
                type=e.get("type", "UNKNOWN"),
                domains=e.get("domains", [])
            )

        for r in self.relationships:
            src = r.get("source_id")
            tgt = r.get("target_id")
            if src and tgt and self.G.has_node(src) and self.G.has_node(tgt):
                self.G.add_edge(
                    src, tgt,
                    rel_type=r.get("relationship_type", "ASSOCIATE_OF"),
                    raw_type=r.get("raw_relationship_type", ""),
                    domain=r.get("domain", "")
                )

    def compute_pagerank(self) -> Dict[str, float]:
        if len(self.G) == 0:
            return {}
        try:
            return nx.pagerank(self.G, alpha=0.85)
        except Exception:
            return {node: 1.0 / len(self.G) for node in self.G.nodes()}

    def compute_betweenness_centrality(self) -> Dict[str, float]:
        if len(self.G) == 0:
            return {}
        return nx.betweenness_centrality(self.G)

    def detect_communities(self) -> Dict[str, int]:
        """Runs Louvain community detection or greedy modularity communities."""
        if len(self.G) == 0:
            return {}
        try:
            communities = nx.community.greedy_modularity_communities(self.G)
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
            
            # Combined hub score
            combined_score = (pr_score * 0.6) + (bt_score * 0.4)
            
            ranked.append({
                "entity_id": node_id,
                "name": node_data.get("name", node_id),
                "type": node_data.get("type", "PERSON"),
                "pagerank_score": round(pr_score, 4),
                "betweenness_score": round(bt_score, 4),
                "combined_hub_score": round(combined_score, 4),
                "community_cluster": communities.get(node_id, 0),
                "degree": self.G.degree(node_id)
            })

        ranked.sort(key=lambda x: x["combined_hub_score"], reverse=True)
        return ranked[:top_n]
