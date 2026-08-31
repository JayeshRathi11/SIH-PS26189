from fastapi import APIRouter, HTTPException, Depends, Response
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from backend.db import get_db, EntityRecord, RelationshipRecord, DocumentMetadata, EvidenceLedgerRecord, User, UserRole
from backend.routers.auth import get_current_user, require_role
from backend.services.dossier_service import CourtDossierGenerator

router = APIRouter(prefix="/dossier", tags=["Court Dossier Export"])
dossier_gen = CourtDossierGenerator()

class DossierRequest(BaseModel):
    entity_id: Optional[str] = "ENT_HUB_IQBAL_ANSARI"
    case_id: Optional[str] = None
    officer_notes: Optional[str] = ""

@router.post("/generate")
def generate_dossier(
    req: DossierRequest,
    current_user: User = Depends(require_role([UserRole.INVESTIGATOR.value, UserRole.OFFICER_IN_CHARGE.value])),
    db: Session = Depends(get_db)
):
    """
    Generates a formal, court-ready PDF investigative brief for the requested entity or case.
    Includes SHA-256 evidence chain-of-custody verification.
    """
    entity_rec = db.query(EntityRecord).filter(EntityRecord.id == req.entity_id).first()
    if not entity_rec:
        # Try finding by name
        entity_rec = db.query(EntityRecord).filter(EntityRecord.canonical_name == req.entity_id).first()
    if not entity_rec:
        # Fallback to first available entity
        entity_rec = db.query(EntityRecord).first()

    if not entity_rec:
        raise HTTPException(status_code=404, detail=f"Entity '{req.entity_id}' not found.")

    entity_dict = {
        "canonical_id": entity_rec.id,
        "canonical_name": entity_rec.canonical_name,
        "type": entity_rec.type,
        "aliases": entity_rec.aliases or [],
        "domains": entity_rec.domains or [],
        "phone_numbers": entity_rec.phone_numbers or [],
        "hub_score": entity_rec.hub_score or 0.05,
        "community_cluster": entity_rec.community_cluster or 0
    }

    # Fetch direct relationships
    relationships = db.query(RelationshipRecord).filter(
        (RelationshipRecord.source_id == entity_rec.id) | (RelationshipRecord.target_id == entity_rec.id)
    ).all()
    rels_list = [
        {
            "source_id": r.source_id,
            "source_canonical": r.source_canonical,
            "target_id": r.target_id,
            "target_canonical": r.target_canonical,
            "relationship_type": r.relationship_type,
            "domain": r.domain,
            "evidence": r.evidence
        }
        for r in relationships
    ]

    # Fetch evidence records from ledger
    evidence_records = db.query(EvidenceLedgerRecord).limit(10).all()
    ev_list = [
        {
            "doc_id": e.doc_id,
            "domain": e.domain,
            "sha256_hash": e.sha256_hash,
            "doc_type": "FIR"
        }
        for e in evidence_records
    ]

    officer_name = current_user.full_name or current_user.username

    pdf_bytes = dossier_gen.generate_dossier_pdf(
        entity=entity_dict,
        relationships=rels_list,
        evidence_records=ev_list,
        officer_name=officer_name
    )

    filename = f"NexusTrace_Court_Dossier_{entity_rec.canonical_name.replace(' ', '_')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/download/{entity_id}")
def download_dossier_by_id(
    entity_id: str,
    current_user: User = Depends(require_role([UserRole.INVESTIGATOR.value, UserRole.OFFICER_IN_CHARGE.value])),
    db: Session = Depends(get_db)
):
    """GET route for browser one-click download of PDF dossier. Requires an authenticated INVESTIGATOR or OFFICER_IN_CHARGE token."""
    req = DossierRequest(entity_id=entity_id)
    entity_rec = db.query(EntityRecord).filter(EntityRecord.id == entity_id).first()
    if not entity_rec:
        entity_rec = db.query(EntityRecord).filter(EntityRecord.canonical_name == entity_id).first()
    if not entity_rec:
        entity_rec = db.query(EntityRecord).first()

    if not entity_rec:
        raise HTTPException(status_code=404, detail="Entity not found.")

    entity_dict = {
        "canonical_id": entity_rec.id,
        "canonical_name": entity_rec.canonical_name,
        "type": entity_rec.type,
        "aliases": entity_rec.aliases or [],
        "domains": entity_rec.domains or [],
        "phone_numbers": entity_rec.phone_numbers or [],
        "hub_score": entity_rec.hub_score or 0.05,
        "community_cluster": entity_rec.community_cluster or 0
    }

    relationships = db.query(RelationshipRecord).filter(
        (RelationshipRecord.source_id == entity_rec.id) | (RelationshipRecord.target_id == entity_rec.id)
    ).all()
    rels_list = [
        {
            "source_id": r.source_id,
            "source_canonical": r.source_canonical,
            "target_id": r.target_id,
            "target_canonical": r.target_canonical,
            "relationship_type": r.relationship_type,
            "domain": r.domain,
            "evidence": r.evidence
        }
        for r in relationships
    ]

    evidence_records = db.query(EvidenceLedgerRecord).limit(10).all()
    ev_list = [
        {
            "doc_id": e.doc_id,
            "domain": e.domain,
            "sha256_hash": e.sha256_hash,
            "doc_type": "FIR"
        }
        for e in evidence_records
    ]

    pdf_bytes = dossier_gen.generate_dossier_pdf(
        entity=entity_dict,
        relationships=rels_list,
        evidence_records=ev_list,
        officer_name=(current_user.full_name or current_user.username)
    )

    filename = f"NexusTrace_Court_Dossier_{entity_rec.canonical_name.replace(' ', '_')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
