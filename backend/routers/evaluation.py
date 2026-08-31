from fastapi import APIRouter, HTTPException
from typing import List
from pipeline.config import DOMAINS
from pipeline.evaluation.score_against_ground_truth import evaluate_domain
from backend.models.schemas import EvaluationScoreResponse
from backend.services.graph_service import GraphService

router = APIRouter(prefix="/evaluation", tags=["Evaluation Metrics"])
graph_service = GraphService()

@router.get("", response_model=List[EvaluationScoreResponse])
def get_all_domain_evaluations():
    evals = []
    full_graph = graph_service.get_full_graph()
    entities = full_graph["nodes"]
    edges = full_graph["edges"]

    domain_list = list(DOMAINS.keys()) if isinstance(DOMAINS, dict) else list(DOMAINS)

    for d_key in domain_list:
        d_entities = [e for e in entities if d_key in e.get("domains", [])]
        d_edges = [e for e in edges if e.get("domain") == d_key]
        
        # Convert to match evaluation format
        formatted_entities = [{"canonical_name": e["canonical_name"]} for e in d_entities]
        formatted_edges = [
            {"source_canonical": e["source"], "relationship_type": e["relationship_type"], "target_canonical": e["target"]}
            for e in d_edges
        ]
        
        res = evaluate_domain(d_key, formatted_entities, formatted_edges)
        evals.append(EvaluationScoreResponse(**res))

    return evals

@router.get("/{domain}", response_model=EvaluationScoreResponse)
def get_domain_evaluation(domain: str):
    full_graph = graph_service.get_full_graph(domain_filter=domain)
    d_entities = [{"canonical_name": e["canonical_name"]} for e in full_graph["nodes"]]
    d_edges = [
        {"source_canonical": e["source"], "relationship_type": e["relationship_type"], "target_canonical": e["target"]}
        for e in full_graph["edges"]
    ]
    res = evaluate_domain(domain, d_entities, d_edges)
    return EvaluationScoreResponse(**res)
