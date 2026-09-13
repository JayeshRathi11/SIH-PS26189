import os
import uuid
import hashlib
import json as _json
from enum import Enum
from urllib.parse import urlparse
import bcrypt
from datetime import datetime
from sqlalchemy import create_engine, Column, String, Integer, Float, Boolean, DateTime, Text, JSON, Enum as SQLEnum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./nexustrace.db")

# check_same_thread is a SQLite-only pysqlite option -- psycopg2 (Postgres/
# Supabase) rejects it as an unknown connection argument, so only pass it
# when we're actually still pointed at a local sqlite:// file.
_engine_kwargs = {"connect_args": {"check_same_thread": False}} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, **_engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Hosts docker-compose / .env.example point local dev at. Anything else
# (a Supabase pooler hostname, an onrender.com box, etc) gets flagged loud --
# this is the check that would have caught tonight's .env pointed at prod.
_LOCAL_DB_HOSTS = {"localhost", "127.0.0.1", "postgres", "db"}

def _print_startup_db_banner():
    if DATABASE_URL.startswith("sqlite"):
        host, db_name, is_local = "sqlite (local file)", DATABASE_URL.split("///")[-1], True
    else:
        parsed = urlparse(DATABASE_URL)
        host = parsed.hostname or "unknown-host"
        db_name = (parsed.path or "").lstrip("/") or "unknown-db"
        is_local = host.lower() in _LOCAL_DB_HOSTS
    label = "LOCAL" if is_local else "!!! NON-LOCAL / REMOTE DATABASE !!!"
    line = "#" * 72
    print(line)
    print(f"# [STARTUP] DATABASE TARGET: {label}")
    print(f"# [STARTUP] Connected to: {host}/{db_name}")
    print(line)

def hash_password(password: str) -> str:
    """Standard bcrypt password hashing."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8")[:72], salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies plain password against hashed bcrypt digest."""
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8")[:72], hashed_password.encode("utf-8"))
    except Exception:
        return False

# Fixed starting point for the audit hash-chain -- the first row in the
# table chains from this instead of a real previous entry_hash.
GENESIS_HASH = "0" * 64

def compute_audit_hash(prev_hash, timestamp, user_id, username, action,
                        resource_type, resource_id, details, status, content_hash) -> str:
    """
    Deterministically hashes one audit-log entry together with the
    previous entry's hash. Called on every insert (see log_audit() in
    backend/routers/auth.py) and again by /audit/verify (backend/routers/
    audit.py), which recomputes every row's hash from its stored field
    values and confirms it still matches what was stored -- if a row was
    edited or deleted after the fact, the recomputed hash (or the next
    row's prev_hash pointer) won't match, and the break is reported.
    Field order is part of the hash input and must never change without
    invalidating every previously stored hash.
    """
    payload = _json.dumps({
        "prev_hash": prev_hash,
        "timestamp": timestamp.isoformat() if hasattr(timestamp, "isoformat") else str(timestamp),
        "user_id": user_id,
        "username": username,
        "action": action,
        "resource_type": resource_type,
        "resource_id": resource_id,
        "details": details,
        "status": status,
        "content_hash": content_hash,
    }, sort_keys=True, default=str)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()

class UserRole(str, Enum):
    INVESTIGATOR = "INVESTIGATOR"
    OFFICER_IN_CHARGE = "OFFICER_IN_CHARGE"
    AUDITOR = "AUDITOR"

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default=UserRole.INVESTIGATOR.value)
    full_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class AuditLog(Base):
    """
    Doubles as the system's tamper-evident custody ledger. Every row is
    cryptographically chained to the one before it (see log_audit() in
    backend/routers/auth.py, which computes prev_hash/entry_hash on every
    insert): entry_hash = sha256(prev_hash + canonical(this row's fields)).
    Editing or deleting any row breaks that link for everything after it,
    which is exactly what /audit/verify (backend/routers/audit.py) checks
    for. This is a hash chain, not a distributed blockchain -- there's no
    multi-node consensus -- but it's the same core primitive (a Merkle-
    style chain of hashes) that gives blockchains their tamper-evidence,
    applied here as NexusTrace's evidentiary chain-of-custody log.
    """
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, index=True, nullable=True)
    username = Column(String, index=True, nullable=True)
    action = Column(String, index=True, nullable=False)
    resource_type = Column(String, nullable=True)
    resource_id = Column(String, nullable=True)
    details = Column(Text, nullable=True)
    ip_address = Column(String, nullable=True)
    status = Column(String, default="SUCCESS")
    # Optional hash of a specific artifact this entry concerns (e.g. an
    # uploaded document's or an exported dossier PDF's SHA-256), separate
    # from the chain-linking hashes below.
    content_hash = Column(String, nullable=True)
    # Chain-linking fields: prev_hash is the entry_hash of the row that
    # was chronologically last when this row was written; entry_hash is
    # this row's own hash. The very first row in the table chains from a
    # fixed genesis value (64 zeros) instead of a previous row.
    prev_hash = Column(String, nullable=True)
    entry_hash = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

