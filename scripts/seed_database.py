import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.db import init_db, SessionLocal, upsert_resolved_graph
from pipeline.config import DOMAINS, EntityType, MasterRelationshipType
from pipeline.graph.analytics import GraphAnalyticsEngine

def seed_database():
    init_db()
    db = SessionLocal()

    # 1. Central Hub Entity (Iqbal Ansari) shared across all 10 domains
    hub_entity = {
        "canonical_id": "ENT_HUB_IQBAL_ANSARI",
        "canonical_name": "Iqbal Ansari",
        "type": EntityType.PERSON.value,
        "aliases": [
            "Sethji", "Bhai", "the contact", "the director", "the financier",
            "the negotiator", "the source contact", "the controller", "the buyer", "the fixer", "Iqbal Ansari"
        ],
        "phone_numbers": ["9987012345"],
        "domains": list(DOMAINS.keys())
    }

    # 2. Shared Cross-Domain Identifiers
    shared_phone = {
        "canonical_id": "ENT_PHONE_9987012345",
        "canonical_name": "+91 99870 12345",
        "type": EntityType.PHONE_NUMBER.value,
        "aliases": ["+91 99870 12345"],
        "phone_numbers": ["9987012345"],
        "domains": ["01_narcotics_trafficking", "05_organized_extortion", "08_illegal_betting_hawala"]
    }

    shared_vehicle = {
        "canonical_id": "VEH_KA05MN4321_TN09PQ7788",
        "canonical_name": "KA05MN4321 / TN09PQ7788",
        "type": EntityType.VEHICLE.value,
        "aliases": ["KA05MN4321", "TN09PQ7788"],
        "phone_numbers": [],
        "domains": ["04_arms_smuggling", "09_vehicle_theft_ring"]
    }

    # 3. Organizations
    org_ia_digital = {
        "canonical_id": "ENT_ORG_IA_DIGITAL",
        "canonical_name": "IA Digital Ventures Pvt Ltd",
        "type": EntityType.ORGANIZATION.value,
        "aliases": ["IA Digital Ventures"],
        "phone_numbers": [],
        "domains": ["03_cyber_financial_fraud", "08_illegal_betting_hawala"]
    }

    org_sunrise = {
        "canonical_id": "ENT_ORG_SUNRISE_PLACEMENT",
        "canonical_name": "Sunrise Placement Services",
        "type": EntityType.ORGANIZATION.value,
        "aliases": ["Sunrise Placement"],
        "phone_numbers": [],
        "domains": ["02_human_trafficking"]
    }

    # 4. Operatives Across 10 Domains
    domain_operatives = [
        # Domain 01
        {"canonical_id": "ENT_PERSON_DEVENDRA_SOLANKI", "canonical_name": "Devendra Solanki", "type": EntityType.PERSON.value, "aliases": ["Bunty"], "domains": ["01_narcotics_trafficking"]},
        {"canonical_id": "ENT_PERSON_ILIYAS_KHAN", "canonical_name": "Iliyas Khan", "type": EntityType.PERSON.value, "aliases": ["Iliyas"], "domains": ["01_narcotics_trafficking"]},
        # Domain 02
        {"canonical_id": "ENT_PERSON_MANOJ_TIWARI", "canonical_name": "Manoj Tiwari", "type": EntityType.PERSON.value, "aliases": ["Manoj"], "domains": ["02_human_trafficking"]},
        {"canonical_id": "ENT_PERSON_RINA_DAS", "canonical_name": "Rina Das", "type": EntityType.PERSON.value, "aliases": ["Rina"], "domains": ["02_human_trafficking"]},
        # Domain 03
        {"canonical_id": "ENT_PERSON_ROHIT_CHAURASIA", "canonical_name": "Rohit Chaurasia", "type": EntityType.PERSON.value, "aliases": ["Rohit"], "domains": ["03_cyber_financial_fraud"]},
        {"canonical_id": "ENT_PERSON_FARHAN_QURESHI", "canonical_name": "Farhan Qureshi", "type": EntityType.PERSON.value, "aliases": ["Farhan"], "domains": ["03_cyber_financial_fraud"]},
        # Domain 04
        {"canonical_id": "ENT_PERSON_HARJEET_SINGH", "canonical_name": "Harjeet Singh", "type": EntityType.PERSON.value, "aliases": ["Harjeet"], "domains": ["04_arms_smuggling"]},
        {"canonical_id": "ENT_PERSON_WASEEM_AKHTAR", "canonical_name": "Waseem Akhtar", "type": EntityType.PERSON.value, "aliases": ["Waseem"], "domains": ["04_arms_smuggling"]},
        # Domain 05
        {"canonical_id": "ENT_PERSON_RAKESH_PAWAR", "canonical_name": "Rakesh Pawar", "type": EntityType.PERSON.value, "aliases": ["Rocky"], "domains": ["05_organized_extortion"]},
        {"canonical_id": "ENT_PERSON_SALIM_SHEIKH", "canonical_name": "Salim Sheikh", "type": EntityType.PERSON.value, "aliases": ["Salim"], "domains": ["05_organized_extortion"]},
        # Domain 06
        {"canonical_id": "ENT_PERSON_SUNIL_YADAV", "canonical_name": "Sunil Yadav", "type": EntityType.PERSON.value, "aliases": ["Sunil"], "domains": ["06_kidnapping_for_ransom"]},
        {"canonical_id": "ENT_PERSON_AJAY_BHONSLE", "canonical_name": "Ajay Bhonsle", "type": EntityType.PERSON.value, "aliases": ["Ajay"], "domains": ["06_kidnapping_for_ransom"]},
        # Domain 07
        {"canonical_id": "ENT_PERSON_NASEER_AHMED", "canonical_name": "Naseer Ahmed", "type": EntityType.PERSON.value, "aliases": ["Naseer"], "domains": ["07_counterfeit_currency"]},
        {"canonical_id": "ENT_PERSON_VIKAS_CHOPRA", "canonical_name": "Vikas Chopra", "type": EntityType.PERSON.value, "aliases": ["Vikas"], "domains": ["07_counterfeit_currency"]},
        # Domain 08
        {"canonical_id": "ENT_PERSON_DEEPAK_MALHOTRA", "canonical_name": "Deepak Malhotra", "type": EntityType.PERSON.value, "aliases": ["Deepak"], "domains": ["08_illegal_betting_hawala"]},
        {"canonical_id": "ENT_PERSON_RIZWAN_ALI", "canonical_name": "Rizwan Ali", "type": EntityType.PERSON.value, "aliases": ["Rizwan"], "domains": ["08_illegal_betting_hawala"]},
        # Domain 09
        {"canonical_id": "ENT_PERSON_ANIL_KAMBLE", "canonical_name": "Anil Kamble", "type": EntityType.PERSON.value, "aliases": ["Anil"], "domains": ["09_vehicle_theft_ring"]},
        {"canonical_id": "ENT_PERSON_RAMESH_NAIDU", "canonical_name": "Ramesh Naidu", "type": EntityType.PERSON.value, "aliases": ["Ramesh"], "domains": ["09_vehicle_theft_ring"]},
        # Domain 10
        {"canonical_id": "ENT_PERSON_PRAKASH_JADHAV", "canonical_name": "Prakash Jadhav", "type": EntityType.PERSON.value, "aliases": ["Prakash"], "domains": ["10_land_grabbing_fraud"]},
        {"canonical_id": "ENT_PERSON_RAJENDRA_KULKARNI", "canonical_name": "Rajendra Kulkarni", "type": EntityType.PERSON.value, "aliases": ["Rajendra"], "domains": ["10_land_grabbing_fraud"]}
    ]

    all_entities = [hub_entity, shared_phone, shared_vehicle, org_ia_digital, org_sunrise] + domain_operatives
    entity_dict = {e["canonical_id"]: e for e in all_entities}

    # 5. Core Relationship Triples
    relationships = [
        # Hub to operatives across domains
        {"source_id": "ENT_HUB_IQBAL_ANSARI", "source_canonical": "Iqbal Ansari", "relationship_type": MasterRelationshipType.ASSOCIATE_OF.value, "target_id": "ENT_PERSON_DEVENDRA_SOLANKI", "target_canonical": "Devendra Solanki", "confidence": 0.95, "domain": "01_narcotics_trafficking", "evidence": "Sethji contacted Bunty regarding narcotics shipment."},
        {"source_id": "ENT_PERSON_DEVENDRA_SOLANKI", "source_canonical": "Devendra Solanki", "relationship_type": MasterRelationshipType.ASSOCIATE_OF.value, "target_id": "ENT_PERSON_ILIYAS_KHAN", "target_canonical": "Iliyas Khan", "confidence": 0.90, "domain": "01_narcotics_trafficking", "evidence": "Bunty coordinated with Iliyas Khan near port."},

        {"source_id": "ENT_HUB_IQBAL_ANSARI", "source_canonical": "Iqbal Ansari", "relationship_type": MasterRelationshipType.LEADS_ORGANIZATION.value, "target_id": "ENT_ORG_SUNRISE_PLACEMENT", "target_canonical": "Sunrise Placement Services", "confidence": 0.92, "domain": "02_human_trafficking", "evidence": "The contact directs recruitment via Sunrise Placement."},
        {"source_id": "ENT_PERSON_MANOJ_TIWARI", "source_canonical": "Manoj Tiwari", "relationship_type": MasterRelationshipType.MEMBERSHIP_OF.value, "target_id": "ENT_ORG_SUNRISE_PLACEMENT", "target_canonical": "Sunrise Placement Services", "confidence": 0.88, "domain": "02_human_trafficking", "evidence": "Manoj Tiwari operates recruitment desk."},

        {"source_id": "ENT_HUB_IQBAL_ANSARI", "source_canonical": "Iqbal Ansari", "relationship_type": MasterRelationshipType.LEADS_ORGANIZATION.value, "target_id": "ENT_ORG_IA_DIGITAL", "target_canonical": "IA Digital Ventures Pvt Ltd", "confidence": 0.96, "domain": "03_cyber_financial_fraud", "evidence": "The director controls payment gateway accounts."},
        {"source_id": "ENT_PERSON_ROHIT_CHAURASIA", "source_canonical": "Rohit Chaurasia", "relationship_type": MasterRelationshipType.FINANCIAL_TRANSACTION_WITH.value, "target_id": "ENT_ORG_IA_DIGITAL", "target_canonical": "IA Digital Ventures Pvt Ltd", "confidence": 0.91, "domain": "03_cyber_financial_fraud", "evidence": "Phishing proceeds routed to IA Digital account."},

        {"source_id": "ENT_HUB_IQBAL_ANSARI", "source_canonical": "Iqbal Ansari", "relationship_type": MasterRelationshipType.ASSOCIATE_OF.value, "target_id": "ENT_PERSON_HARJEET_SINGH", "target_canonical": "Harjeet Singh", "confidence": 0.94, "domain": "04_arms_smuggling", "evidence": "The financier funded weapon consignment."},
        {"source_id": "ENT_PERSON_HARJEET_SINGH", "source_canonical": "Harjeet Singh", "relationship_type": MasterRelationshipType.OWNS_VEHICLE.value, "target_id": "VEH_KA05MN4321_TN09PQ7788", "target_canonical": "KA05MN4321 / TN09PQ7788", "confidence": 0.95, "domain": "04_arms_smuggling", "evidence": "Weapon shipment transported in vehicle KA05MN4321."},

        {"source_id": "ENT_HUB_IQBAL_ANSARI", "source_canonical": "Iqbal Ansari", "relationship_type": MasterRelationshipType.CALLED.value, "target_id": "ENT_PHONE_9987012345", "target_canonical": "+91 99870 12345", "confidence": 0.98, "domain": "05_organized_extortion", "evidence": "Bhai issued extortion demands via phone +91 99870 12345."},
        {"source_id": "ENT_PERSON_RAKESH_PAWAR", "source_canonical": "Rakesh Pawar", "relationship_type": MasterRelationshipType.ASSOCIATE_OF.value, "target_id": "ENT_HUB_IQBAL_ANSARI", "target_canonical": "Iqbal Ansari", "confidence": 0.93, "domain": "05_organized_extortion", "evidence": "Rocky delivered extortion note on instructions from Bhai."},

        {"source_id": "ENT_HUB_IQBAL_ANSARI", "source_canonical": "Iqbal Ansari", "relationship_type": MasterRelationshipType.ASSOCIATE_OF.value, "target_id": "ENT_PERSON_SUNIL_YADAV", "target_canonical": "Sunil Yadav", "confidence": 0.89, "domain": "06_kidnapping_for_ransom", "evidence": "The negotiator directed ransom calls to victim family."},
        {"source_id": "ENT_HUB_IQBAL_ANSARI", "source_canonical": "Iqbal Ansari", "relationship_type": MasterRelationshipType.FINANCIAL_TRANSACTION_WITH.value, "target_id": "ENT_PERSON_NASEER_AHMED", "target_canonical": "Naseer Ahmed", "confidence": 0.90, "domain": "07_counterfeit_currency", "evidence": "The source contact supplied fake currency notes."},
        {"source_id": "ENT_HUB_IQBAL_ANSARI", "source_canonical": "Iqbal Ansari", "relationship_type": MasterRelationshipType.LEADS_ORGANIZATION.value, "target_id": "ENT_PERSON_DEEPAK_MALHOTRA", "target_canonical": "Deepak Malhotra", "confidence": 0.95, "domain": "08_illegal_betting_hawala", "evidence": "The controller managed hawala ledger transfers."},
        {"source_id": "ENT_PERSON_ANIL_KAMBLE", "source_canonical": "Anil Kamble", "relationship_type": MasterRelationshipType.OWNS_VEHICLE.value, "target_id": "VEH_KA05MN4321_TN09PQ7788", "target_canonical": "KA05MN4321 / TN09PQ7788", "confidence": 0.93, "domain": "09_vehicle_theft_ring", "evidence": "Stolen vehicle re-registered under false chassis number."},
        {"source_id": "ENT_HUB_IQBAL_ANSARI", "source_canonical": "Iqbal Ansari", "relationship_type": MasterRelationshipType.ASSOCIATE_OF.value, "target_id": "ENT_PERSON_PRAKASH_JADHAV", "target_canonical": "Prakash Jadhav", "confidence": 0.91, "domain": "10_land_grabbing_fraud", "evidence": "The fixer facilitated forged land registry deeds."}
    ]

    # 6. Compute Centrality & Community Analytics
    analytics = GraphAnalyticsEngine(list(entity_dict.values()), relationships)
    ranked_hubs = {h["entity_id"]: h for h in analytics.get_ranked_key_influencers(top_n=500)}

    for cid, meta in entity_dict.items():
        hub_info = ranked_hubs.get(cid, {})
        meta["hub_score"] = hub_info.get("combined_hub_score", 0.05)
        meta["community_cluster"] = hub_info.get("community_cluster", 0)

    # 7. Seed to Database
    upsert_resolved_graph(db, entity_dict, relationships)
    db.close()
    print(f"[Seed] Successfully seeded {len(entity_dict)} entities and {len(relationships)} relationships into nexustrace.db!")

if __name__ == "__main__":
    seed_database()
