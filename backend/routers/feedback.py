from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.db import get_db, InvestigatorFeedback, EntityRecord, RelationshipRecord, UserRole, User
from fastapi import Request
from backend.routers.auth import get_current_user, require_role, log_audit, get_client_ip
from backend.ws_manager import manager
from pipeline.graph.neo4j_client import get_neo4j_client

router = APIRouter(prefix="/graph", tags=["Human-in-the-Loop Feedback"])

class FeedbackRequest(BaseModel):
    target_type: str # ENTITY or RELATIONSHIP
    target_id: Optional[str] = None
    source_id: Optional[str] = None
    relationship_type: Optional[str] = None
    verdict: str # CONFIRMED, REJECTED, UNCERTAIN
    officer_notes: Optional[str] = ""

class FeedbackResponse(BaseModel):
    feedback_id: str
    target_type: str
    target_id: str
    verdict: str
    officer_username: str
    status_updated: str
    message: str

@router.post("/feedback", response_model=FeedbackResponse)
def submit_feedback(
    fb_req: FeedbackRequest,
    request: Request,
    current_user: User = Depends(require_role([UserRole.INVESTIGATOR.value, UserRole.OFFICER_IN_CHARGE.value])),
    db: Session = Depends(get_db)
):
    """
    Submits human investigator feedback on an entity node or relationship edge.
    - CONFIRMED: sets confidence = 1.0, verified_by_officer = True, boosts analytics weight.
    - REJECTED: sets penalty weight (0.05) or hides link, updates SQLite & Neo4j.
    - UNCERTAIN: flags for further corroboration.
    """
    # Reuses the single app-wide driver connected at startup (backend/main.py)
    # instead of opening a fresh connection on every request -- see
    # pipeline/graph/neo4j_client.py's singleton for why that mattered.
    neo4j = get_neo4j_client()

    updated_status = "ACTIVE"
    target_identifier = fb_req.target_id or f"{fb_req.source_id}->{fb_req.target_id}"
    entity = None
    rel = None

    if fb_req.target_type.upper() == "ENTITY":
        entity = db.query(EntityRecord).filter(EntityRecord.id == fb_req.target_id).first()
        if not entity:
            # Fallback search by canonical_name
            entity = db.query(EntityRecord).filter(EntityRecord.canonical_name == fb_req.target_id).first()
        
        if entity:
            if fb_req.verdict.upper() == "CONFIRMED":
                entity.verified_by_officer = True
                entity.status = "ACTIVE"
                updated_status = "CONFIRMED"
            elif fb_req.verdict.upper() == "REJECTED":
                entity.status = "REJECTED"
                entity.verified_by_officer = False
                updated_status = "REJECTED"
            else:
                entity.status = "FLAGGED"
                updated_status = "UNCERTAIN"
            target_identifier = entity.id
            # Postgres (below) is the authoritative write; a Neo4j hiccup
            # here must never block or fail the investigator's confirm/
            # reject action.
            try:
                neo4j.update_entity_feedback(entity.id, entity.verified_by_officer, entity.status)
            except Exception as e:
                print(f"[Feedback Warning] Neo4j entity sync failed (Postgres write is unaffected): {e}")

    elif fb_req.target_type.upper() == "RELATIONSHIP":
        # Match by relationship id or source/target
        rel = None
        if fb_req.target_id:
            rel = db.query(RelationshipRecord).filter(RelationshipRecord.id == fb_req.target_id).first()
        if not rel and fb_req.source_id and fb_req.target_id:
            query = db.query(RelationshipRecord).filter(
                RelationshipRecord.source_id == fb_req.source_id,
                RelationshipRecord.target_id == fb_req.target_id
            )
            if fb_req.relationship_type:
                query = query.filter(RelationshipRecord.relationship_type == fb_req.relationship_type)
            rel = query.first()

        if rel:
            target_identifier = rel.id
            if fb_req.verdict.upper() == "CONFIRMED":
                rel.verified_by_officer = True
                rel.confidence = 1.0
                rel.weight_multiplier = 1.2
                rel.status = "ACTIVE"
                updated_status = "CONFIRMED"
                edge_sync_args = (rel.source_id, rel.target_id, rel.relationship_type, True, 1.2, "ACTIVE")
            elif fb_req.verdict.upper() == "REJECTED":
                rel.status = "REJECTED"
                rel.verified_by_officer = False
                rel.weight_multiplier = 0.05
                updated_status = "REJECTED"
                edge_sync_args = (rel.source_id, rel.target_id, rel.relationship_type, False, 0.05, "REJECTED")
            else:
                rel.weight_multiplier = 0.8
                rel.status = "ACTIVE"
                updated_status = "UNCERTAIN"
                edge_sync_args = (rel.source_id, rel.target_id, rel.relationship_type, False, 0.8, "ACTIVE")

            # Postgres (above) is the authoritative write; a Neo4j hiccup
            # here must never block or fail the investigator's confirm/
            # reject action.
            try:
                neo4j.update_edge_feedback(*edge_sync_args)
            except Exception as e:
                print(f"[Feedback Warning] Neo4j edge sync failed (Postgres write is unaffected): {e}")

    # Record in feedback ledger
    fb_entry = InvestigatorFeedback(
        target_type=fb_req.target_type.upper(),
        target_id=target_identifier,
        verdict=fb_req.verdict.upper(),
        officer_notes=fb_req.officer_notes,
        officer_id=current_user.id,
        officer_username=current_user.username
    )
    db.add(fb_entry)
    db.commit()

    log_audit(
        db,
        action="INVESTIGATOR_FEEDBACK_SUBMITTED",
        username=current_user.username,
        user_id=current_user.id,
        resource_type=fb_req.target_type.upper(),
        resource_id=target_identifier,
        details=f"Verdict: {fb_req.verdict.upper()} | Notes: {fb_req.officer_notes}",
        ip_address=get_client_ip(request)
    )

    # Live-sync this verdict to anyone with the affected case's corkboard
    # open -- an entity can span several domains (the resolver merges
    # shared entities across cases), so notify each one it belongs to;
    # a relationship belongs to exactly one.
    notify_domains = (entity.domains or []) if entity else ([rel.domain] if (rel and rel.domain) else [])
    if notify_domains:
        for d in notify_domains:
            manager.broadcast(d, "FEEDBACK_SUBMITTED", target_type=fb_req.target_type.upper(),
                               target_id=target_identifier, verdict=fb_req.verdict.upper())
    else:
        manager.broadcast(None, "FEEDBACK_SUBMITTED", target_type=fb_req.target_type.upper(),
                           target_id=target_identifier, verdict=fb_req.verdict.upper())

    return FeedbackResponse(
        feedback_id=fb_entry.id,
        target_type=fb_req.target_type.upper(),
        target_id=target_identifier,
        verdict=fb_req.verdict.upper(),
        officer_username=current_user.username,
        status_updated=updated_status,
        message=f"Feedback recorded successfully. Network weights adjusted according to verdict '{fb_req.verdict}'."
    )

@router.get("/feedback")
def list_feedback(limit: int = 50, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Lists recent investigator verification feedback."""
    return db.query(InvestigatorFeedback).order_by(InvestigatorFeedback.timestamp.desc()).limit(limit).all()