class RevokedToken(Base):
    """
    Server-side logout for an otherwise fully stateless JWT setup (see
    ACCESS_TOKEN_EXPIRE_MINUTES / create_access_token() in backend/routers/
    auth.py). Without this, POST /auth/logout could only ever mean "the
    browser forgot its token" -- the token itself would stay valid to
    replay against the API for the rest of its 24h lifetime even after
    the officer signed out. Every token now carries a unique jti claim;
    logging out records that jti here, and get_current_user() rejects any
    token whose jti shows up in this table, regardless of its exp.
    """
    __tablename__ = "revoked_tokens"

    jti = Column(String, primary_key=True)
    username = Column(String, index=True, nullable=True)
    revoked_at = Column(DateTime, default=datetime.utcnow)
    # The token's own expiry, kept only so a future cleanup job could prune
    # rows for tokens that would have expired naturally anyway -- nothing
    # currently reads this column.
    expires_at = Column(DateTime, nullable=True)

class EvidenceLedgerRecord(Base):
    __tablename__ = "evidence_ledger"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    doc_id = Column(String, index=True, nullable=False)
    domain = Column(String, index=True, nullable=False)
    sha256_hash = Column(String, index=True, nullable=False)
    byte_size = Column(Integer, default=0)
    source_file = Column(String, nullable=True)
    redaction_count = Column(Integer, default=0)
    timestamp = Column(DateTime, default=datetime.utcnow)

class InvestigatorFeedback(Base):
    __tablename__ = "investigator_feedback"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    target_type = Column(String, index=True) # ENTITY or RELATIONSHIP
    target_id = Column(String, index=True)
    verdict = Column(String, index=True) # CONFIRMED, REJECTED, UNCERTAIN
    officer_notes = Column(Text, nullable=True)
    officer_id = Column(String, nullable=True)
    officer_username = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

class JobRecord(Base):
    __tablename__ = "pipeline_jobs"

    id = Column(String, primary_key=True, index=True)
    domain = Column(String, nullable=True)
    status = Column(String, default="PENDING") # PENDING, RUNNING, COMPLETED, FAILED
    total_entities = Column(Integer, default=0)
    total_relationships = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)

class DocumentMetadata(Base):
    __tablename__ = "document_metadata"

    id = Column(String, primary_key=True, index=True)
    doc_id = Column(String, index=True)
    domain = Column(String, index=True)
    doc_type = Column(String)
    source_file = Column(String)
    sha256_hash = Column(String, nullable=True)
    parsed_json = Column(JSON)

class EntityRecord(Base):
    __tablename__ = "entities"

    id = Column(String, primary_key=True, index=True)
    canonical_name = Column(String, index=True)
    type = Column(String, index=True)
    aliases = Column(JSON, default=list)
    domains = Column(JSON, default=list)
    phone_numbers = Column(JSON, default=list)
    hub_score = Column(Float, default=0.0)
    community_cluster = Column(Integer, default=0)
    verified_by_officer = Column(Boolean, default=False)
    status = Column(String, default="ACTIVE") # ACTIVE, REJECTED, FLAGGED
    # Set by the criminal-history reference-lookup step in
    # pipeline/resolution/incremental_resolver.py (ingest_new_case_
    # incrementally) whenever this entity matches a criminal_history_records
    # row -- see CriminalHistoryRecord below. Sticky once true: a later
    # resolution pass that no longer finds a match does not clear it, so a
    # real prior-history hit is never silently dropped by a subsequent merge.
    has_prior_history = Column(Boolean, default=False)
    prior_history_summary = Column(Text, nullable=True)

