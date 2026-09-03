"""
Empties the `cases` table with NO reseed. Run this AFTER restarting the
backend post-reset (the restart's init_db() auto-reseeds the 10 default
demo cases + case-all -- this removes them too, so the board is genuinely
blank instead of showing 10 empty default cards). Do NOT restart the
backend again after running this, or they'll come back.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.db import SessionLocal, CaseRecord

db = SessionLocal()
try:
    n = db.query(CaseRecord).count()
    print(f"About to delete all {n} row(s) in `cases` (already backed up earlier).")
    if input("Type YES to proceed: ").strip() != "YES":
        print("Aborted.")
    else:
        deleted = db.query(CaseRecord).delete()
        db.commit()
        print(f"Cleared {deleted} row(s). Board is now empty -- don't restart the backend again, just refresh the frontend.")
finally:
    db.close()
