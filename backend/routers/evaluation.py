from fastapi import APIRouter, HTTPException, Depends
from typing import List
from pipeline.config import DOMAINS
from pipeline.evaluation.score_against_ground_truth import evaluate_domain
from backend.models.schemas import EvaluationScoreResponse
from backend.services.graph_service import GraphService
from backend.routers.auth import get_current_user, User

router = APIRouter(prefix="/evaluation", tags=["Evaluation Metrics"])
graph_service = GraphService()

def _no_ground_truth_response(domain: str) -> EvaluationScoreResponse:
    return EvaluationScoreResponse(
        domain=domain,
        ground_truth_matched=False,
        message=(
            f"No ground truth available for domain '{domain}' -- this case wasn't part of "
            "the pre-seeded demo dataset, so extraction quality can't be scored against an answer key."
        ),
    )


@router.get("", response_model=List[EvaluationScoreResponse])
def get_all_domain_evaluations(current_user: User = Depends(get_current_user)):
    evals = []
    full_graph = graph_service.get_full_graph()
    entities = full_graph["nodes"]
    edges = full_graph["edges"]

    for d_key in DOMAINS.keys():
        d_entities = [e for e in entities if d_key in e.get("domains", [])]
        d_edges = [e for e in edges if e.get("domain") == d_key]

        # Convert to match evaluation format
        formatted_entities = [{"canonical_name": e["canonical_name"]} for e in d_entities]
        formatted_edges = [
            {"source_canonical": e["source"], "relationship_type": e["relationship_type"], "target_canonical": e["target"]}
            for e in d_edges
        ]

        try:
            res = evaluate_domain(d_key, formatted_entities, formatted_edges)
            evals.append(EvaluationScoreResponse(**res))
        except (FileNotFoundError, ValueError):
            evals.append(_no_ground_truth_response(d_key))

    return evals

@router.get("/{domain}", response_model=EvaluationScoreResponse)
def get_domain_evaluation(domain: str, current_user: User = Depends(get_current_user)):
    full_graph = graph_service.get_full_graph(domain_filter=domain)
    d_entities = [{"canonical_name": e["canonical_name"]} for e in full_graph["nodes"]]
    d_edges = [
        {"source_canonical": e["source"], "relationship_type": e["relationship_type"], "target_canonical": e["target"]}
        for e in full_graph["edges"]
    ]
    # No ground-truth file exists for any domain outside the 10 pre-seeded
    # demo cases (evaluate_domain() raises FileNotFoundError for those, or
    # ValueError if a ground truth file exists but fails to parse) -- every
    # case created through the real "+ Add New Case" workflow hits this,
    # so it must produce a clean "not scorable" response, not a 500.
    try:
        res = evaluate_domain(domain, d_entities, d_edges)
        return EvaluationScoreResponse(**res)
    except (FileNotFoundError, ValueError):
        return _no_ground_truth_response(domain)
