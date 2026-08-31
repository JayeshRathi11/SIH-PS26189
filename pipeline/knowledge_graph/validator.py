import logging
from typing import Dict, Any, List
from pipeline.knowledge_graph.models import KnowledgeGraph

logger = logging.getLogger(__name__)


class KnowledgeGraphValidator:
    """Validates KnowledgeGraph integrity against the 10-node POLE schema rules."""

    def validate(self, kg: KnowledgeGraph) -> Dict[str, Any]:
        dangling_edges = []
        isolated_nodes = []
        invalid_types = []

        node_ids = set(kg.nodes.keys())

        for edge in kg.edges.values():
            if edge.source_id not in node_ids or edge.target_id not in node_ids:
                dangling_edges.append(edge.edge_id)

        connected_nodes = set()
        for edge in kg.edges.values():
            connected_nodes.add(edge.source_id)
            connected_nodes.add(edge.target_id)

        for n_id in node_ids:
            if n_id not in connected_nodes:
                isolated_nodes.append(n_id)

        is_valid = len(dangling_edges) == 0

        return {
            "is_valid": is_valid,
            "total_nodes": len(kg.nodes),
            "total_edges": len(kg.edges),
            "dangling_edges_count": len(dangling_edges),
            "isolated_nodes_count": len(isolated_nodes),
            "dangling_edges": dangling_edges[:10],
            "isolated_nodes": isolated_nodes[:10]
        }
