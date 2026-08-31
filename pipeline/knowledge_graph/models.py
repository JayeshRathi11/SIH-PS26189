from dataclasses import dataclass, field, asdict
from typing import Dict, Any, List, Optional
from datetime import datetime
from pipeline.config import EntityType, MasterRelationshipType


@dataclass
class KGNode:
    """
    Knowledge Graph Node supporting all 10 POLE Entity Types with normalized timestamps.
    """
    node_id: str
    canonical_name: str
    entity_type: str  # One of EntityType values
    domains: List[str] = field(default_factory=list)
    aliases: List[str] = field(default_factory=list)
    properties: Dict[str, Any] = field(default_factory=dict)
    first_seen: Optional[str] = None
    last_seen: Optional[str] = None
    timestamp: Optional[str] = None
    hub_score: float = 0.0
    community_cluster: int = 0
    verified_by_officer: bool = False
    status: str = "ACTIVE"
    source_document_id: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        if not d.get("timestamp"):
            d["timestamp"] = self.first_seen or datetime.utcnow().isoformat() + "Z"
        return d


@dataclass
class KGEdge:
    """
    Knowledge Graph Edge supporting normalized timestamps and digital provenance.
    """
    edge_id: str
    source_id: str
    target_id: str
    relationship_type: str
    raw_relationship_type: Optional[str] = None
    domain: Optional[str] = None
    confidence: float = 0.90
    timestamp: Optional[str] = None
    valid_from: Optional[str] = None
    valid_to: Optional[str] = None
    evidence_text: Optional[str] = None
    source_document_id: Optional[str] = None
    verified_by_officer: bool = False
    status: str = "ACTIVE"
    properties: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        if not d.get("timestamp"):
            d["timestamp"] = self.valid_from or datetime.utcnow().isoformat() + "Z"
        return d


@dataclass
class KnowledgeGraph:
    """Complete 10-Node POLE Knowledge Graph with digital custody."""
    nodes: Dict[str, KGNode] = field(default_factory=dict)
    edges: Dict[str, KGEdge] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def add_node(self, node: KGNode) -> None:
        self.nodes[node.node_id] = node

    def add_edge(self, edge: KGEdge) -> None:
        self.edges[edge.edge_id] = edge

    def to_dict(self) -> Dict[str, Any]:
        return {
            "total_nodes": len(self.nodes),
            "total_edges": len(self.edges),
            "nodes": [n.to_dict() for n in self.nodes.values()],
            "edges": [e.to_dict() for e in self.edges.values()],
            "metadata": self.metadata
        }
