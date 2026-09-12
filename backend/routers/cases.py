from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.db import get_db, CaseRecord, EntityRecord, RelationshipRecord, UserRole, User
from backend.routers.auth import get_current_user, require_role, log_audit
from backend.ws_manager import manager
from pipeline.config import DOMAINS

# Cases and domains are different identifier spaces: the 10 pre-seeded demo
# cases use ids like "case-3" while entities/relationships (and therefore
# every WebSocket subscription -- see openCaseLiveSync in the frontend and
# backend/routers/ws.py) key off domain strings like "03_cyber_financial_
# fraud". A case an officer creates fresh uses its raw domain key as its id
# directly (see CaseRecord's docstring below), so it needs no translation.
# This recovers the right broadcast domain for a given case id without
# hardcoding a second, parallel case->domain table (the frontend already
# has one -- CASE_TO_DOMAIN_MAP in api/client.js -- built the same way).
_CASE_NUM_TO_DOMAIN = {meta["id"]: key for key, meta in DOMAINS.items()}


def _resolve_case_domain(case_id: str) -> Optional[str]:
    if case_id in DOMAINS:
        return case_id
    if case_id and case_id.startswith("case-"):
        return _CASE_NUM_TO_DOMAIN.get(case_id.split("-", 1)[1].zfill(2))
    return None

# Persists the case registry that, before this router existed, lived only
# in the React app's local state -- a case created via "+ Add New Case",
# or an archive/delete done in the sidebar, vanished on refresh and was
# invisible to any other officer's browser. This router makes the case
# list itself a shared, durable resource, same as the entities/relationships/
# documents it groups. It never deletes underlying domain data (see
# delete_case() below) -- only the CaseRecord "folder" row.
router = APIRouter(prefix="/cases", tags=["Case Management"])


class CaseResponse(BaseModel):
    id: str
    caseId: Optional[str] = None
    title: str
    entities: Optional[str] = None
    links: Optional[str] = None
    tag: Optional[str] = "Active"
    archived: bool = False


class CaseCreateRequest(BaseModel):
    id: str
    caseId: Optional[str] = None
    title: str
    entities: Optional[str] = None
    links: Optional[str] = None
    tag: Optional[str] = "Active"


class CaseUpdateRequest(BaseModel):
    archived: Optional[bool] = None
    # Status label (Active / Under Review / Closed / New / ...), separate
    # from `archived`: archiving hides a case from the default view without
    # changing what it's labeled; this changes the label itself while the
    # case stays visible -- e.g. "closed after trial" or "reopened, new lead".
    tag: Optional[str] = None


def _serialize(c: CaseRecord) -> dict:
    return {
        "id": c.id,
        "caseId": c.case_id,
        "title": c.title,
        "entities": c.entities_label,
        "links": c.links_label,
        "tag": c.tag,
        "archived": bool(c.archived),
    }


def _live_domain_counts(db: Session):
    """
    Live entity/relationship counts per domain, recomputed on every call --
    CaseRecord.entities_label/links_label are static strings set once at
    case creation and never updated afterwards (not even when a pipeline
    job actually finishes populating that domain), so a case created via
    "+ Add New Case" showed a permanently stale "0 entities / 0 links"
    forever. Computing these fresh here instead of trusting the stored
    labels means this class of staleness can't recur regardless of what
    else changes the underlying data.

    REJECTED entities/relationships are excluded, matching what
    GraphService.get_full_graph() shows by default -- this count should
    reflect what an officer actually sees on the Case Board, not the raw
    row count including rejected junk.

    An entity can belong to multiple domains (cross-case entity
    resolution), so this can't be a single SQL GROUP BY on the entities
    side -- `domains` is a JSON list column, not a scalar to group on.
    """
    entity_counts = {}
    for (domains,) in db.query(EntityRecord.domains).filter(EntityRecord.status != "REJECTED").all():
        for d in (domains or []):
            entity_counts[d] = entity_counts.get(d, 0) + 1

    rel_counts = dict(
        db.query(RelationshipRecord.domain, func.count(RelationshipRecord.id))
        .filter(RelationshipRecord.status != "REJECTED")
        .group_by(RelationshipRecord.domain)
        .all()
    )
    return entity_counts, rel_counts


