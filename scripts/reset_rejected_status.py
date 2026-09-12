"""
One-time data reset: clears every entity/relationship currently marked
REJECTED back to neutral/unreviewed (NOT confirmed) -- for wiping out
ad-hoc REJECTED verdicts left over from testing, not for undoing a real
investigative decision. Run this once; it's not meant to be part of any
regular workflow.

Entities:      status REJECTED -> ACTIVE, verified_by_officer -> False
Relationships: status REJECTED -> ACTIVE, verified_by_officer -> False,
               weight_multiplier -> 1.0 (undoes the 0.05 REJECTED penalty)

Neither table has a distinct "unreviewed" status value -- ACTIVE +
verified_by_officer=False is what an entity/relationship looks like
before anyone has confirmed or rejected it (see backend/routers/
feedback.py: submit_feedback()), so that's the neutral state this
restores, not "confirmed".

This does NOT touch rows with a CONFIRMED verdict, and does not delete
the historical record in `investigator_feedback` -- only the live
entity/relationship status is reset.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
load_dotenv()  # DATABASE_URL must be loaded before importing backend.db, or it silently falls back to local sqlite
from backend.db import SessionLocal, EntityRecord, RelationshipRecord, DATABASE_URL
from urllib.parse import urlparse

_host = urlparse(DATABASE_URL).hostname or DATABASE_URL
print(f"Target database host: {_host}")

db = SessionLocal()
try:
    rejected_entities = db.query(EntityRecord).filter(EntityRecord.status == "REJECTED").all()
    rejected_rels = db.query(RelationshipRecord).filter(RelationshipRecord.status == "REJECTED").all()

    print(f"About to reset {len(rejected_entities)} REJECTED entit(y/ies) and "
          f"{len(rejected_rels)} REJECTED relationship(s) back to neutral (ACTIVE, unverified):")
    for e in rejected_entities:
        print(f"  ENTITY      {e.id}  ({e.canonical_name})")
    for r in rejected_rels:
        print(f"  RELATIONSHIP {r.id}")

    if not rejected_entities and not rejected_rels:
        print("Nothing to reset.")
    elif "--yes" in sys.argv or input("Type YES to proceed: ").strip() == "YES":
        for e in rejected_entities:
            e.status = "ACTIVE"
            e.verified_by_officer = False
        for r in rejected_rels:
            r.status = "ACTIVE"
            r.verified_by_officer = False
            r.weight_multiplier = 1.0
        db.commit()
        print(f"Reset {len(rejected_entities)} entit(y/ies) and {len(rejected_rels)} relationship(s).")
    else:
        print("Aborted.")
finally:
    db.close()
