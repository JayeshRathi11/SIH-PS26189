from fastapi import APIRouter, Query
from typing import Optional, List
from backend.models.schemas import GraphDataResponse, HubInfluencerResponse
from backend.services.graph_service import GraphService

router = APIRouter(prefix="/graph", tags=["Graph & Analytics"])
service = GraphService()

@router.get("", response_model=GraphDataResponse)
def get_graph(
    domain: Optional[str] = Query(None, description="Filter graph by domain ID or folder"),
    entity_type: Optional[str] = Query(None, description="Filter nodes by entity type")
):
    return service.get_full_graph(domain_filter=domain, entity_type=entity_type)

@router.get("/centrality", response_model=List[HubInfluencerResponse])
def get_centrality_rankings(
    domain: Optional[str] = Query(None),
    top_n: int = Query(10, ge=1, le=100)
):
    return service.get_key_influencers(domain_filter=domain, top_n=top_n)