class RelationshipRecord(Base):
    __tablename__ = "relationships"

    id = Column(String, primary_key=True, index=True)
    source_id = Column(String, index=True)
    source_canonical = Column(String)
    relationship_type = Column(String, index=True)
    raw_relationship_type = Column(String, default="")
    target_id = Column(String, index=True)
    target_canonical = Column(String)
    confidence = Column(Float, default=0.9)
    domain = Column(String, index=True)
    evidence = Column(Text, default="")
    timestamp = Column(String, nullable=True)
    verified_by_officer = Column(Boolean, default=False)
    weight_multiplier = Column(Float, default=1.0)
    status = Column(String, default="ACTIVE") # ACTIVE, REJECTED

class CriminalHistoryRecord(Base):
    """
    Reference/lookup table of known offenders -- independent of the live
    entities/relationships graph. Never written to by resolution itself;
    only read from, by the prior-history check in pipeline/resolution/
    incremental_resolver.py, which flags a resolved EntityRecord (see
    has_prior_history/prior_history_summary above) when it matches a row
    here on phone number, vehicle number (exact), or name (fuzzy).
    """
    __tablename__ = "criminal_history_records"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    full_name = Column(String, index=True, nullable=False)
    aliases = Column(JSON, default=list)
    phone_numbers = Column(JSON, default=list)
    vehicle_numbers = Column(JSON, default=list)
    prior_case_ids = Column(JSON, default=list)
    offense_types = Column(JSON, default=list)
    status = Column(String, default="SUSPECT") # CONVICTED, SUSPECT, CLEARED
    notes = Column(Text, nullable=True)

class CaseRecord(Base):
    """
    Persists the case list that used to live only in the React app's
    local state (App.jsx's old INITIAL_CASES + a client-only
    handleAddCase/handleArchiveCase/handleDeleteCase). Without this
    table a case created via "+ Add New Case", or an archive/delete
    done in the sidebar, vanished on refresh and was invisible to any
    other officer's browser -- even though the underlying entities,
    relationships and documents for that domain were already
    persisted server-side. This table is purely a UI-facing case
    registry; deleting a row here never touches EntityRecord/
    RelationshipRecord data for its domain (see delete_case() in
    backend/routers/cases.py) -- entity resolution can merge one
    entity across multiple domains/cases, so purging by domain could
    silently corrupt data shared with another case.
    """
    __tablename__ = "cases"

    id = Column(String, primary_key=True) # e.g. 'case-1', or the raw domain key for an officer-created case
    case_id = Column(String, nullable=True) # display code, e.g. 'FIR-01-NARCO'
    title = Column(String, nullable=False)
    entities_label = Column(String, nullable=True) # string, not int -- case-all's label is "10 Domains"
    links_label = Column(String, nullable=True)
    tag = Column(String, default="Active")
    archived = Column(Boolean, default=False)
    hidden = Column(Boolean, default=False) # soft-deleted from the sidebar
    sort_order = Column(Integer, default=0)
    created_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Mirrors the old hardcoded INITIAL_CASES array from App.jsx, so a
# fresh database seeds the exact same 10 domain cases + the unified
# master view that used to be baked into the frontend.
DEFAULT_CASES = [
    {"id": "case-all", "case_id": "GLOBAL-MASTER-00", "title": "All Domains (Master View)", "entities_label": "11 Domains", "links_label": "Resolved Hub", "tag": "Global"},
    {"id": "case-1", "case_id": "FIR-01-NARCO", "title": "01: Narcotics Trafficking", "entities_label": "20", "links_label": "18", "tag": "Active"},
    {"id": "case-2", "case_id": "FIR-02-HUMAN", "title": "02: Human Trafficking", "entities_label": "5", "links_label": "4", "tag": "Active"},
    {"id": "case-3", "case_id": "FIR-03-CYBER", "title": "03: Cyber Financial Fraud", "entities_label": "16", "links_label": "16", "tag": "Active"},
    {"id": "case-4", "case_id": "FIR-04-ARMS", "title": "04: Arms Smuggling", "entities_label": "12", "links_label": "14", "tag": "Active"},
    {"id": "case-5", "case_id": "FIR-05-EXTORT", "title": "05: Organized Extortion", "entities_label": "20", "links_label": "23", "tag": "Active"},
    {"id": "case-6", "case_id": "FIR-06-KIDNAP", "title": "06: Kidnapping for Ransom", "entities_label": "16", "links_label": "15", "tag": "Active"},
    {"id": "case-7", "case_id": "FIR-07-FAKE-CURR", "title": "07: Counterfeit Currency", "entities_label": "16", "links_label": "11", "tag": "Active"},
    {"id": "case-8", "case_id": "FIR-08-HAWALA", "title": "08: Illegal Betting & Hawala", "entities_label": "16", "links_label": "10", "tag": "Active"},
    {"id": "case-9", "case_id": "FIR-09-VEHICLE", "title": "09: Vehicle Theft Ring", "entities_label": "12", "links_label": "9", "tag": "Active"},
    {"id": "case-10", "case_id": "FIR-10-LAND", "title": "10: Land Grabbing & Fraud", "entities_label": "16", "links_label": "11", "tag": "Active"},
    {"id": "case-11", "case_id": "FIR-11-CAW", "title": "11: Crimes Against Women", "entities_label": "6", "links_label": "5", "tag": "Active"},
]

