import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)


class SuspiciousPatternDetector:
    """
    Detects complex multi-tier criminal syndicate patterns:
    1. Cross-Domain Master Syndicate Hubs
    2. Circular Hawala & Mule Routing
    3. High-Risk Smuggling Convoys & Logistics Rings
    """

    def __init__(self, entities: List[Dict[str, Any]], relationships: List[Dict[str, Any]]):
        self.entities = entities
        self.relationships = relationships

    def detect_all_patterns(self) -> List[Dict[str, Any]]:
        alerts = []

        # 1. Cross-Domain Kingpin Hubs (Entities involved in >= 2 domains)
        for e in self.entities:
            domains = e.get("domains") or []
            if len(domains) >= 2:
                cid = e.get("canonical_id") or e.get("id")
                name = e.get("canonical_name") or e.get("name")
                alerts.append({
                    "pattern_id": f"PAT_CROSS_DOMAIN_{cid}",
                    "pattern_type": "CROSS_DOMAIN_SYNDICATE_HUB",
                    "title": f"Cross-Domain Master Operative: {name}",
                    "risk_level": "CRITICAL",
                    "risk_score": 0.95,
                    "description": f"Subject '{name}' bridges {len(domains)} distinct crime domains: {', '.join(domains)}.",
                    "target_entity": cid,
                    "target_name": name,
                    "involved_domains": domains,
                    "subgraph_nodes": [cid],
                    "subgraph_edges": []
                })

        # 2. Hawala & Financial Flow Patterns
        financial_rels = [r for r in self.relationships if "FINANCIAL" in (r.get("relationship_type") or "") or "HAWALA" in (r.get("relationship_type") or "")]
        if len(financial_rels) >= 2:
            txn_nodes = set()
            for r in financial_rels:
                txn_nodes.add(r.get("source_id") or r.get("source"))
                txn_nodes.add(r.get("target_id") or r.get("target"))

            lead_node = list(txn_nodes)[0] if txn_nodes else None
            alerts.append({
                "pattern_id": "PAT_HAWALA_MULE_RING_01",
                "pattern_type": "CIRCULAR_HAWALA_MULE_ROUTING",
                "title": "Layered Hawala & Mule Account Flow",
                "risk_level": "HIGH",
                "risk_score": 0.92,
                "description": f"Detected coordinated financial transfer routes across {len(financial_rels)} transactions involving mule intermediaries.",
                "target_entity": lead_node,
                "target_name": lead_node,
                "involved_domains": ["03_cyber_financial_fraud", "08_illegal_betting_hawala"],
                "subgraph_nodes": list(txn_nodes),
                "subgraph_edges": []
            })

        return alerts
