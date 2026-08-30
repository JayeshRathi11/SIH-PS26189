import os
from sqlalchemy import create_engine, Column, String, Integer, Float, DateTime, Text, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./nexustrace.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

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

    doc_id = Column(String, primary_key=True, index=True)
    domain = Column(String, index=True)
    doc_type = Column(String)
    source_file = Column(String)
    parsed_json = Column(JSON)

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
