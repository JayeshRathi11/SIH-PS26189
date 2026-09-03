"""
ONE script that backs up everything, then wipes everything back to a truly
blank slate -- no cases at all, not even the 10 defaults. Keeps `users`
(your login accounts) always. Your backend can stay running the whole time
in another terminal -- no restart needed, so there's no risk of the 10
default cases getting auto-reseeded back in.

Usage:
    python scripts/full_wipe.py            # backup only, confirms path, nothing deleted
    python scripts/full_wipe.py --confirm  # backup, then actually wipe everything (still asks YES)
"""
import argparse
import json
import os
import sys
from datetime import datetime, date

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# backend/db.py reads DATABASE_URL straight from the process environment --
# it does NOT call load_dotenv() itself (only backend/main.py does, before
# importing anything else). Importing backend.db directly, like this script
# does, skips that step entirely, so DATABASE_URL was never populated from
# .env and db.py silently fell back to its sqlite:///./nexustrace.db default
# -- a mostly-empty local file, completely different from the real Supabase
# database the actual running backend uses. This must run before the
# `from backend.db import ...` below, or it's too late.
from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import inspect as sa_inspect
from sqlalchemy.exc import OperationalError
from backend.db import (
    Base, SessionLocal, engine,
    User, AuditLog, EvidenceLedgerRecord, InvestigatorFeedback,
    JobRecord, DocumentMetadata, EntityRecord, RelationshipRecord, CaseRecord,
)

ALL_MODELS = [
    ("users", User),
    ("audit_logs", AuditLog),
    ("evidence_ledger", EvidenceLedgerRecord),
    ("investigator_feedback", InvestigatorFeedback),
    ("pipeline_jobs", JobRecord),
    ("document_metadata", DocumentMetadata),
    ("entities", EntityRecord),
    ("relationships", RelationshipRecord),
    ("cases", CaseRecord),
]
# Everything except users -- this run wipes cases and audit_logs too, since
# "truly blank, nothing" was the explicit ask.
WIPE_MODELS = [(n, m) for n, m in ALL_MODELS if n != "users"]


def row_to_dict(row):
    out = {}
    for col in sa_inspect(row).mapper.column_attrs:
        val = getattr(row, col.key)
        if isinstance(val, (datetime, date)):
            val = val.isoformat()
        out[col.key] = val
    return out


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--confirm", action="store_true", help="Actually wipe after backing up (still asks YES).")
    args = parser.parse_args()

    print(f"Connecting to: {engine.url.render_as_string(hide_password=True)}")
    Base.metadata.create_all(bind=engine)

    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "db_backups", f"backup_{stamp}")
    os.makedirs(out_dir, exist_ok=True)

    db = SessionLocal()
    try:
        print(f"\nBacking up every table to: {out_dir}\n")
        for name, model in ALL_MODELS:
            try:
                rows = db.query(model).all()
            except OperationalError:
                db.rollback()
                print(f"  {name:<24}    -- (table doesn't exist, skipped)")
                continue
            data = [row_to_dict(r) for r in rows]
            path = os.path.join(out_dir, f"{name}.json")
            with open(path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, default=str)
            print(f"  {name:<24} {len(data):>6} row(s) -> {path}")

        print(f"\nBackup complete: {out_dir}")

        if not args.confirm:
            print("\n(--confirm not passed -- nothing was deleted. Re-run with --confirm when ready.)")
            return

        print("\nAbout to WIPE everything except `users` (your logins stay):")
        for n, _ in WIPE_MODELS:
            print(f"  - {n}")
        confirm = input("\nType YES to proceed: ").strip()
        if confirm != "YES":
            print("Aborted -- nothing was deleted.")
            return

        for name, model in WIPE_MODELS:
            try:
                deleted = db.query(model).delete()
                print(f"  cleared {name}: {deleted} row(s)")
            except OperationalError:
                db.rollback()
                print(f"  {name}: table doesn't exist, nothing to clear")
        db.commit()

        print("\nDone. Board is now genuinely empty. Do NOT restart the backend")
        print("(no need to -- it's already reading live from this same DB).")
        print("Just hard-refresh the frontend tab.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
