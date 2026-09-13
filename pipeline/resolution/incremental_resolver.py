import re
from typing import List, Dict, Any
from rapidfuzz import process, fuzz
from backend.db import SessionLocal, EntityRecord, RelationshipRecord, upsert_resolved_graph
from pipeline.graph.analytics import GraphAnalyticsEngine
from pipeline.graph.neo4j_client import get_neo4j_client

def normalize_phone_number(phone: str) -> str:
    digits = re.sub(r"[^\d]", "", phone or "")
    return digits[-10:] if len(digits) >= 10 else digits

def ingest_new_case_incrementally(
    new_entities: List[Dict[str, Any]],
    new_relationships: List[Dict[str, Any]],
    case_id: str = None
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
            "status": rec.status
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
                    phone_numbers=list(meta.get("phone_numbers", []))
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
        "new_entities_count": new_count
    }