@router.get("", response_model=List[CaseResponse])
def list_cases(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Every logged-in role can see the case list (read-only for Auditor,
    same as the rest of the app)."""
    rows = (
        db.query(CaseRecord)
        .filter(CaseRecord.hidden == False)  # noqa: E712 -- SQLAlchemy needs `== False`, not `is False`
        .order_by(CaseRecord.sort_order, CaseRecord.created_at)
        .all()
    )
    entity_counts, rel_counts = _live_domain_counts(db)

    serialized = []
    for c in rows:
        row = _serialize(c)
        # case-all's "10 Domains" / "Resolved Hub" labels are a deliberate
        # summary, not an entity/link count -- leave the synthetic master
        # view alone and only replace real per-domain cases' counts.
        if c.id != "case-all":
            domain = _resolve_case_domain(c.id) or c.id
            row["entities"] = str(entity_counts.get(domain, 0))
            row["links"] = str(rel_counts.get(domain, 0))
        serialized.append(row)
    return serialized


@router.post("", response_model=CaseResponse)
def create_case(
    req: CaseCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role([UserRole.INVESTIGATOR.value, UserRole.OFFICER_IN_CHARGE.value])
    ),
):
    existing = db.query(CaseRecord).filter(CaseRecord.id == req.id).first()
    if existing:
        # Re-registering a previously soft-deleted case (or a duplicate
        # "+ Add New Case" submission) just un-hides and refreshes it,
        # rather than erroring or creating a second row for the same id.
        existing.hidden = False
        existing.title = req.title or existing.title
        existing.case_id = req.caseId or existing.case_id
        if req.entities is not None:
            existing.entities_label = req.entities
        if req.links is not None:
            existing.links_label = req.links
        db.commit()
        log_audit(
            db, action="CASE_CREATE", username=current_user.username, user_id=current_user.id,
            resource_type="CASE", resource_id=req.id, details=f"Re-registered case '{req.title}'",
        )
        manager.broadcast(_resolve_case_domain(req.id), "CASE_UPDATED", case_id=req.id, title=req.title)
        return _serialize(existing)

    max_order = db.query(CaseRecord).count()
    rec = CaseRecord(
        id=req.id,
        case_id=req.caseId,
        title=req.title,
        entities_label=req.entities,
        links_label=req.links,
        tag=req.tag or "Active",
        sort_order=max_order,
        created_by=current_user.username,
    )
    db.add(rec)
    db.commit()
    log_audit(
        db, action="CASE_CREATE", username=current_user.username, user_id=current_user.id,
        resource_type="CASE", resource_id=req.id, details=f"Registered new case '{req.title}'",
    )
    manager.broadcast(_resolve_case_domain(req.id), "CASE_CREATED", case_id=req.id, title=req.title)
    return _serialize(rec)


@router.patch("/{case_id}", response_model=CaseResponse)
def update_case(
    case_id: str,
    req: CaseUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role([UserRole.INVESTIGATOR.value, UserRole.OFFICER_IN_CHARGE.value])
    ),
):
    if case_id == "case-all":
        raise HTTPException(status_code=400, detail="The unified master view cannot be modified.")
    rec = db.query(CaseRecord).filter(CaseRecord.id == case_id, CaseRecord.hidden == False).first()  # noqa: E712
    if not rec:
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found.")

    if req.archived is not None:
        rec.archived = req.archived
        log_audit(
            db,
            action="CASE_ARCHIVE" if req.archived else "CASE_RESTORE",
            username=current_user.username, user_id=current_user.id,
            resource_type="CASE", resource_id=case_id,
        )

    if req.tag is not None and req.tag != rec.tag:
        old_tag = rec.tag
        rec.tag = req.tag
        log_audit(
            db, action="CASE_STATUS_CHANGE", username=current_user.username, user_id=current_user.id,
            resource_type="CASE", resource_id=case_id, details=f"Status changed from '{old_tag}' to '{req.tag}'",
        )

    db.commit()
    manager.broadcast(_resolve_case_domain(case_id), "CASE_UPDATED", case_id=case_id, archived=rec.archived, tag=rec.tag)
    return _serialize(rec)


@router.delete("/{case_id}")
def delete_case(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role([UserRole.INVESTIGATOR.value, UserRole.OFFICER_IN_CHARGE.value])
    ),
):
    if case_id == "case-all":
        raise HTTPException(status_code=400, detail="The unified master view cannot be deleted.")
    rec = db.query(CaseRecord).filter(CaseRecord.id == case_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found.")

    # Soft-delete only: removes the case "folder" from every officer's
    # sidebar, but the EntityRecord/RelationshipRecord/DocumentMetadata
    # rows for its domain are left completely untouched. Entity resolution
    # can merge one entity across multiple domains/cases, so purging by
    # domain here could silently corrupt data another case still relies on.
    rec.hidden = True
    db.commit()
    log_audit(
        db, action="CASE_DELETE", username=current_user.username, user_id=current_user.id,
        resource_type="CASE", resource_id=case_id,
        details=f"Removed case '{rec.title}' from the sidebar (soft-delete; underlying domain data untouched)",
    )
    manager.broadcast(_resolve_case_domain(case_id), "CASE_DELETED", case_id=case_id)
    return {"status": "deleted", "id": case_id}
