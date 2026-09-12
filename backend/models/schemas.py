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
    # Persisted investigator feedback (see POST /graph/feedback). Without
    # these declared here, FastAPI's response_model silently drops them
    # from the JSON even though GraphService.get_full_graph() puts them on
    # every node -- the confirm/reject state was being written to the DB
    # correctly but never actually reaching the frontend on a fresh
    # /graph fetch, only surviving in-session via local React state.
    verified_by_officer: Optional[bool] = False
    status: Optional[str] = "ACTIVE"

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
    # Same persisted-feedback gap as EntityNode above, for edges.
    verified_by_officer: Optional[bool] = False
    status: Optional[str] = "ACTIVE"

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
    # Written into parsed_documents.jsonl at upload time (see
    # accepted_files/doc_record in backend/routers/pipeline.py's
    # upload_case_document()) but never read back out by documents.py's
    # handlers below -- DetailPanel.jsx and DossiersPage.jsx both already
    # conditionally render a "SHA: ..." line keyed on doc.sha256_hash, so
    # it's been silently absent from every document card, not just unused.
    sha256_hash: Optional[str] = None

class PipelineRunRequest(BaseModel):
    raw_text: Optional[str] = Field(None, description="Raw text document input for live extraction")
    domain: Optional[str] = Field(None, description="Target domain key")

class PipelineJobResponse(BaseModel):
    job_id: str
    domain: Optional[str]
    status: str
    total_entities: int
    total_relationships: int
    created_at: datetime
    error_message: Optional[str] = None
    skipped_files: Optional[List[str]] = None

class EvaluationScoreResponse(BaseModel):
    domain: str
    entity_precision: float
    entity_recall: float
    entity_f1: float
    relationship_precision: float
    relationship_recall: float
    relationship_f1: float
    ground_truth_matched: bool