def seed_default_cases(db):
    """Pre-seeds the default 10 domain cases + the unified master view.
    Only runs once -- if the table already has any rows (from a prior
    seed, or officer-created cases), it is left alone."""
    if db.query(CaseRecord).count() > 0:
        return
    for order, c in enumerate(DEFAULT_CASES):
        db.add(CaseRecord(
            id=c["id"], case_id=c["case_id"], title=c["title"],
            entities_label=c["entities_label"], links_label=c["links_label"],
            tag=c["tag"], sort_order=order,
        ))
    db.commit()

# Synthetic reference records for the criminal-history lookup demo -- every
# name, phone number, vehicle number and case ID here is fictional. Two of
# these are deliberately reused by the prior-history test flow described in
# pipeline/resolution/incremental_resolver.py's matching step: Sanjay Wagh's
# phone number and Farhana Sheikh's vehicle number are exact-match targets;
# Kunal Bhagwat's name is a near-miss fuzzy-match target (a test entity named
# e.g. "Kunal Bhagwatt" should flag as a moderate-confidence possible match,
# not a confirmed one).
CRIMINAL_HISTORY_SEED = [
    {
        "full_name": "Sanjay Wagh", "aliases": ["Sanju"], "phone_numbers": ["9998887770"],
        "vehicle_numbers": [], "prior_case_ids": ["FIR-2019/0442"],
        "offense_types": ["Narcotics Trafficking"], "status": "CONVICTED",
        "notes": "Synthetic reference record. Convicted 2019, cross-border narcotics consignment case.",
    },
    {
        "full_name": "Farhana Sheikh", "aliases": [], "phone_numbers": [],
        "vehicle_numbers": ["MH14XY7788"], "prior_case_ids": ["FIR-2021/1187"],
        "offense_types": ["Vehicle Theft & Re-Registration"], "status": "SUSPECT",
        "notes": "Synthetic reference record. Suspected in multi-state vehicle re-registration racket.",
    },
    {
        "full_name": "Kunal Bhagwat", "aliases": [], "phone_numbers": [],
        "vehicle_numbers": [], "prior_case_ids": ["FIR-2020/0091"],
        "offense_types": ["Cyber Financial Fraud"], "status": "CONVICTED",
        "notes": "Synthetic reference record. Convicted in a phishing/mule-account fraud ring.",
    },
    {
        "full_name": "Devraj Solankar", "aliases": ["DJ"], "phone_numbers": [],
        "vehicle_numbers": [], "prior_case_ids": ["FIR-2018/0765"],
        "offense_types": ["Human Trafficking"], "status": "CONVICTED",
        "notes": "Synthetic reference record. Convicted, cross-border trafficking network.",
    },
    {
        "full_name": "Meena Kulthe", "aliases": [], "phone_numbers": [],
        "vehicle_numbers": [], "prior_case_ids": ["FIR-2022/0233"],
        "offense_types": ["Illegal Betting & Hawala"], "status": "SUSPECT",
        "notes": "Synthetic reference record. Named in an illegal betting/hawala settlement probe.",
    },
    {
        "full_name": "Aslam Bhatti", "aliases": [], "phone_numbers": [],
        "vehicle_numbers": [], "prior_case_ids": ["FIR-2017/0119"],
        "offense_types": ["Arms Smuggling"], "status": "CLEARED",
        "notes": "Synthetic reference record. Previously investigated for arms smuggling; case closed, cleared.",
    },
    {
        "full_name": "Geeta Fernandes", "aliases": [], "phone_numbers": [],
        "vehicle_numbers": [], "prior_case_ids": ["FIR-2020/0588"],
        "offense_types": ["Land Grabbing & Property Fraud"], "status": "CONVICTED",
        "notes": "Synthetic reference record. Convicted in a forged land-title fraud case.",
    },
    {
        "full_name": "Irfan Qureshi", "aliases": [], "phone_numbers": [],
        "vehicle_numbers": [], "prior_case_ids": ["FIR-2021/0347"],
        "offense_types": ["Counterfeit Currency"], "status": "SUSPECT",
        "notes": "Synthetic reference record. Suspected distributor in a counterfeit currency ring.",
    },
    {
        "full_name": "Baljeet Mann", "aliases": [], "phone_numbers": [],
        "vehicle_numbers": [], "prior_case_ids": ["FIR-2019/0876"],
        "offense_types": ["Organized Extortion"], "status": "CONVICTED",
        "notes": "Synthetic reference record. Convicted, extortion racket targeting local businesses.",
    },
    {
        "full_name": "Priya Bansal", "aliases": [], "phone_numbers": [],
        "vehicle_numbers": [], "prior_case_ids": ["FIR-2022/0410"],
        "offense_types": ["Kidnapping for Ransom"], "status": "SUSPECT",
        "notes": "Synthetic reference record. Suspected accomplice in a ransom-negotiation cell.",
    },
]

