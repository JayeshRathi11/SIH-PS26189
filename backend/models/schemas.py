from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

class EntityNode(BaseModel):
    id: str
    canonical_name: str
    type: str
    aliases: List[str] = []
    domains: List[str] = []
    hub_score: Optional[float] = 0.0
    community_cluster: Optional[int] = 0

class RelationshipEdge(BaseModel):
    source: str
    source_id: str
    relationship_type: str
    raw_relationship_type: Optional[str] = ""
    target: str
    target_id: str
    confidence: Optional[float] = 0.9
    domain: str
    evidence: Optional[str] = ""

class GraphDataResponse(BaseModel):
    nodes: List[EntityNode]
    edges: List[RelationshipEdge]
    total_nodes: int
    total_edges: int

class HubInfluencerResponse(BaseModel):
    entity_id: str
    name: str
    type: str
    pagerank_score: float
    betweenness_score: float
    combined_hub_score: float
    community_cluster: int
    degree: int

class DocumentResponse(BaseModel):
    doc_id: str
    doc_type: str
    domain: str
    text: str
    source_file: Optional[str] = ""

class PipelineJobResponse(BaseModel):
    job_id: str
    domain: Optional[str]
    status: str
    total_entities: int
    total_relationships: int
    created_at: datetime
    error_message: Optional[str] = None

class EvaluationScoreResponse(BaseModel):
    domain: str
    entity_precision: float
    entity_recall: float
    entity_f1: float
    relationship_precision: float
    relationship_recall: float
    relationship_f1: float
    ground_truth_matched: bool
