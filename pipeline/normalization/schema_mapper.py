from typing import Dict, Any
from pipeline.config import MasterRelationshipType, EntityType

# Relation Mapping Table
RELATION_MAPPING = {
    # CO_LOCATED_WITH
    "MET": MasterRelationshipType.CO_LOCATED_WITH.value,
    "COORDINATED_MOVEMENT": MasterRelationshipType.CO_LOCATED_WITH.value,
    "CO_LOCATED_WITH": MasterRelationshipType.CO_LOCATED_WITH.value,

    # ASSOCIATE_OF
    "INSTRUCTED": MasterRelationshipType.ASSOCIATE_OF.value,
    "ASSOCIATED_WITH": MasterRelationshipType.ASSOCIATE_OF.value,
    "FORGED_DOCUMENT_FOR": MasterRelationshipType.ASSOCIATE_OF.value,
    "ARRANGED_RANSOM_DROP": MasterRelationshipType.ASSOCIATE_OF.value,
    "DISTRIBUTED_CONSIGNMENT": MasterRelationshipType.ASSOCIATE_OF.value,
    "ASSOCIATE_OF": MasterRelationshipType.ASSOCIATE_OF.value,
    "RECRUITED": MasterRelationshipType.ASSOCIATE_OF.value,
    "ENFORCED_FOR": MasterRelationshipType.ASSOCIATE_OF.value,

    # FINANCIAL_TRANSACTION_WITH
    "ARRANGED_PAYMENT": MasterRelationshipType.FINANCIAL_TRANSACTION_WITH.value,
    "ARRANGED_FUNDS": MasterRelationshipType.FINANCIAL_TRANSACTION_WITH.value,
    "RECEIVED_PAYMENT": MasterRelationshipType.FINANCIAL_TRANSACTION_WITH.value,
    "SETTLED_PAYMENT_VIA_HAWALA": MasterRelationshipType.FINANCIAL_TRANSACTION_WITH.value,
    "FINANCIAL_TRANSACTION_WITH": MasterRelationshipType.FINANCIAL_TRANSACTION_WITH.value,
    "TRANSFERRED_FUNDS": MasterRelationshipType.FINANCIAL_TRANSACTION_WITH.value,

    # OWNS_VEHICLE
    "HANDED_OFF_VEHICLE": MasterRelationshipType.OWNS_VEHICLE.value,
    "RE_REGISTERED_VEHICLE": MasterRelationshipType.OWNS_VEHICLE.value,
    "OWNS_VEHICLE": MasterRelationshipType.OWNS_VEHICLE.value,
    "USED_VEHICLE": MasterRelationshipType.OWNS_VEHICLE.value,

    # CALLED
    "CALLED": MasterRelationshipType.CALLED.value,

    # MEMBERSHIP_OF
    "MEMBERSHIP_OF": MasterRelationshipType.MEMBERSHIP_OF.value,
    "MEMBER_OF": MasterRelationshipType.MEMBERSHIP_OF.value,

    # LEADS_ORGANIZATION
    "LEADS_ORGANIZATION": MasterRelationshipType.LEADS_ORGANIZATION.value,
    "HEAD_OF": MasterRelationshipType.LEADS_ORGANIZATION.value,
    "MANAGES": MasterRelationshipType.LEADS_ORGANIZATION.value,
}

# Entity Type Normalization Table
ENTITY_TYPE_MAPPING = {
    "PHONE": EntityType.PHONE_NUMBER.value,
    "PHONE_NUMBER": EntityType.PHONE_NUMBER.value,
    "PERSON": EntityType.PERSON.value,
    "ORGANIZATION": EntityType.ORGANIZATION.value,
    "LOCATION": EntityType.LOCATION.value,
    "VEHICLE": EntityType.VEHICLE.value,
    "FINANCIAL_ACCOUNT": EntityType.FINANCIAL_ACCOUNT.value,
    "DOCUMENT_FRONT": EntityType.DOCUMENT_FRONT.value,
}

def normalize_entity_type(raw_type: str) -> str:
    cleaned = (raw_type or "").strip().upper()
    return ENTITY_TYPE_MAPPING.get(cleaned, EntityType.PERSON.value)

def normalize_relationship(rel_dict: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normalizes a extracted relationship dictionary to master schema while preserving raw_relationship_type.
    """
    raw_rel = rel_dict.get("relationship_type", "").strip().upper()
    master_rel = RELATION_MAPPING.get(raw_rel, MasterRelationshipType.ASSOCIATE_OF.value)
    
    normalized = dict(rel_dict)
    normalized["raw_relationship_type"] = raw_rel
    normalized["relationship_type"] = master_rel
    return normalized
