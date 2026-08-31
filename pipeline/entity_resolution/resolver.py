import re
import logging
from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime

from pipeline.ner.entity import EntityMention
from pipeline.entity_resolution.models import CanonicalEntity
from pipeline.config import EntityType

logger = logging.getLogger(__name__)

# Known Master Syndicate Aliases (Cross-domain ground-truth mappings)
KNOWN_MASTER_ALIASES: Dict[str, Tuple[str, str]] = {
    "sethji": ("ENT_HUB_IQBAL_ANSARI", "Iqbal Ansari"),
    "bhai": ("ENT_HUB_IQBAL_ANSARI", "Iqbal Ansari"),
    "iqbal ansari": ("ENT_HUB_IQBAL_ANSARI", "Iqbal Ansari"),
    "iqbal": ("ENT_HUB_IQBAL_ANSARI", "Iqbal Ansari"),
    "doctor": ("ENT_PERSON_DR_MUKHERJEE", "Dr. S. Mukherjee"),
    "dr. mukherjee": ("ENT_PERSON_DR_MUKHERJEE", "Dr. S. Mukherjee"),
    "captain": ("ENT_PERSON_CAPTAIN_RANA", "Captain Vikram Rana"),
    "vikram rana": ("ENT_PERSON_CAPTAIN_RANA", "Captain Vikram Rana"),
    "farhan qureshi": ("ENT_PERSON_FARHAN_QURESHI", "Farhan Qureshi"),
    "farhan": ("ENT_PERSON_FARHAN_QURESHI", "Farhan Qureshi"),
    "iliyas khan": ("ENT_PERSON_ILIYAS_KHAN", "Iliyas Khan"),
    "iliyas": ("ENT_PERSON_ILIYAS_KHAN", "Iliyas Khan"),
    "devendra solanki": ("ENT_PERSON_DEVENDRA_SOLANKI", "Devendra Solanki"),
    "devendra": ("ENT_PERSON_DEVENDRA_SOLANKI", "Devendra Solanki"),
    "ajay bhonsle": ("ENT_PERSON_AJAY_BHONSLE", "Ajay Bhonsle"),
    "ajay": ("ENT_PERSON_AJAY_BHONSLE", "Ajay Bhonsle"),
    "sunil yadav": ("ENT_PERSON_SUNIL_YADAV", "Sunil Yadav"),
    "sunil": ("ENT_PERSON_SUNIL_YADAV", "Sunil Yadav"),
    "rina das": ("ENT_PERSON_RINA_DAS", "Rina Das"),
    "rina": ("ENT_PERSON_RINA_DAS", "Rina Das"),
}


class RuleBasedEntityResolver:
    """
    Deterministic and conservative cross-document Entity Resolver.
    Assigns stable canonical IDs, aggregates aliases, and maps master syndicate hubs.
    """

    def __init__(self, alias_map: Optional[Dict[str, Tuple[str, str]]] = None):
        self.alias_map = alias_map or KNOWN_MASTER_ALIASES

    def resolve_entity(self, name: str, entity_type: str, domain: str = "") -> Tuple[str, str]:
        """Resolves a raw entity mention text to (canonical_id, canonical_name)."""
        clean_name = name.strip()
        norm_key = clean_name.lower()

        # 1. Direct match in Known Master Aliases
        if norm_key in self.alias_map:
            return self.alias_map[norm_key]

        # 2. Canonical ID generation by type and sanitized name
        sanitized_slug = re.sub(r"[^A-Z0-9_]+", "_", clean_name.upper()).strip("_")
        if not sanitized_slug:
            sanitized_slug = "UNKNOWN"

        prefix = "ENT"
        if entity_type == EntityType.PERSON.value:
            prefix = "ENT_PERSON"
        elif entity_type == EntityType.ORGANIZATION.value:
            prefix = "ENT_ORG"
        elif entity_type == EntityType.LOCATION.value:
            prefix = "ENT_LOC"
        elif entity_type == EntityType.VEHICLE.value:
            prefix = "ENT_VEH"
        elif entity_type == EntityType.PHONE_NUMBER.value:
            prefix = "ENT_PHONE"
        elif entity_type == EntityType.BANK_ACCOUNT.value:
            prefix = "ENT_BANK"
        elif entity_type == EntityType.TRANSACTION.value:
            prefix = "ENT_TXN"
        elif entity_type == EntityType.CASE.value:
            prefix = "ENT_CASE"

        canonical_id = f"{prefix}_{sanitized_slug}"
        return canonical_id, clean_name

    def resolve_all_mentions(
        self,
        mentions: List[EntityMention]
    ) -> Tuple[List[CanonicalEntity], Dict[str, str]]:
        """
        Clusters all entity mentions into canonical entities.
        Returns:
            canonical_entities: List[CanonicalEntity]
            mention_to_canonical_map: Dict[mention_id -> canonical_id]
        """
        clusters: Dict[str, Dict[str, Any]] = {}
        mention_to_canonical: Dict[str, str] = {}
        now_iso = datetime.utcnow().isoformat() + "Z"

        for m in mentions:
            cid, cname = self.resolve_entity(m.text, m.entity_type, m.domain_name)
            m.canonical_id = cid
            m.canonical_name = cname
            mention_to_canonical[m.mention_id] = cid

            if cid not in clusters:
                clusters[cid] = {
                    "canonical_id": cid,
                    "canonical_name": cname,
                    "entity_type": m.entity_type,
                    "domains": set(),
                    "aliases": set(),
                    "mention_ids": [],
                    "first_seen": m.timestamp or now_iso,
                    "last_seen": m.timestamp or now_iso,
                    "timestamp": m.timestamp or now_iso,
                    "hub_score": 0.05,
                    "community_cluster": 0,
                    "verified_by_officer": False,
                    "status": "ACTIVE"
                }

            if m.domain_name:
                clusters[cid]["domains"].add(m.domain_name)
            if m.text != cname:
                clusters[cid]["aliases"].add(m.text)
            clusters[cid]["mention_ids"].append(m.mention_id)

        canonical_entities = []
        for cid, data in clusters.items():
            ce = CanonicalEntity(
                canonical_id=cid,
                canonical_name=data["canonical_name"],
                entity_type=data["entity_type"],
                domains=sorted(list(data["domains"])),
                aliases=sorted(list(data["aliases"])),
                mention_ids=data["mention_ids"],
                first_seen=data["first_seen"],
                last_seen=data["last_seen"],
                timestamp=data["timestamp"],
                hub_score=data["hub_score"],
                community_cluster=data["community_cluster"],
                verified_by_officer=data["verified_by_officer"],
                status=data["status"]
            )
            canonical_entities.append(ce)

        return canonical_entities, mention_to_canonical


# Alias for backward compatibility
EntityResolver = RuleBasedEntityResolver
