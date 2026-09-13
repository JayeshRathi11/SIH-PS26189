import re
from typing import List, Dict, Any, Optional
from rapidfuzz import process, fuzz
from backend.db import SessionLocal, EntityRecord, RelationshipRecord, CriminalHistoryRecord, upsert_resolved_graph
from pipeline.graph.analytics import GraphAnalyticsEngine
from pipeline.graph.neo4j_client import get_neo4j_client

def normalize_phone_number(phone: str) -> str:
    digits = re.sub(r"[^\d]", "", phone or "")
    return digits[-10:] if len(digits) >= 10 else digits

# Name-only matches against criminal_history_records are always reported at
# moderate confidence (never auto-confirmed on a name alone -- common names
# and aliases are too unreliable an identifier by themselves), so this
# threshold is intentionally looser than the 88 used for actual entity-
# identity merging above: it only decides whether to surface a "possible
# match" for an officer to review, not whether to merge two records.
CRIMINAL_HISTORY_FUZZY_THRESHOLD = 85

def _match_criminal_history(meta: Dict[str, Any], history_records: List[CriminalHistoryRecord]) -> Optional[Dict[str, Any]]:
    """
    Checks one resolved entity against the criminal_history_records
    reference table:
      1. Exact match on phone number or vehicle number -- HIGH confidence.
      2. Fuzzy match on name/alias, via the same rapidfuzz token_sort_ratio
         scorer entity resolution itself uses above -- MODERATE confidence,
         a "possible match" only, never treated as a confirmed identity.
    Returns None if nothing matches.
    """
    entity_phones = {normalize_phone_number(p) for p in meta.get("phone_numbers", set()) if p}
    entity_names = {(meta.get("canonical_name") or "").strip().lower()}
    entity_names.update(a.strip().lower() for a in meta.get("aliases", set()))
    entity_names.discard("")
    is_vehicle = meta.get("type") == "VEHICLE"
    entity_vehicle_forms = {n.replace(" ", "").upper() for n in entity_names}

    for rec in history_records:
        if entity_phones:
            rec_phones = {normalize_phone_number(p) for p in (rec.phone_numbers or []) if p}
            if entity_phones & rec_phones:
                return {"confidence": "HIGH", "match_basis": "phone number", "record": rec}

        if is_vehicle and rec.vehicle_numbers:
            rec_vehicles = {v.replace(" ", "").upper() for v in rec.vehicle_numbers if v}
            if entity_vehicle_forms & rec_vehicles:
                return {"confidence": "HIGH", "match_basis": "vehicle number", "record": rec}

    candidate_names = []
    name_to_record: Dict[str, CriminalHistoryRecord] = {}
    for rec in history_records:
        for n in [rec.full_name] + list(rec.aliases or []):
            key = (n or "").strip().lower()
            if key:
                candidate_names.append(key)
                name_to_record[key] = rec

    if candidate_names:
        for entity_name in entity_names:
            if len(entity_name) <= 3:
                continue
            match = process.extractOne(entity_name, candidate_names, scorer=fuzz.token_sort_ratio)
            if match and match[1] >= CRIMINAL_HISTORY_FUZZY_THRESHOLD:
                return {
                    "confidence": "MODERATE", "match_basis": "name",
                    "record": name_to_record[match[0]], "match_score": match[1],
                }

    return None

def _format_prior_history_summary(match: Dict[str, Any]) -> str:
    rec: CriminalHistoryRecord = match["record"]
    tag = "HIGH CONFIDENCE MATCH" if match["confidence"] == "HIGH" else "POSSIBLE MATCH (name similarity)"
    offenses = ", ".join(rec.offense_types or []) or "unspecified offense"
    cases = ", ".join(rec.prior_case_ids or []) or "no case ID on file"
    return (
        f"{tag}: matches known-offender record for '{rec.full_name}' "
        f"(status: {rec.status}; offense(s): {offenses}; prior case(s): {cases}). "
        f"Matched via {match['match_basis']}."
    )

