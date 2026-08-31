from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from backend.models.schemas import EntityNode
from backend.services.graph_service import GraphService

router = APIRouter(prefix="/entities", tags=["Entities"])
service = GraphService()

@router.get("", response_model=List[EntityNode])
def search_entities(
    query: Optional[str] = Query(None, description="Search entity by name or alias"),
    domain: Optional[str] = Query(None)
):
    graph = service.get_full_graph(domain_filter=domain)
    nodes = graph["nodes"]
    
    if query:
        q_lower = query.lower()
        nodes = [
            n for n in nodes
            if q_lower in n["canonical_name"].lower()
            or any(q_lower in a.lower() for a in n.get("aliases", []))
        ]
    return nodes

@router.get("/{entity_id}", response_model=EntityNode)
def get_entity_detail(entity_id: str):
    graph = service.get_full_graph()
    for n in graph["nodes"]:
        if n["id"] == entity_id:
            return n
    raise HTTPException(status_code=404, detail=f"Entity with ID '{entity_id}' not found.")
