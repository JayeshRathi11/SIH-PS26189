from fastapi import APIRouter, Query, HTTPException, Depends
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from backend.models.schemas import GraphDataResponse, HubInfluencerResponse
from backend.services.graph_service import GraphService
from backend.routers.auth import get_current_user, User
from pipeline.graph.neo4j_client import get_neo4j_client

router = APIRouter(prefix="/graph", tags=["Graph & Analytics"])
service = GraphService()

class PathExplanationResponse(BaseModel):
    source: str
    target: str
    path_found: bool
    total_shortest_paths: Optional[int] = 0
    shortest_distance_hops: Optional[int] = 0
    summary_conclusion: Optional[str] = None
    paths: Optional[List[Dict[str, Any]]] = []
    message: Optional[str] = None

class MultiHopEntity(BaseModel):
    id: str
    postgres_id: Optional[str] = None
    name: Optional[str] = None
    type: Optional[str] = None
    domains: Optional[List[str]] = []
    status: Optional[str] = None
    hops: int

class MultiHopResponse(BaseModel):
    source_entity: str
    max_hops: int
    total_found: int
    entities: List[MultiHopEntity]

@router.get("", response_model=GraphDataResponse)
def get_graph(
    domain: Optional[str] = Query(None, description="Filter graph by domain ID or folder"),
    entity_type: Optional[str] = Query(None, description="Filter nodes by entity type"),
    as_of_date: Optional[str] = Query(None, description="Filter/decay graph interactions as of date (YYYY-MM-DD)"),
    include_rejected: bool = Query(False, description="Include edges rejected by investigator feedback"),
    current_user: User = Depends(get_current_user)
):
    """
    Fetches knowledge graph nodes and edges.
    Supports dynamic temporal filtering, domain filtering, entity type filtering,
    and automatic edge-weight decay calculations.
    """
    return service.get_full_graph(
        domain_filter=domain,
        entity_type=entity_type,
        as_of_date=as_of_date,
        include_rejected=include_rejected
    )

@router.get("/centrality", response_model=List[HubInfluencerResponse])
def get_centrality_rankings(
    domain: Optional[str] = Query(None),
    top_n: int = Query(10, ge=1, le=100),
    as_of_date: Optional[str] = Query(None, description="Compute centrality as of date (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user)
):
    """
    Returns key syndicate influencer hubs ranked by combined PageRank & Betweenness Centrality.
    """
    return service.get_key_influencers(domain_filter=domain, top_n=top_n, as_of_date=as_of_date)

@router.get("/timeline")
def get_timeline_events(
    domain: Optional[str] = Query(None, description="Filter events by domain ID or folder"),
    include_rejected: bool = Query(False, description="Include events rejected by investigator feedback"),
    current_user: User = Depends(get_current_user)
):
    """
    Chronological feed of recorded interactions for the Timeline page,
    built from the same relationship records the graph and Pathfinder draw on.
    """
    return service.get_timeline_events(domain_filter=domain, include_rejected=include_rejected)

@router.get("/explain", response_model=PathExplanationResponse)
def explain_shortest_path(
    source_id: str = Query(..., description="Canonical ID or name of source entity"),
    target_id: str = Query(..., description="Canonical ID or name of target entity"),
    max_depth: int = Query(4, ge=1, le=8, description="Maximum search hops"),
    current_user: User = Depends(get_current_user)
):
    """
    Explainable AI (XAI) Pathfinding:
    Discovers all shortest paths linking two entities and provides step-by-step
    natural language evidentiary reasoning citing intercepted documents.
    """
    result = service.explain_path(source_id=source_id, target_id=target_id, max_depth=max_depth)
    return result

@router.get("/expand/{entity_id}", response_model=MultiHopResponse)
def expand_entity_neighborhood(
    entity_id: str,
    hops: int = Query(2, ge=1, le=6, description="Maximum number of hops to traverse from the source entity"),
    current_user: User = Depends(get_current_user)
):
    """
    Multi-hop network expansion: every entity reachable from `entity_id`
    within `hops` hops, over any relationship type in either direction,
    with the shortest hop-distance at which each was reached. Answered
    directly with a Cypher variable-length path query against Neo4j --
    the kind of query that's straightforward there and awkward/expensive
    to express by rebuilding a NetworkX graph from scratch per request.

    Requires Neo4j to be reachable (this is a new, Neo4j-native capability,
    not one with a NetworkX fallback) -- returns 503 if it isn't.
    """
    neo4j = get_neo4j_client()
    if not neo4j.is_connected:
        raise HTTPException(
            status_code=503,
            detail="Neo4j is not reachable -- multi-hop expansion requires the graph engine to be up."
        )
    try:
        results = neo4j.find_entities_within_hops(entity_id, max_hops=hops)
    except Exception as e:
        # is_connected only reflects whether connect() succeeded at some
        # point in the past, not live socket health -- a driver that was up
        # at startup and later drops still passes that check, so the actual
        # query can still fail. Surface that as the same clean 503 rather
        # than a raw 500.
        raise HTTPException(status_code=503, detail=f"Neo4j query failed: {e}")
    return MultiHopResponse(
        source_entity=entity_id,
        max_hops=hops,
        total_found=len(results),
        entities=results
    )
