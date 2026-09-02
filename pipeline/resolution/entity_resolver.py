import re
from typing import Dict, List, Any, Tuple
from rapidfuzz import process, fuzz
from pipeline.config import DOMAINS, EntityType

# Fixed Hub Known Aliases -> Canonical Entity
HUB_CANONICAL_NAME = "Iqbal Ansari"
HUB_CANONICAL_ID = "ENT_HUB_IQBAL_ANSARI"

KNOWN_ALIAS_MAP = {
    "sethji": (HUB_CANONICAL_ID, HUB_CANONICAL_NAME, EntityType.PERSON.value),
    "bhai": (HUB_CANONICAL_ID, HUB_CANONICAL_NAME, EntityType.PERSON.value),
    "the contact": (HUB_CANONICAL_ID, HUB_CANONICAL_NAME, EntityType.PERSON.value),
    "i.a.": (HUB_CANONICAL_ID, HUB_CANONICAL_NAME, EntityType.PERSON.value),
    "ia": (HUB_CANONICAL_ID, HUB_CANONICAL_NAME, EntityType.PERSON.value),
    "the director": (HUB_CANONICAL_ID, HUB_CANONICAL_NAME, EntityType.PERSON.value),
    "the financier": (HUB_CANONICAL_ID, HUB_CANONICAL_NAME, EntityType.PERSON.value),
    "the negotiator": (HUB_CANONICAL_ID, HUB_CANONICAL_NAME, EntityType.PERSON.value),
    "the source contact": (HUB_CANONICAL_ID, HUB_CANONICAL_NAME, EntityType.PERSON.value),
    "the controller": (HUB_CANONICAL_ID, HUB_CANONICAL_NAME, EntityType.PERSON.value),
    "the buyer": (HUB_CANONICAL_ID, HUB_CANONICAL_NAME, EntityType.PERSON.value),
    "the fixer": (HUB_CANONICAL_ID, HUB_CANONICAL_NAME, EntityType.PERSON.value),
    "the account holder": (HUB_CANONICAL_ID, HUB_CANONICAL_NAME, EntityType.PERSON.value),
    "the beneficial owner": (HUB_CANONICAL_ID, HUB_CANONICAL_NAME, EntityType.PERSON.value),
    "iqbal ansari": (HUB_CANONICAL_ID, HUB_CANONICAL_NAME, EntityType.PERSON.value),

    # Operatives
    "bunty": ("ENT_PERSON_DEVENDRA_SOLANKI", "Devendra Solanki", EntityType.PERSON.value),
    "devendra solanki": ("ENT_PERSON_DEVENDRA_SOLANKI", "Devendra Solanki", EntityType.PERSON.value),
    "iliyas khan": ("ENT_PERSON_ILIYAS_KHAN", "Iliyas Khan", EntityType.PERSON.value),
    "manoj tiwari": ("ENT_PERSON_MANOJ_TIWARI", "Manoj Tiwari", EntityType.PERSON.value),
    "rina das": ("ENT_PERSON_RINA_DAS", "Rina Das", EntityType.PERSON.value),
    "rohit chaurasia": ("ENT_PERSON_ROHIT_CHAURASIA", "Rohit Chaurasia", EntityType.PERSON.value),
    "farhan qureshi": ("ENT_PERSON_FARHAN_QURESHI", "Farhan Qureshi", EntityType.PERSON.value),
    "harjeet singh": ("ENT_PERSON_HARJEET_SINGH", "Harjeet Singh", EntityType.PERSON.value),
    "waseem akhtar": ("ENT_PERSON_WASEEM_AKHTAR", "Waseem Akhtar", EntityType.PERSON.value),
    "rocky": ("ENT_PERSON_RAKESH_PAWAR", "Rakesh Pawar", EntityType.PERSON.value),
    "rakesh pawar": ("ENT_PERSON_RAKESH_PAWAR", "Rakesh Pawar", EntityType.PERSON.value),
    "salim sheikh": ("ENT_PERSON_SALIM_SHEIKH", "Salim Sheikh", EntityType.PERSON.value),
    "sunil yadav": ("ENT_PERSON_SUNIL_YADAV", "Sunil Yadav", EntityType.PERSON.value),
    "ajay bhonsle": ("ENT_PERSON_AJAY_BHONSLE", "Ajay Bhonsle", EntityType.PERSON.value),
    "naseer ahmed": ("ENT_PERSON_NASEER_AHMED", "Naseer Ahmed", EntityType.PERSON.value),
    "vikas chopra": ("ENT_PERSON_VIKAS_CHOPRA", "Vikas Chopra", EntityType.PERSON.value),
    "bookie": ("ENT_PERSON_DEEPAK_MALHOTRA", "Deepak Malhotra", EntityType.PERSON.value),
    "deepak malhotra": ("ENT_PERSON_DEEPAK_MALHOTRA", "Deepak Malhotra", EntityType.PERSON.value),
    "rizwan ali": ("ENT_PERSON_RIZWAN_ALI", "Rizwan Ali", EntityType.PERSON.value),
    "anil kamble": ("ENT_PERSON_ANIL_KAMBLE", "Anil Kamble", EntityType.PERSON.value),
    "ramesh naidu": ("ENT_PERSON_RAMESH_NAIDU", "Ramesh Naidu", EntityType.PERSON.value),
    "prakash jadhav": ("ENT_PERSON_PRAKASH_JADHAV", "Prakash Jadhav", EntityType.PERSON.value),
    "rajendra kulkarni": ("ENT_PERSON_RAJENDRA_KULKARNI", "Advocate Rajendra Kulkarni", EntityType.PERSON.value),
    "advocate rajendra kulkarni": ("ENT_PERSON_RAJENDRA_KULKARNI", "Advocate Rajendra Kulkarni", EntityType.PERSON.value),

    # Front Organizations
    "sunrise placement services": ("ENT_ORG_SUNRISE_PLACEMENT", "Sunrise Placement Services", EntityType.ORGANIZATION.value),
    "sunrise placement": ("ENT_ORG_SUNRISE_PLACEMENT", "Sunrise Placement Services", EntityType.ORGANIZATION.value),
    "ia digital ventures pvt ltd": ("ENT_ORG_IA_DIGITAL_VENTURES", "IA Digital Ventures Pvt Ltd", EntityType.ORGANIZATION.value),
    "ia digital ventures": ("ENT_ORG_IA_DIGITAL_VENTURES", "IA Digital Ventures Pvt Ltd", EntityType.ORGANIZATION.value),
    "chopra fuel & service station": ("ENT_ORG_CHOPRA_FUEL", "Chopra Fuel & Service Station", EntityType.ORGANIZATION.value),
    "chopra fuel": ("ENT_ORG_CHOPRA_FUEL", "Chopra Fuel & Service Station", EntityType.ORGANIZATION.value),
    "shreeji construction & developers": ("ENT_ORG_SHREEJI_CONSTRUCTION", "Shreeji Construction & Developers", EntityType.ORGANIZATION.value),
    "shreeji constructions": ("ENT_ORG_SHREEJI_CONSTRUCTION", "Shreeji Construction & Developers", EntityType.ORGANIZATION.value),
}