def seed_criminal_history_records(db):
    """Pre-seeds the synthetic known-offenders reference table. Only runs
    once -- if the table already has any rows, it is left alone (same
    pattern as seed_default_cases)."""
    if db.query(CriminalHistoryRecord).count() > 0:
        return
    for rec in CRIMINAL_HISTORY_SEED:
        db.add(CriminalHistoryRecord(**rec))
    db.commit()

def upsert_resolved_graph(db, resolved_entities: dict, resolved_triples: list):
    """
    Upserts resolved entity nodes and relationship edges into SQLite database.
    Merges aliases and domains across existing records.
    """
    # 1. Upsert Entities
    for cid, meta in resolved_entities.items():
        existing = db.query(EntityRecord).filter(EntityRecord.id == cid).first()
        new_aliases = list(set(meta.get("aliases", [])))
        new_domains = list(set(meta.get("domains", [])))
        new_phones = list(set(meta.get("phone_numbers", [])))

        if existing:
            merged_aliases = list(set((existing.aliases or []) + new_aliases))
            merged_domains = list(set((existing.domains or []) + new_domains))
            merged_phones = list(set((existing.phone_numbers or []) + new_phones))

            existing.canonical_name = meta.get("canonical_name", existing.canonical_name)
            existing.type = meta.get("type", existing.type)
            existing.aliases = merged_aliases
            existing.domains = merged_domains
            existing.phone_numbers = merged_phones
            if "hub_score" in meta:
                existing.hub_score = meta["hub_score"]
            if "community_cluster" in meta:
                existing.community_cluster = meta["community_cluster"]
            # Sticky, same reasoning as the has_prior_history column comment
            # above: only ever set true here, never reset back to false, so
            # a real match found on an earlier resolution pass survives a
            # later merge that happens not to re-find it.
            if meta.get("has_prior_history"):
                existing.has_prior_history = True
                existing.prior_history_summary = meta.get("prior_history_summary", existing.prior_history_summary)
        else:
            entity_rec = EntityRecord(
                id=cid,
                canonical_name=meta.get("canonical_name", "Unknown"),
                type=meta.get("type", "PERSON"),
                aliases=new_aliases,
                domains=new_domains,
                phone_numbers=new_phones,
                hub_score=meta.get("hub_score", 0.05),
                community_cluster=meta.get("community_cluster", 0),
                has_prior_history=meta.get("has_prior_history", False),
                prior_history_summary=meta.get("prior_history_summary")
            )
            db.add(entity_rec)

    # 2. Upsert Relationships
    seen_rel_ids = set()
    for r in resolved_triples:
        src = str(r.get("source_id", ""))
        tgt = str(r.get("target_id", ""))
        rel_t = str(r.get("relationship_type", "ASSOCIATE_OF"))
        dom = str(r.get("domain", "general"))
        
        rel_id = f"REL_{src}_{tgt}_{rel_t}_{dom}"
        if rel_id in seen_rel_ids:
            continue
        seen_rel_ids.add(rel_id)

        existing_rel = db.query(RelationshipRecord).filter(RelationshipRecord.id == rel_id).first()
        if existing_rel:
            existing_rel.confidence = max(existing_rel.confidence, float(r.get("confidence", 0.9)))
            if r.get("evidence") and r.get("evidence") not in (existing_rel.evidence or ""):
                existing_rel.evidence = f"{existing_rel.evidence}; {r.get('evidence')}" if existing_rel.evidence else r.get("evidence")
        else:
            rel_rec = RelationshipRecord(
                id=rel_id,
                source_id=src,
                source_canonical=r.get("source_canonical", ""),
                relationship_type=rel_t,
                raw_relationship_type=r.get("raw_relationship_type", ""),
                target_id=tgt,
                target_canonical=r.get("target_canonical", ""),
                confidence=float(r.get("confidence", 0.9)),
                domain=dom,
                evidence=r.get("evidence", ""),
                timestamp=r.get("timestamp", datetime.utcnow().strftime("%Y-%m-%d"))
            )
            db.add(rel_rec)

    db.commit()

