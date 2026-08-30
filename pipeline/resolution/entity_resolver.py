import re
from typing import Dict, List, Any, Tuple
from rapidfuzz import process, fuzz
from pipeline.config import DOMAINS, EntityType

# Fixed Hub Known Aliases -> Canonical Entity
HUB_CANONICAL_NAME = "Iqbal Ansari"
HUB_CANONICAL_ID = "ENT_HUB_IQBAL_ANSARI"

KNOWN_ALIAS_MAP = {
    "sethji": HUB_CANONICAL_ID,
    "bhai": HUB_CANONICAL_ID,
    "the contact": HUB_CANONICAL_ID,
    "i.a.": HUB_CANONICAL_ID,
    "ia": HUB_CANONICAL_ID,
    "the director": HUB_CANONICAL_ID,
    "the financier": HUB_CANONICAL_ID,
    "the negotiator": HUB_CANONICAL_ID,
    "the source contact": HUB_CANONICAL_ID,
    "the controller": HUB_CANONICAL_ID,
    "the buyer": HUB_CANONICAL_ID,
    "the fixer": HUB_CANONICAL_ID,
    "iqbal ansari": HUB_CANONICAL_ID,
}

KNOWN_VEHICLE_LINKS = {
    "ka05mn4321": "VEH_KA05MN4321_TN09PQ7788",
    "tn09pq7788": "VEH_KA05MN4321_TN09PQ7788",
}

class EntityResolver:
    """
    Entity Resolution Engine: Resolves raw entity mentions, aliases, phone numbers,
    and vehicle identifiers into unified canonical Entity IDs and canonical names.
    """
    def __init__(self):
        self.entity_map: Dict[str, Dict[str, Any]] = {} # canonical_id -> entity_metadata
        self.alias_to_id: Dict[str, str] = dict(KNOWN_ALIAS_MAP)
        self.phone_to_id: Dict[str, str] = {}
        
        # Initialize Hub entity in resolution map
        self.entity_map[HUB_CANONICAL_ID] = {
            "canonical_id": HUB_CANONICAL_ID,
            "canonical_name": HUB_CANONICAL_NAME,
            "type": EntityType.PERSON.value,
            "aliases": set(["Sethji", "Bhai", "the contact", "I.A.", "the director", 
                            "the financier", "the negotiator", "the source contact", 
                            "the controller", "the buyer", "the fixer", "Iqbal Ansari"]),
            "phone_numbers": set(),
            "domains": set(DOMAINS.keys())
        }

    def normalize_phone(self, phone: str) -> str:
        """Strips formatting from phone numbers to leave digits/pattern."""
        digits = re.sub(r"[^\d]", "", phone or "")
        return digits[-10:] if len(digits) >= 10 else digits

    def resolve_entity(self, raw_name: str, entity_type: str, domain: str = None) -> Tuple[str, str]:
        """
        Given a raw entity name and entity_type, returns (canonical_id, canonical_name).
        """
        clean_name = (raw_name or "").strip()
        lower_name = clean_name.lower()
        
        # 1. Phone number matching
        if entity_type == EntityType.PHONE_NUMBER.value or re.search(r"\+?\d[\d\s\-]{8,}\d", clean_name):
            phone_key = self.normalize_phone(clean_name)
            if phone_key in self.phone_to_id:
                cid = self.phone_to_id[phone_key]
                return cid, self.entity_map[cid]["canonical_name"]
            else:
                cid = f"ENT_PHONE_{phone_key}"
                if cid not in self.entity_map:
                    self.entity_map[cid] = {
                        "canonical_id": cid,
                        "canonical_name": clean_name,
                        "type": EntityType.PHONE_NUMBER.value,
                        "aliases": {clean_name},
                        "phone_numbers": {phone_key},
                        "domains": {domain} if domain else set()
                    }
                self.phone_to_id[phone_key] = cid
                return cid, clean_name

        # 2. Known vehicle registration link check
        if entity_type == EntityType.VEHICLE.value or lower_name in KNOWN_VEHICLE_LINKS:
            clean_veh = lower_name.replace(" ", "")
            if clean_veh in KNOWN_VEHICLE_LINKS:
                cid = KNOWN_VEHICLE_LINKS[clean_veh]
                if cid not in self.entity_map:
                    self.entity_map[cid] = {
                        "canonical_id": cid,
                        "canonical_name": "KA05MN4321 / TN09PQ7788",
                        "type": EntityType.VEHICLE.value,
                        "aliases": {"KA05MN4321", "TN09PQ7788"},
                        "domains": {domain} if domain else set()
                    }
                return cid, self.entity_map[cid]["canonical_name"]

        # 3. Known hub alias exact match
        if lower_name in self.alias_to_id:
            cid = self.alias_to_id[lower_name]
            self.entity_map[cid]["aliases"].add(clean_name)
            if domain:
                self.entity_map[cid]["domains"].add(domain)
            return cid, self.entity_map[cid]["canonical_name"]

        # 4. Fuzzy match against existing entity aliases
        existing_aliases = list(self.alias_to_id.keys())
        if existing_aliases and len(lower_name) > 3:
            match = process.extractOne(lower_name, existing_aliases, scorer=fuzz.token_sort_ratio)
            if match and match[1] >= 88: # High confidence fuzzy threshold
                matched_alias = match[0]
                cid = self.alias_to_id[matched_alias]
                self.entity_map[cid]["aliases"].add(clean_name)
                self.alias_to_id[lower_name] = cid
                if domain:
                    self.entity_map[cid]["domains"].add(domain)
                return cid, self.entity_map[cid]["canonical_name"]

        # 5. Fallback: Create new canonical entity
        safe_id_name = re.sub(r"\W+", "_", lower_name).strip("_").upper()
        cid = f"ENT_{entity_type}_{safe_id_name}"
        
        if cid not in self.entity_map:
            self.entity_map[cid] = {
                "canonical_id": cid,
                "canonical_name": clean_name,
                "type": entity_type,
                "aliases": {clean_name},
                "domains": {domain} if domain else set()
            }
        
        self.alias_to_id[lower_name] = cid
        return cid, clean_name

    def resolve_batch_triples(self, triples: List[Dict[str, Any]], domain: str = None) -> List[Dict[str, Any]]:
        """
        Resolves entity mentions in relationship triples [source -> rel -> target].
        """
        resolved_triples = []
        for t in triples:
            src_name = t.get("source")
            src_type = t.get("source_type", EntityType.PERSON.value)
            tgt_name = t.get("target")
            tgt_type = t.get("target_type", EntityType.PERSON.value)

            src_id, src_canon = self.resolve_entity(src_name, src_type, domain)
            tgt_id, tgt_canon = self.resolve_entity(tgt_name, tgt_type, domain)

            t_resolved = dict(t)
            t_resolved["source_id"] = src_id
            t_resolved["source_canonical"] = src_canon
            t_resolved["target_id"] = tgt_id
            t_resolved["target_canonical"] = tgt_canon
            if domain:
                t_resolved["domain"] = domain
            resolved_triples.append(t_resolved)

        return resolved_triples

    def export_resolution_map(self) -> Dict[str, Any]:
        """Returns JSON-serializable dictionary of canonical entities and merged aliases."""
        serialized = {}
        for cid, meta in self.entity_map.items():
            serialized[cid] = {
                "canonical_id": meta["canonical_id"],
                "canonical_name": meta["canonical_name"],
                "type": meta["type"],
                "aliases": list(meta.get("aliases", [])),
                "phone_numbers": list(meta.get("phone_numbers", [])),
                "domains": list(meta.get("domains", []))
            }
        return serialized
