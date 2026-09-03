from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.db import get_db, CaseRecord, UserRole, User
from backend.routers.auth import get_current_user, require_role, log_audit

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
    return [_serialize(c) for c in rows]


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
    return {"status": "deleted", "id": case_id}