def seed_default_users(db):
    """Pre-seeds default RBAC users if not present."""
    default_users = [
        ("investigator_01", "Investigate#2026", UserRole.INVESTIGATOR.value, "Field Investigator 01"),
        ("ncrb_admin", "Admin#MHA2026", UserRole.OFFICER_IN_CHARGE.value, "NCRB Administrator"),
        ("judicial_auditor", "Audit#Secure2026", UserRole.AUDITOR.value, "Judicial Compliance Auditor")
    ]
    for username, plain_pass, role, full_name in default_users:
        existing = db.query(User).filter(User.username == username).first()
        if not existing:
            hashed = hash_password(plain_pass)
            u = User(
                username=username,
                hashed_password=hashed,
                role=role,
                full_name=full_name
            )
            db.add(u)
    db.commit()

def migrate_columns():
    """Migrates newly added columns in SQLite tables safely."""
    from sqlalchemy import text
    with engine.connect() as conn:
        migrations = [
            ("entities", "verified_by_officer", "BOOLEAN DEFAULT FALSE"),
            ("entities", "status", "VARCHAR DEFAULT 'ACTIVE'"),
            ("relationships", "verified_by_officer", "BOOLEAN DEFAULT FALSE"),
            ("relationships", "weight_multiplier", "FLOAT DEFAULT 1.0"),
            ("relationships", "status", "VARCHAR DEFAULT 'ACTIVE'"),
            ("relationships", "timestamp", "VARCHAR"),
            ("document_metadata", "sha256_hash", "VARCHAR"),
            ("audit_logs", "content_hash", "VARCHAR"),
            ("audit_logs", "prev_hash", "VARCHAR"),
            ("audit_logs", "entry_hash", "VARCHAR"),
            ("entities", "has_prior_history", "BOOLEAN DEFAULT FALSE"),
            ("entities", "prior_history_summary", "TEXT"),
        ]
        for table, col, col_type in migrations:
            try:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}"))
                conn.commit()
            except Exception:
                # On Postgres, a failed statement (e.g. "column already
                # exists" for a migration applied in an earlier run) leaves
                # the connection's transaction poisoned -- every later
                # statement on it fails too, with "current transaction is
                # aborted", until a rollback. Without this, one already-
                # applied migration anywhere earlier in the list silently
                # broke every migration after it, including genuinely new
                # ones that had never run yet. SQLite has no such state to
                # clean up, so rollback() is a safe no-op there.
                conn.rollback()

def init_db():
    _print_startup_db_banner()
    Base.metadata.create_all(bind=engine)
    migrate_columns()
    db = SessionLocal()
    try:
        if os.getenv("DEMO_MODE", "false").lower() == "true":
            seed_default_users(db)
        seed_default_cases(db)
        seed_criminal_history_records(db)
    finally:
        db.close()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
