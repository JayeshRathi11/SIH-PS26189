from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.db import get_db, AuditLog, User, UserRole, GENESIS_HASH, compute_audit_hash
from backend.routers.auth import require_role

router = APIRouter(prefix="/audit", tags=["Audit & Chain-of-Custody"])


@router.get("/verify")
def verify_audit_chain(
    current_user: User = Depends(require_role([UserRole.AUDITOR.value, UserRole.OFFICER_IN_CHARGE.value])),
    db: Session = Depends(get_db)
):
    """
    Walks the entire audit_logs table in chronological order and recomputes
    every row's hash from its own stored field values plus the previous
    row's hash, then checks that against what was actually stored.

    This is what makes the chain tamper-EVIDENT rather than just tamper-
    resistant: editing a row's content changes what its hash recomputes to,
    which no longer matches its stored entry_hash; deleting a row breaks the
    link between the rows on either side of it, since the next row's stored
    prev_hash no longer matches anything recomputable from what remains.
    Either way, this endpoint pinpoints exactly where the chain first goes
    bad, rather than just reporting a single pass/fail bit.
    """
    entries = db.query(AuditLog).order_by(AuditLog.timestamp.asc()).all()

    if not entries:
        return {
            "valid": True,
            "total_entries": 0,
            "broken_at": None,
            "message": "Chain is empty -- nothing to verify yet."
        }

    expected_prev = GENESIS_HASH
    for entry in entries:
        recomputed = compute_audit_hash(
            expected_prev, entry.timestamp, entry.user_id, entry.username, entry.action,
            entry.resource_type, entry.resource_id, entry.details, entry.status, entry.content_hash
        )

        if entry.prev_hash != expected_prev:
            return {
                "valid": False,
                "total_entries": len(entries),
                "broken_at": entry.id,
                "broken_at_action": entry.action,
                "broken_at_timestamp": entry.timestamp,
                "message": (
                    f"Chain link broken at entry {entry.id} ({entry.action}): "
                    f"its stored prev_hash does not match the previous entry's hash. "
                    f"A row was likely deleted, reordered, or inserted out of band."
                )
            }

        if entry.entry_hash != recomputed:
            return {
                "valid": False,
                "total_entries": len(entries),
                "broken_at": entry.id,
                "broken_at_action": entry.action,
                "broken_at_timestamp": entry.timestamp,
                "message": (
                    f"Tamper detected at entry {entry.id} ({entry.action}): "
                    f"its recomputed hash does not match its stored entry_hash. "
                    f"One or more of this entry's fields were modified after it was written."
                )
            }

        expected_prev = entry.entry_hash

    return {
        "valid": True,
        "total_entries": len(entries),
        "broken_at": None,
        "chain_head": expected_prev,
        "message": f"Chain intact -- all {len(entries)} entries verified, genesis to head."
    }


@router.get("/log")
def list_audit_log(
    limit: int = Query(100, le=500),
    action: Optional[str] = Query(None, description="Filter to a single action type, e.g. DOSSIER_EXPORTED"),
    current_user: User = Depends(require_role([UserRole.AUDITOR.value, UserRole.OFFICER_IN_CHARGE.value])),
    db: Session = Depends(get_db)
):
    """Read-only listing of the custody chain, newest first -- the Auditor role's primary view."""
    q = db.query(AuditLog)
    if action:
        q = q.filter(AuditLog.action == action)
    entries = q.order_by(AuditLog.timestamp.desc()).limit(limit).all()
    return [
        {
            "id": e.id,
            "timestamp": e.timestamp,
            "username": e.username,
            "action": e.action,
            "resource_type": e.resource_type,
            "resource_id": e.resource_id,
            "details": e.details,
            "status": e.status,
            "content_hash": e.content_hash,
            "prev_hash": e.prev_hash,
            "entry_hash": e.entry_hash,
        }
        for e in entries
    ]