def ingest_new_case_incrementally(
    new_entities: List[Dict[str, Any]],
    new_relationships: List[Dict[str, Any]],
    case_id: str = None,
    triggered_by_username: str = None,
    triggered_by_user_id: str = None,
) -> Dict[str, Any]:
    db = SessionLocal()
    existing_records = db.query(EntityRecord).all()

    entity_map: Dict[str, Dict[str, Any]] = {}
    alias_to_id: Dict[str, str] = {}
    phone_to_id: Dict[str, str] = {}

    for rec in existing_records:
        cid = rec.id
        aliases_set = set(rec.aliases or [])
        aliases_set.add(rec.canonical_name)

        entity_map[cid] = {
            "canonical_id": cid,
            "canonical_name": rec.canonical_name,
            "type": rec.type,
            "aliases": aliases_set,
            "phone_numbers": set(rec.phone_numbers or []),
            "domains": set(rec.domains or []),
            # Carried through so a re-merge of an already-confirmed/rejected
            # entity doesn't get overwritten back to defaults below (matches
            # upsert_resolved_graph(), which likewise never touches these
            # fields for an existing EntityRecord).
            "verified_by_officer": rec.verified_by_officer,
            "status": rec.status,
            "has_prior_history": getattr(rec, "has_prior_history", False),
            "prior_history_summary": getattr(rec, "prior_history_summary", None),
        }

        for alias in aliases_set:
            alias_to_id[alias.lower()] = cid

        for p in (rec.phone_numbers or []):
            phone_to_id[p] = cid

    merged_count = 0
    new_count = 0
    resolved_id_map: Dict[str, str] = {} # raw incoming name -> resolved canonical_id

    for ent in new_entities:
        raw_name = (ent.get("name") or ent.get("canonical_name") or "").strip()
        ent_type = ent.get("type", "PERSON")
        raw_aliases = ent.get("aliases", [])
        incoming_domain = ent.get("domain") or case_id or "general"

        if not raw_name:
            continue

        lower_name = raw_name.lower()
        target_cid = None

        # 1. Exact phone match -- checked against numbers already persisted
        # (phone_to_id seeded from existing_records above) AND, via the
        # phone_to_id registration in the create branch below, numbers
        # already created earlier in this same batch. Previously the
        # "not found yet" case guessed target_cid = f"ENT_PHONE_{p_digits}",
        # which never matched the real id scheme entities are actually
        # created under (f"ENT_{ent_type}_{safe_id_name}") -- since that
        # guess is truthy, it also skipped the step 2/3 fallbacks below
        # (both gated on `not target_cid`), so a second mention of a
        # brand-new phone number within one batch matched neither this
        # guessed id nor its real one, got created again, and both
        # miscounted as "new" and clobbered the first mention's entity_map
        # entry. Only registering a real, already-created id here (never a
        # guessed one) keeps target_cid meaningful for the checks below.
        is_phone_like = ent_type == "PHONE_NUMBER" or re.search(r"\+?\d[\d\s\-]{8,}\d", raw_name)
        p_digits = normalize_phone_number(raw_name) if is_phone_like else None
        if p_digits and p_digits in phone_to_id:
            target_cid = phone_to_id[p_digits]

        # 2. Exact alias or vehicle match
        if not target_cid and lower_name in alias_to_id:
            target_cid = alias_to_id[lower_name]

        # 3. Fuzzy name match against existing canonical names and aliases
        if not target_cid and len(lower_name) > 3 and alias_to_id:
            existing_alias_list = list(alias_to_id.keys())
            match = process.extractOne(lower_name, existing_alias_list, scorer=fuzz.token_sort_ratio)
            if match and match[1] >= 88:
                matched_alias = match[0]
                target_cid = alias_to_id[matched_alias]

        # 4. Merge or Create
        if target_cid and target_cid in entity_map:
            merged_count += 1
            entity_map[target_cid]["aliases"].add(raw_name)
            for a in raw_aliases:
                entity_map[target_cid]["aliases"].add(a)
                alias_to_id[a.lower()] = target_cid
            entity_map[target_cid]["domains"].add(incoming_domain)
            resolved_id_map[raw_name] = target_cid
        else:
            new_count += 1
            safe_id_name = re.sub(r"\W+", "_", lower_name).strip("_").upper()
            target_cid = f"ENT_{ent_type}_{safe_id_name}"
            
            entity_map[target_cid] = {
                "canonical_id": target_cid,
                "canonical_name": raw_name,
                "type": ent_type,
                "aliases": set([raw_name] + raw_aliases),
                "phone_numbers": set([normalize_phone_number(raw_name)]) if ent_type == "PHONE_NUMBER" else set(),
                "domains": {incoming_domain}
            }
            alias_to_id[lower_name] = target_cid
            for a in raw_aliases:
                alias_to_id[a.lower()] = target_cid
            # Register this brand-new number's digits under its REAL,
            # just-created id -- so a later mention of the same number
            # later in this batch (even in a different format, e.g. with a
            # "+91 " prefix) hits the step 1 exact-phone-match check above
            # and merges into this entity, instead of being created again.
            if p_digits:
                phone_to_id[p_digits] = target_cid
            resolved_id_map[raw_name] = target_cid

    # Criminal-history reference lookup -- one additional step in this same
    # resolution flow, not a parallel pipeline: every entity actually
    # touched (created or merged into) by this batch is checked against the
    # known-offenders table, and flagged in-place on its entity_map entry so
    # upsert_resolved_graph() below persists has_prior_history/
    # prior_history_summary exactly like any other entity field.
    history_records = db.query(CriminalHistoryRecord).all()
    prior_history_hits = [] # for audit logging, after the DB write below
    if history_records:
        for cid in set(resolved_id_map.values()):
            meta = entity_map.get(cid)
            if not meta:
                continue
            match = _match_criminal_history(meta, history_records)
            if match:
                meta["has_prior_history"] = True
                meta["prior_history_summary"] = _format_prior_history_summary(match)
                prior_history_hits.append({
                    "entity_id": cid,
                    "entity_name": meta.get("canonical_name", cid),
                    "confidence": match["confidence"],
                    "matched_record": match["record"].full_name,
                    "summary": meta["prior_history_summary"],
                })

    # Link incoming relationships
    resolved_relationships = []
    for r in new_relationships:
        src_raw = r.get("source") or r.get("source_canonical")
        tgt_raw = r.get("target") or r.get("target_canonical")
        r_domain = r.get("domain") or case_id or "general"

        src_cid = resolved_id_map.get(src_raw, r.get("source_id", src_raw))
        tgt_cid = resolved_id_map.get(tgt_raw, r.get("target_id", tgt_raw))

        src_canon = entity_map.get(src_cid, {}).get("canonical_name", src_raw)
        tgt_canon = entity_map.get(tgt_cid, {}).get("canonical_name", tgt_raw)

        resolved_relationships.append({
            "source_id": src_cid,
            "source_canonical": src_canon,
            "relationship_type": r.get("relationship_type", "ASSOCIATE_OF"),
            "raw_relationship_type": r.get("raw_relationship_type", ""),
            "target_id": tgt_cid,
            "target_canonical": tgt_canon,
            "confidence": float(r.get("confidence", 0.9)),
            "domain": r_domain,
            "evidence": r.get("evidence", "")
        })

    # Recalculate network centrality metrics across the FULL cumulative graph
    # -- existing persisted relationships plus this batch's new ones -- not just
    # this batch's edges. Using only resolved_relationships here was the root
    # cause of every entity's centrality flattening toward a uniform ~0.6/N
    # value after the first incremental ingestion: entity_map already contains
    # every entity ever seen, but resolved_relationships only held this call's
    # new edges, so most nodes looked isolated to the analytics engine and got
    # overwritten with the isolated-node baseline score, clobbering whatever
    # real, differentiated centrality they had from earlier ingestions.
    existing_rel_records = db.query(RelationshipRecord).filter(RelationshipRecord.status == "ACTIVE").all()
    full_relationships = [
        {
            "source_id": rec.source_id,
            "source_canonical": rec.source_canonical,
            "relationship_type": rec.relationship_type,
            "raw_relationship_type": rec.raw_relationship_type,
            "target_id": rec.target_id,
            "target_canonical": rec.target_canonical,
            "confidence": rec.confidence,
            "domain": rec.domain,
            "evidence": rec.evidence,
            "timestamp": rec.timestamp,
            "verified_by_officer": rec.verified_by_officer,
            "weight_multiplier": rec.weight_multiplier,
            "status": rec.status,
        }
        for rec in existing_rel_records
    ]
    # This batch's own edges take precedence over the persisted copy of the
    # same edge (same id scheme upsert_resolved_graph() uses), so freshly
    # merged confidence/evidence is reflected in this run's scoring too.
    by_rel_id = {
        f"REL_{r['source_id']}_{r['target_id']}_{r['relationship_type']}_{r['domain']}": r
        for r in full_relationships
    }
    for r in resolved_relationships:
        rel_id = f"REL_{r['source_id']}_{r['target_id']}_{r.get('relationship_type', 'ASSOCIATE_OF')}_{r.get('domain', 'general')}"
        by_rel_id[rel_id] = r
    full_relationships = list(by_rel_id.values())

    analytics = GraphAnalyticsEngine(list(entity_map.values()), full_relationships)
    ranked_hubs = {h["entity_id"]: h for h in analytics.get_ranked_key_influencers(top_n=500)}

    for cid, meta in entity_map.items():
        hub_info = ranked_hubs.get(cid, {})
        meta["hub_score"] = hub_info.get("combined_hub_score", 0.05)
        meta["community_cluster"] = hub_info.get("community_cluster", 0)

    # Persist updates to SQLite/Postgres
    upsert_resolved_graph(db, entity_map, resolved_relationships)

    # Audit every prior-history hit found in this batch, same chained-hash
    # pattern as every other audit event (see log_audit() in backend/routers/
    # auth.py). Function-local import: backend.routers.auth pulls in JWT_
    # SECRET_KEY validation and the ws manager, which only makes sense once
    # the backend app itself is already up -- importing it at module load
    # time here would force that dependency onto this pipeline module even
    # for callers (e.g. CLI/offline pipeline runs) that never need it.
    if prior_history_hits:
        from backend.routers.auth import log_audit
        for hit in prior_history_hits:
            log_audit(
                db, action="PRIOR_HISTORY_MATCH_FOUND",
                username=triggered_by_username, user_id=triggered_by_user_id,
                resource_type="ENTITY", resource_id=hit["entity_id"],
                details=(
                    f"entity={hit['entity_name']}, confidence={hit['confidence']}, "
                    f"matched_record={hit['matched_record']}: {hit['summary']}"
                )
            )

    # Mirror the same upsert into Neo4j in this same request path -- this is
    # the live upload/webcam ingestion flow (the one a real case actually
    # goes through), which previously had no Neo4j write at all; only the
    # separate full-batch pipeline (pipeline/graph/build_graph.py) did. A
    # background/periodic sync job was deliberately not used here: it would
    # risk drift between Postgres and Neo4j and undermine the WebSocket
    # live-sync guarantee that a confirmed write is immediately visible
    # everywhere. No-ops safely if Neo4j isn't reachable (same as every
    # other Neo4jClient call site).
    neo4j = get_neo4j_client()
    if neo4j.is_connected:
        # Postgres is already committed above -- Neo4j is a mirror, not the
        # source of truth, so a Neo4j hiccup here must never fail this
        # request or mark the pipeline job FAILED when the real, durable
        # write already succeeded. Log and move on.
        try:
            for cid, meta in entity_map.items():
                hub_info = ranked_hubs.get(cid, {})
                neo4j.add_entity_node(
                    cid,
                    meta.get("canonical_name", cid),
                    meta.get("type", "PERSON"),
                    list(meta.get("aliases", [])),
                    list(meta.get("domains", [])),
                    hub_score=meta.get("hub_score", hub_info.get("combined_hub_score", 0.05)),
                    community_cluster=meta.get("community_cluster", hub_info.get("community_cluster", 0)),
                    verified_by_officer=meta.get("verified_by_officer", False),
                    status=meta.get("status", "ACTIVE"),
                    phone_numbers=list(meta.get("phone_numbers", [])),
                    has_prior_history=meta.get("has_prior_history", False),
                    prior_history_summary=meta.get("prior_history_summary")
                )
            for r in resolved_relationships:
                src, tgt = r["source_id"], r["target_id"]
                rel_t = r.get("relationship_type", "ASSOCIATE_OF")
                dom = r.get("domain", "general")
                neo4j.add_relationship_edge(
                    source_id=src,
                    target_id=tgt,
                    rel_type=rel_t,
                    raw_rel_type=r.get("raw_relationship_type", ""),
                    domain=dom,
                    evidence=r.get("evidence", ""),
                    confidence=float(r.get("confidence", 0.9)),
                    timestamp=r.get("timestamp", ""),
                    # Identical id scheme to backend/db.py's upsert_resolved_graph(),
                    # so this edge's postgres_id always matches its RelationshipRecord.id.
                    postgres_id=f"REL_{src}_{tgt}_{rel_t}_{dom}",
                    status=r.get("status", "ACTIVE")
                )
        except Exception as e:
            print(f"[IncrementalResolver Warning] Neo4j mirror write failed (Postgres already committed): {e}")

    db.close()

    return {
        "status": "COMPLETED",
        "total_entities": len(entity_map),
        "total_relationships": len(resolved_relationships),
        "merged_entities_count": merged_count,
        "new_entities_count": new_count,
        "prior_history_hits": prior_history_hits
    }
