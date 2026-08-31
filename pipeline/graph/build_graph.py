import logging
from typing import List, Dict, Any, Tuple
from pipeline.knowledge_graph.builder import KnowledgeGraphBuilder
from pipeline.graph_analytics.analytics import InvestigationAnalyticsEngine

logger = logging.getLogger(__name__)


def build_graph_and_compute_analytics(
    canonical_entities: List[Dict[str, Any]],
    relationships: List[Dict[str, Any]],
    documents: List[Dict[str, Any]] = None,
    as_of_date: str = None
) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
    """
    Builds the 10-node POLE Knowledge Graph and computes graph centrality & temporal analytics.
    """
    builder = KnowledgeGraphBuilder()
    kg = builder.build_graph(canonical_entities, relationships, documents=documents)

    analytics = InvestigationAnalyticsEngine(
        [n.to_dict() for n in kg.nodes.values()],
        [e.to_dict() for e in kg.edges.values()],
        as_of_date=as_of_date
    )

    metrics = analytics.compute_centrality_metrics()
    for n_id, m in metrics.items():
        if n_id in kg.nodes:
            kg.nodes[n_id].hub_score = m["combined_hub_score"]

    ranked_influencers = analytics.get_ranked_key_influencers(top_n=10)
    return kg.to_dict(), ranked_influencers
