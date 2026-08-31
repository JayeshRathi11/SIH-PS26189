import os
from enum import Enum
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
RAW_DIR = DATA_DIR / "raw"
PROCESSED_DIR = DATA_DIR / "processed"
STRUCTURED_DIR = DATA_DIR / "structured"
PREDICTIONS_DIR = DATA_DIR / "predictions"

os.makedirs(PROCESSED_DIR, exist_ok=True)
os.makedirs(STRUCTURED_DIR, exist_ok=True)
os.makedirs(PREDICTIONS_DIR, exist_ok=True)

DOMAINS = [
    "01_narcotics_trafficking",
    "02_human_trafficking",
    "03_cyber_financial_fraud",
    "04_arms_smuggling",
    "05_organized_extortion",
    "06_kidnapping_for_ransom",
    "07_counterfeit_currency",
    "08_illegal_betting_hawala",
    "09_vehicle_theft_ring",
    "10_land_grabbing_fraud",
]


class EntityType(str, Enum):
    """
    Mandated 10-Node POLE Knowledge Graph Entity Schema.
    Covers all primary investigative entities, structural events, cases, and digital documents.
    """
    # Core POLE Entity Types (6)
    PERSON = "PERSON"
    ORGANIZATION = "ORGANIZATION"
    LOCATION = "LOCATION"
    VEHICLE = "VEHICLE"
    PHONE_NUMBER = "PHONE_NUMBER"
    BANK_ACCOUNT = "BANK_ACCOUNT"
    FINANCIAL_ACCOUNT = "BANK_ACCOUNT"

    # Expanded 10-Node POLE Types (4)
    TRANSACTION = "TRANSACTION"  # Financial transfer / Hawala routing node
    CASE = "CASE"                # FIR / Court Case container
    EVENT = "EVENT"              # Intercept, Raid, Drop, Meeting event
    DOCUMENT = "DOCUMENT"        # Digital evidence, CDR, FIR text, Seizure memo


class MasterRelationshipType(str, Enum):
    """Canonical Master Relationship Types."""
    ASSOCIATE_OF = "ASSOCIATE_OF"
    LEADS_ORGANIZATION = "LEADS_ORGANIZATION"
    FINANCIAL_TRANSACTION_WITH = "FINANCIAL_TRANSACTION_WITH"
    LOCATED_AT = "LOCATED_AT"
    CALLED = "CALLED"
    OPERATES_VEHICLE = "OPERATES_VEHICLE"
    PARTICIPATED_IN_EVENT = "PARTICIPATED_IN_EVENT"
    OCCURRED_AT_EVENT = "OCCURRED_AT_EVENT"
    CASE_INVOLVES = "CASE_INVOLVES"
    TRANSACTION_INVOLVES = "TRANSACTION_INVOLVES"
    EVIDENCE_IN_DOCUMENT = "EVIDENCE_IN_DOCUMENT"
    PROVENANCE_FROM_DOCUMENT = "PROVENANCE_FROM_DOCUMENT"
    FAMILY_RELATION_OF = "FAMILY_RELATION_OF"
    CO_LOCATED_WITH = "CO_LOCATED_WITH"


# Temporal Analytics Parameters
DEFAULT_TIME_DECAY_HALF_LIFE_DAYS = 180.0
TEMPORAL_ANALYTICS_ENABLED = True
