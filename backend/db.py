import os
import uuid
import hashlib
import json as _json
from enum import Enum
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
        else:
            entity_rec = EntityRecord(
                id=cid,
                canonical_name=meta.get("canonical_name", "Unknown"),
                type=meta.get("type", "PERSON"),
                aliases=new_aliases,
                domains=new_domains,
                phone_numbers=new_phones,
                hub_score=meta.get("hub_score", 0.05),
                community_cluster=meta.get("community_cluster", 0)
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
            ("audit_logs", "entry_hash", "VARCHAR")
        ]
        for table, col, col_type in migrations:
            try:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}"))
                conn.commit()
            except Exception:
                pass

def init_db():
    Base.metadata.create_all(bind=engine)
    migrate_columns()
    db = SessionLocal()
    try:
        seed_default_users(db)
    finally:
        db.close()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
