from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from backend.services.graph_service import GraphService
from pipeline.graph.pattern_detector import SuspiciousPatternDetector
from backend.routers.auth import get_current_user, require_role, User, UserRole

router = APIRouter(prefix="/patterns", tags=["Suspicious Pattern Detection"])
graph_service = GraphService()

class PatternAlertResponse(BaseModel):
    pattern_id: str
    pattern_type: str
    title: str
    risk_level: str
    risk_score: float
    description: str
    target_entity: Optional[str] = None
    target_name: Optional[str] = None
    involved_domains: List[str] = []
    subgraph_nodes: List[str] = []
    subgraph_edges: List[Dict[str, Any]] = []

@router.get("/suspicious", response_model=List[PatternAlertResponse])
def get_suspicious_patterns(domain: Optional[str] = None):
    """
    Scans the live network for complex crime patterns:
    - Cross-Domain Syndicate Hubs
    - Circular Hawala / Mule Layering Loops
    - Burner SIM Fleet Fast-Switching
    - Trafficking Corridors
    """
    entity_map = graph_service._load_entity_map()
    relationships = graph_service._load_relationships()

    if domain:
        entity_map = {k: v for k, v in entity_map.items() if domain in v.get("domains", [])}
        relationships = [r for r in relationships if r.get("domain") == domain]

    detector = SuspiciousPatternDetector(list(entity_map.values()), relationships)
    alerts = detector.detect_all_patterns()

    return alerts

@router.get("/suspicious/{pattern_id}", response_model=PatternAlertResponse)
def get_pattern_by_id(pattern_id: str):
    entity_map = graph_service._load_entity_map()
    relationships = graph_service._load_relationships()
    detector = SuspiciousPatternDetector(list(entity_map.values()), relationships)
    alerts = detector.detect_all_patterns()

    for a in alerts:
        if a["pattern_id"] == pattern_id:
            return a

    raise HTTPException(status_code=404, detail=f"Pattern alert '{pattern_id}' not found.")
