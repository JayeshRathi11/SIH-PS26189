import logging
from typing import Dict, Any
from pipeline.config import EntityType, MasterRelationshipType

logger = logging.getLogger(__name__)

RELATIONSHIP_MAPPING = {
    "INSTRUCTED": MasterRelationshipType.ASSOCIATE_OF.value,
    "ORDERS": MasterRelationshipType.ASSOCIATE_OF.value,
    "COMMANDED": MasterRelationshipType.ASSOCIATE_OF.value,
    "TASKED": MasterRelationshipType.ASSOCIATE_OF.value,
    "DIRECTED": MasterRelationshipType.ASSOCIATE_OF.value,
    "MET_WITH": MasterRelationshipType.ASSOCIATE_OF.value,
    "CONTACTED": MasterRelationshipType.ASSOCIATE_OF.value,
    "ASSOCIATE_OF": MasterRelationshipType.ASSOCIATE_OF.value,
    "CO_CONSPIRATOR": MasterRelationshipType.ASSOCIATE_OF.value,
    "LEADS": MasterRelationshipType.LEADS_ORGANIZATION.value,
    "LEADS_ORGANIZATION": MasterRelationshipType.LEADS_ORGANIZATION.value,
    "BENEFICIAL_OWNER_OF": MasterRelationshipType.LEADS_ORGANIZATION.value,
    "DIRECTOR_OF": MasterRelationshipType.LEADS_ORGANIZATION.value,
    "TRANSFERRED": MasterRelationshipType.FINANCIAL_TRANSACTION_WITH.value,
    "PAID": MasterRelationshipType.FINANCIAL_TRANSACTION_WITH.value,
    "WIRED": MasterRelationshipType.FINANCIAL_TRANSACTION_WITH.value,
    "ROUTED": MasterRelationshipType.FINANCIAL_TRANSACTION_WITH.value,
    "FINANCIAL_TRANSACTION_WITH": MasterRelationshipType.FINANCIAL_TRANSACTION_WITH.value,
    "SETTLED_PAYMENT_VIA_HAWALA": MasterRelationshipType.FINANCIAL_TRANSACTION_WITH.value,
    "SPOTTED_AT": MasterRelationshipType.LOCATED_AT.value,
    "LOCATED_AT": MasterRelationshipType.LOCATED_AT.value,
    "RESIDING_AT": MasterRelationshipType.LOCATED_AT.value,
    "ARRIVED_AT": MasterRelationshipType.LOCATED_AT.value,
    "CALLED": MasterRelationshipType.CALLED.value,
    "TELEPHONED": MasterRelationshipType.CALLED.value,
    "DRIVING": MasterRelationshipType.OPERATES_VEHICLE.value,
    "OPERATES_VEHICLE": MasterRelationshipType.OPERATES_VEHICLE.value,
    "TRANSPORTED_IN": MasterRelationshipType.OPERATES_VEHICLE.value,
    "PARTICIPATED_IN_EVENT": MasterRelationshipType.PARTICIPATED_IN_EVENT.value,
    "CASE_INVOLVES": MasterRelationshipType.CASE_INVOLVES.value,
    "TRANSACTION_INVOLVES": MasterRelationshipType.TRANSACTION_INVOLVES.value,
    "EVIDENCE_IN_DOCUMENT": MasterRelationshipType.EVIDENCE_IN_DOCUMENT.value
}


def normalize_relationship(rel_dict: Dict[str, Any]) -> Dict[str, Any]:
    raw_rel = rel_dict.get("relationship_type", "ASSOCIATE_OF")
    normalized_rel = RELATIONSHIP_MAPPING.get(raw_rel.upper(), MasterRelationshipType.ASSOCIATE_OF.value)
    
    return {
        "source": rel_dict.get("source"),
        "source_type": normalize_entity_type(rel_dict.get("source_type", "PERSON")),
        "relationship_type": normalized_rel,
        "raw_relationship_type": raw_rel,
        "target": rel_dict.get("target"),
        "target_type": normalize_entity_type(rel_dict.get("target_type", "PERSON")),
        "confidence": rel_dict.get("confidence", 0.90),
        "timestamp": rel_dict.get("timestamp"),
        "evidence": rel_dict.get("evidence", "")
    }


def normalize_entity_type(raw_type: str) -> str:
    upper = (raw_type or "").upper().strip()
    if upper in ["PERSON", "SUSPECT", "OPERATIVE", "WITNESS"]:
        return EntityType.PERSON.value
    if upper in ["ORGANIZATION", "ORG", "COMPANY", "SHELL_COMPANY", "SYNDICATE"]:
        return EntityType.ORGANIZATION.value
    if upper in ["LOCATION", "LOC", "PLACE", "ADDRESS", "SAFEHOUSE"]:
        return EntityType.LOCATION.value
    if upper in ["VEHICLE", "CAR", "TRUCK"]:
        return EntityType.VEHICLE.value
    if upper in ["PHONE_NUMBER", "PHONE", "MSISDN"]:
        return EntityType.PHONE_NUMBER.value
    if upper in ["BANK_ACCOUNT", "ACCOUNT", "MULE_ACCOUNT"]:
        return EntityType.BANK_ACCOUNT.value
    if upper in ["TRANSACTION", "PAYMENT"]:
        return EntityType.TRANSACTION.value
    if upper in ["CASE", "FIR"]:
        return EntityType.CASE.value
    if upper in ["EVENT", "INCIDENT"]:
        return EntityType.EVENT.value
    if upper in ["DOCUMENT", "DOC"]:
        return EntityType.DOCUMENT.value
    return EntityType.PERSON.value