KNOWN_VEHICLE_LINKS = {
    "ka05mn4321": ("VEH_KA05MN4321_TN09PQ7788", "KA05MN4321 / TN09PQ7788"),
    "tn09pq7788": ("VEH_KA05MN4321_TN09PQ7788", "KA05MN4321 / TN09PQ7788"),
    "mh12ab5678": ("VEH_MH12AB5678", "MH12AB5678"),
    "pb10gh4321": ("VEH_PB10GH4321", "PB10GH4321"),
    "mh04xy2345": ("VEH_MH04XY2345", "MH04XY2345"),
    "up32xy9988": ("VEH_UP32XY9988", "UP32XY9988"),
}

class EntityResolver:
    """
    Entity Resolution Engine: Resolves raw entity mentions, aliases, phone numbers,
    and vehicle identifiers into unified canonical Entity IDs and canonical names.
    """
    def __init__(self):
        self.entity_map: Dict[str, Dict[str, Any]] = {}
        self.alias_to_id: Dict[str, str] = {}
        self.phone_to_id: Dict[str, str] = {}
        
        # Initialize Hub entity
        self.entity_map[HUB_CANONICAL_ID] = {
            "canonical_id": HUB_CANONICAL_ID,
            "canonical_name": HUB_CANONICAL_NAME,
            "type": EntityType.PERSON.value,
            "aliases": set(["Sethji", "Bhai", "the contact", "I.A.", "the director", 
                            "the financier", "the negotiator", "the source contact", 
                            "the controller", "the buyer", "the fixer", "Iqbal Ansari"]),
            "phone_numbers": set(["9987012345", "+91 99870 12345"]),
            "domains": set(DOMAINS.keys())
        }

        # Seed pre-known alias mappings
        for alias_key, (cid, cname, ctype) in KNOWN_ALIAS_MAP.items():
            self.alias_to_id[alias_key] = cid
            if cid not in self.entity_map:
                self.entity_map[cid] = {
                    "canonical_id": cid,
                    "canonical_name": cname,
                    "type": ctype,
                    "aliases": {cname, alias_key.title()},
                    "phone_numbers": set(),
                    "domains": set()
                }

    def load_existing_from_db(self, db):
        """Pre-seeds the entity map from existing SQLite records."""
        try:
            from backend.db import EntityRecord
            records = db.query(EntityRecord).all()
            for rec in records:
                cid = rec.id
                if cid not in self.entity_map:
                    self.entity_map[cid] = {
                        "canonical_id": cid,
                        "canonical_name": rec.canonical_name,
                        "type": rec.type,
                        "aliases": set(rec.aliases or []),
                        "phone_numbers": set(rec.phone_numbers or []),
                        "domains": set(rec.domains or []),
                        "hub_score": rec.hub_score or 0.05,
                        "community_cluster": rec.community_cluster or 0
                    }
                else:
                    self.entity_map[cid]["aliases"].update(rec.aliases or [])
                    self.entity_map[cid]["domains"].update(rec.domains or [])
                    self.entity_map[cid]["phone_numbers"].update(rec.phone_numbers or [])

                for alias in (rec.aliases or []):
                    self.alias_to_id[alias.lower().strip()] = cid
                self.alias_to_id[rec.canonical_name.lower().strip()] = cid
                for phone in (rec.phone_numbers or []):
                    self.phone_to_id[self.normalize_phone(phone)] = cid
        except Exception as e:
            print(f"[EntityResolver Warning] Could not pre-load existing DB entities: {e}")

    def normalize_phone(self, phone: str) -> str:
        digits = re.sub(r"[^\d]", "", phone or "")
        return digits[-10:] if len(digits) >= 10 else digits

    def resolve_entity(self, raw_name: str, entity_type: str, domain: str = None) -> Tuple[str, str]:
        """
        Given a raw entity name and entity_type, returns (canonical_id, canonical_name).
        """
        clean_name = (raw_name or "").strip()
        lower_name = clean_name.lower()
        
        if not clean_name:
            return "ENT_UNKNOWN", "Unknown"

        # 1. Phone number matching
        if entity_type == EntityType.PHONE_NUMBER.value or re.search(r"\+?\d[\d\s\-]{8,}\d", clean_name):
            phone_key = self.normalize_phone(clean_name)
            if phone_key in self.phone_to_id:
                cid = self.phone_to_id[phone_key]
                self.entity_map[cid]["aliases"].add(clean_name)
                if domain:
                    self.entity_map[cid]["domains"].add(domain)
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
        clean_veh = lower_name.replace(" ", "")
        if clean_veh in KNOWN_VEHICLE_LINKS or entity_type == EntityType.VEHICLE.value:
            if clean_veh in KNOWN_VEHICLE_LINKS:
                cid, cname = KNOWN_VEHICLE_LINKS[clean_veh]
                if cid not in self.entity_map:
                    self.entity_map[cid] = {
                        "canonical_id": cid,
                        "canonical_name": cname,
                        "type": EntityType.VEHICLE.value,
                        "aliases": {clean_name, cname},
                        "domains": {domain} if domain else set()
                    }
                else:
                    self.entity_map[cid]["aliases"].add(clean_name)
                    if domain:
                        self.entity_map[cid]["domains"].add(domain)
                return cid, cname

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
            if match and match[1] >= 88:
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
        else:
            self.entity_map[cid]["aliases"].add(clean_name)
            if domain:
                self.entity_map[cid]["domains"].add(domain)
        
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
            t_domain = t.get("domain") or domain

            src_id, src_canon = self.resolve_entity(src_name, src_type, t_domain)
            tgt_id, tgt_canon = self.resolve_entity(tgt_name, tgt_type, t_domain)

            t_resolved = dict(t)
            t_resolved["source_id"] = src_id
            t_resolved["source_canonical"] = src_canon
            t_resolved["target_id"] = tgt_id
            t_resolved["target_canonical"] = tgt_canon
            if t_domain:
                t_resolved["domain"] = t_domain
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
