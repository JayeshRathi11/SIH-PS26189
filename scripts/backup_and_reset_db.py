"""
Backs up every table in the live database to a brand-new, timestamped
folder as JSON, then (only if you pass --reset) clears the case-generated
data so you can start the demo from a clean slate.

This must be run from YOUR OWN machine/terminal where DATABASE_URL in
.env is actually reachable -- it can't be run from a sandboxed shell with
no route to Supabase.

Usage:
    python scripts/backup_and_reset_db.py                 # backup only, nothing is deleted
    python scripts/backup_and_reset_db.py --reset          # backup, then clear case data (keeps users + audit_logs)
    python scripts/backup_and_reset_db.py --reset --wipe-audit-log   # also clears the audit ledger

What --reset clears: entities, relationships, cases, pipeline_jobs,
document_metadata, evidence_ledger. The `cases` table auto-reseeds its
11 default rows (10 domains + the master view) the next time the backend
starts (backend/db.py: init_db() -> seed_default_cases()), so you don't
need to manually restore it.

What --reset always KEEPS: the `users` table (your login accounts --
losing these would lock you out of your own demo), and the `audit_logs`
table (the tamper-evident hash chain -- clearing it is a separate,
explicit choice via --wipe-audit-log, since "the audit trail is
immutable" is part of the pitch).
"""
import argparse
import json
import os
import sys
from datetime import datetime, date

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import inspect as sa_inspect
from sqlalchemy.exc import OperationalError
from backend.db import (
    Base, SessionLocal, engine,
    User, AuditLog, EvidenceLedgerRecord, InvestigatorFeedback,
    JobRecord, DocumentMetadata, EntityRecord, RelationshipRecord, CaseRecord,
)

# Order matters for the reset: children before/independent of any FK-ish
# relationships this app enforces at the application layer (there are no
# hard FK constraints between these tables, but this order keeps the
# reasoning simple: wipe generated case data, leave identity + ledger alone
# unless explicitly asked).
BACKUP_MODELS = [
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

RESET_MODELS = [
    ("entities", EntityRecord),
    ("relationships", RelationshipRecord),
    ("cases", CaseRecord),
    ("pipeline_jobs", JobRecord),
    ("document_metadata", DocumentMetadata),
    ("evidence_ledger", EvidenceLedgerRecord),
    # investigator_feedback references entity ids that are about to be
    # wiped too, so it goes stale the same way -- clear it alongside.
    ("investigator_feedback", InvestigatorFeedback),
]


def row_to_dict(row):
    out = {}
    for col in sa_inspect(row).mapper.column_attrs:
        val = getattr(row, col.key)
        if isinstance(val, (datetime, date)):
            val = val.isoformat()
        out[col.key] = val
    return out


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--reset", action="store_true", help="Clear case-generated data after backing it up.")
    parser.add_argument("--wipe-audit-log", action="store_true", help="Also clear audit_logs during --reset (ignored without --reset).")
    parser.add_argument("--out-dir", default=None, help="Backup destination (default: ./db_backups/backup_<timestamp>/)")
    args = parser.parse_args()

    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_dir = args.out_dir or os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "db_backups", f"backup_{stamp}")
    os.makedirs(out_dir, exist_ok=True)

    print(f"Connecting to: {engine.url.render_as_string(hide_password=True)}")

    # Create any tables that don't exist yet (e.g. `cases`, if this DB predates
    # that feature or the backend hasn't been restarted since it was added).
    # This ONLY creates missing tables -- it never touches, alters, or drops
    # a table that already exists, so it's safe to always run first.
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    counts = {}
    try:
        print(f"\nBacking up every table to: {out_dir}\n")
        for name, model in BACKUP_MODELS:
            try:
                rows = db.query(model).all()
            except OperationalError:
                # Table doesn't exist in this DB (e.g. a schema that predates
                # that model, or a stray/older nexustrace.db) -- nothing to
                # back up, but that also means --reset has nothing to clear
                # for it either. Don't let one missing table abort the whole
                # backup of everything else.
                db.rollback()
                print(f"  {name:<24}    -- (table doesn't exist in this DB, skipped)")
                counts[name] = 0
                continue
            data = [row_to_dict(r) for r in rows]
            path = os.path.join(out_dir, f"{name}.json")
            with open(path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, default=str)
            counts[name] = len(data)
            print(f"  {name:<24} {len(data):>6} row(s) -> {path}")

        print(f"\nBackup complete: {out_dir}")

        if not args.reset:
            print("\n(--reset not passed -- nothing was deleted. Re-run with --reset when you're ready to clear.)")
            return

        clear_names = [n for n, _ in RESET_MODELS]
        if args.wipe_audit_log:
            clear_names.append("audit_logs (explicitly requested via --wipe-audit-log)")

        print("\nAbout to CLEAR these tables (already backed up above):")
        for n in clear_names:
            print(f"  - {n}")
        print("Keeping untouched: users" + ("" if args.wipe_audit_log else ", audit_logs"))
        confirm = input("\nType YES to proceed: ").strip()
        if confirm != "YES":
            print("Aborted -- nothing was deleted.")
            return

        for name, model in RESET_MODELS:
            try:
                deleted = db.query(model).delete()
                print(f"  cleared {name}: {deleted} row(s)")
            except OperationalError:
                db.rollback()
                print(f"  {name}: table doesn't exist, nothing to clear")
        if args.wipe_audit_log:
            try:
                deleted = db.query(AuditLog).delete()
                print(f"  cleared audit_logs: {deleted} row(s)")
            except OperationalError:
                db.rollback()
                print("  audit_logs: table doesn't exist, nothing to clear")
        db.commit()

        print("\nDone. The `cases` table will auto-reseed its 11 default rows")
        print("(10 domains + the master view) the next time the backend starts.")
        print("Now add your new phased dataset (1_..., 2_..., ...) and re-run the pipeline.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
