import os
from enum import Enum
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
RAW_TEXT_DIR = DATA_DIR / "raw_text"
GROUND_TRUTH_DIR = DATA_DIR / "ground_truth"
STRUCTURED_DIR = DATA_DIR / "structured"
PROCESSED_DIR = DATA_DIR / "processed"

# Ensure directories exist
for p in [DATA_DIR, RAW_TEXT_DIR, GROUND_TRUTH_DIR, STRUCTURED_DIR, PROCESSED_DIR]:
    p.mkdir(parents=True, exist_ok=True)

# Master Entity Types
class EntityType(str, Enum):
    PERSON = "PERSON"
    ORGANIZATION = "ORGANIZATION"
    LOCATION = "LOCATION"
    VEHICLE = "VEHICLE"
    PHONE_NUMBER = "PHONE_NUMBER"
    FINANCIAL_ACCOUNT = "FINANCIAL_ACCOUNT"
    BANK_ACCOUNT = "BANK_ACCOUNT"
    DOCUMENT_FRONT = "DOCUMENT_FRONT"

# Master Relationship Types (7-type schema)
class MasterRelationshipType(str, Enum):
    CO_LOCATED_WITH = "CO_LOCATED_WITH"
    ASSOCIATE_OF = "ASSOCIATE_OF"
    FINANCIAL_TRANSACTION_WITH = "FINANCIAL_TRANSACTION_WITH"
    OWNS_VEHICLE = "OWNS_VEHICLE"
    CALLED = "CALLED"
    MEMBERSHIP_OF = "MEMBERSHIP_OF"
    LEADS_ORGANIZATION = "LEADS_ORGANIZATION"

# 10 Crime Domains Registry
DOMAINS = {
    "01_narcotics_trafficking": {
        "id": "01",
        "name": "Narcotics Trafficking",
        "folder": "01_narcotics_trafficking",
        "hub_alias": "Sethji",
        "canonical_name": "Iqbal Ansari"
    },
    "02_human_trafficking": {
        "id": "02",
        "name": "Human Trafficking",
        "folder": "02_human_trafficking",
        "hub_alias": "the contact",
        "canonical_name": "Iqbal Ansari"
    },
    "03_cyber_financial_fraud": {
        "id": "03",
        "name": "Cyber Financial Fraud",
        "folder": "03_cyber_financial_fraud",
        "hub_alias": "the director",
        "canonical_name": "Iqbal Ansari"
    },
    "04_arms_smuggling": {
        "id": "04",
        "name": "Arms Smuggling",
        "folder": "04_arms_smuggling",
        "hub_alias": "the financier",
        "canonical_name": "Iqbal Ansari"
    },
    "05_organized_extortion": {
        "id": "05",
        "name": "Organized Extortion",
        "folder": "05_organized_extortion",
        "hub_alias": "Bhai",
        "canonical_name": "Iqbal Ansari"
    },
    "06_kidnapping_for_ransom": {
        "id": "06",
        "name": "Kidnapping for Ransom",
        "folder": "06_kidnapping_for_ransom",
        "hub_alias": "the negotiator",
        "canonical_name": "Iqbal Ansari"
    },
    "07_counterfeit_currency": {
        "id": "07",
        "name": "Counterfeit Currency",
        "folder": "07_counterfeit_currency",
        "hub_alias": "the source contact",
        "canonical_name": "Iqbal Ansari"
    },
    "08_illegal_betting_hawala": {
        "id": "08",
        "name": "Illegal Betting & Hawala",
        "folder": "08_illegal_betting_hawala",
        "hub_alias": "the controller",
        "canonical_name": "Iqbal Ansari"
    },
    "09_vehicle_theft_ring": {
        "id": "09",
        "name": "Vehicle Theft & Re-Registration",
        "folder": "09_vehicle_theft_ring",
        "hub_alias": "the buyer",
        "canonical_name": "Iqbal Ansari"
    },
    "10_land_grabbing_fraud": {
        "id": "10",
        "name": "Land Grabbing & Property Fraud",
        "folder": "10_land_grabbing_fraud",
        "hub_alias": "the fixer",
        "canonical_name": "Iqbal Ansari"
    }
}
