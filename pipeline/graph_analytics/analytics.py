import logging
import math
import networkx as nx
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, date

logger = logging.getLogger(__name__)


class InvestigationAnalyticsEngine:
    """
    Comprehensive Graph Analytics and Temporal Intelligence Engine.
    Computes Hub Centrality, Time-Decay Edge Weighting, Chronological Event Sequencing,
    Community Partitioning, and Bridge Vulnerabilities.
    """

    def __init__(
        self,
        entities: List[Dict[str, Any]],
        relationships: List[Dict[str, Any]],
        as_of_date: Optional[str] = None,
        decay_half_life_days: float = 180.0
    ):
        self.entities = entities
        self.relationships = relationships
        self.as_of_date = as_of_date
        self.decay_half_life_days = decay_half_life_days
        self.G = nx.Graph()
        self.events: List[Dict[str, Any]] = []

        self._build_networkx_graph()

    def _parse_date(self, date_val: Any) -> Optional[date]:
        if not date_val:
            return None
        if isinstance(date_val, (datetime, date)):
            return date_val if isinstance(date_val, date) else date_val.date()
        try:
            clean_str = str(date_val).split("T")[0].strip()
            return datetime.strptime(clean_str, "%Y-%m-%d").date()
        except Exception:
            return None

    def _build_networkx_graph(self):
        """Constructs NetworkX Graph with time-decay weighted edges."""
        # 1. Add nodes
        for e in self.entities:
            nid = e.get("canonical_id") or e.get("id") or e.get("node_id")
            if nid:
                self.G.add_node(
                    nid,
                    name=e.get("canonical_name") or e.get("name", nid),
                    type=e.get("entity_type") or e.get("type", "PERSON"),
                    domains=e.get("domains", []),
                    timestamp=e.get("timestamp")
                )

        # Base reference date for temporal decay
        ref_date = self._parse_date(self.as_of_date) or datetime.utcnow().date()
        decay_lambda = math.log(2.0) / max(self.decay_half_life_days, 1.0)

        # 2. Add edges with temporal decay weights
        for r in self.relationships:
            u = r.get("source_id") or r.get("source")
            v = r.get("target_id") or r.get("target")

            if not u or not v:
                continue

            # Ensure node existence
            if not self.G.has_node(u):
                self.G.add_node(u, name=u, type="PERSON", domains=[])
            if not self.G.has_node(v):
                self.G.add_node(v, name=v, type="PERSON", domains=[])

            raw_confidence = float(r.get("confidence", 0.90))
            edge_date = self._parse_date(r.get("timestamp") or r.get("valid_from"))

            # Calculate time-decay weight: w(t) = w0 * exp(-lambda * delta_t)
            if edge_date:
                delta_days = max(0, (ref_date - edge_date).days)
                time_decay_factor = math.exp(-decay_lambda * delta_days)
                effective_weight = raw_confidence * time_decay_factor
            else:
                effective_weight = raw_confidence

            self.G.add_edge(
                u,
                v,
                weight=effective_weight,
                raw_confidence=raw_confidence,
                relationship_type=r.get("relationship_type", "ASSOCIATE_OF"),
                domain=r.get("domain", ""),
                timestamp=r.get("timestamp"),
                evidence=r.get("evidence", "")
            )

    def compute_centrality_metrics(self) -> Dict[str, Dict[str, float]]:
        """Computes Degree, Betweenness, Closeness, PageRank, and Combined Hub Scores."""
        if len(self.G) == 0:
            return {}

        deg = dict(self.G.degree(weight="weight"))
        max_deg = max(deg.values()) if deg and max(deg.values()) > 0 else 1.0
        norm_deg = {k: v / max_deg for k, v in deg.items()}

        try:
            bet = nx.betweenness_centrality(self.G, weight="weight", normalized=True)
        except Exception:
            bet = {n: 0.0 for n in self.G.nodes()}

        try:
            close = nx.closeness_centrality(self.G, distance="weight")
        except Exception:
            close = {n: 0.0 for n in self.G.nodes()}

        try:
            pr = nx.pagerank(self.G, weight="weight", alpha=0.85)
        except Exception:
            pr = {n: 1.0 / len(self.G) for n in self.G.nodes()}

        metrics = {}
        for node in self.G.nodes():
            nd = norm_deg.get(node, 0.0)
            bc = bet.get(node, 0.0)
            cc = close.get(node, 0.0)
            p = pr.get(node, 0.0)

            # Combined Master Hub Score formula (weighted ensemble)
            hub_score = (0.35 * nd) + (0.35 * bc) + (0.15 * cc) + (0.15 * p)
            metrics[node] = {
                "degree_centrality": round(nd, 4),
                "betweenness_centrality": round(bc, 4),
                "closeness_centrality": round(cc, 4),
                "pagerank": round(p, 4),
                "combined_hub_score": round(hub_score, 4)
            }

        return metrics

    def get_ranked_key_influencers(self, top_n: int = 10) -> List[Dict[str, Any]]:
        """Returns sorted list of key syndicate influencers and hubs."""
        metrics = self.compute_centrality_metrics()
        ranked = []

        for node_id, m in metrics.items():
            node_data = self.G.nodes.get(node_id, {})
            ranked.append({
                "entity_id": node_id,
                "name": node_data.get("name", node_id),
                "type": node_data.get("type", "PERSON"),
                "domains": node_data.get("domains", []),
                "pagerank_score": m["pagerank"],
                "betweenness_score": m["betweenness_centrality"],
                "combined_hub_score": m["combined_hub_score"],
                "community_cluster": int(node_data.get("community_cluster", 0)),
                "degree": int(self.G.degree(node_id))
            })

        ranked.sort(key=lambda x: x["combined_hub_score"], reverse=True)
        return ranked[:top_n]

    def get_chronological_events(self, domain: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Orders all recorded intelligence events and transactions chronologically.
        Provides timeline evolution for investigative sequence reconstruction.
        """
        timeline = []
        for r in self.relationships:
            if domain and r.get("domain") != domain:
                continue
            ts = r.get("timestamp") or r.get("valid_from")
            if ts:
                src_name = self.G.nodes.get(r.get("source_id"), {}).get("name", r.get("source_id"))
                tgt_name = self.G.nodes.get(r.get("target_id"), {}).get("name", r.get("target_id"))
                timeline.append({
                    "timestamp": ts,
                    "event_type": r.get("relationship_type", "INTERACTION"),
                    "source": src_name,
                    "target": tgt_name,
                    "domain": r.get("domain", "GLOBAL"),
                    "evidence": r.get("evidence", ""),
                    "confidence": r.get("confidence", 0.90)
                })

        timeline.sort(key=lambda x: str(x["timestamp"]))
        return timeline

    def find_bridges_and_vulnerabilities(self) -> List[Dict[str, Any]]:
        """Identifies bridge links and cut-vertices whose removal disrupts syndicate communication."""
        bridges = []
        try:
            for u, v in nx.bridges(self.G):
                bridges.append({
                    "source": u,
                    "target": v,
                    "source_name": self.G.nodes.get(u, {}).get("name", u),
                    "target_name": self.G.nodes.get(v, {}).get("name", v),
                    "vulnerability_type": "CRITICAL_BRIDGE_EDGE"
                })
        except Exception:
            pass
        return bridges


# Aliases for backward compatibility
GraphAnalyticsEngine = InvestigationAnalyticsEngine
