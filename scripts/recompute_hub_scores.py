"""
Recomputes and persists real centrality scores (hub_score, community_cluster)
for every entity currently in nexustrace.db.

Why this exists: entities inserted via scripts/seed_database.py (or any path
that doesn't explicitly run GraphAnalyticsEngine and write the result back)
are left at the default hub_score of 0.05, so the Case Board shows no visual
hierarchy between a kingpin and a courier. Run this any time the DB's
entities/relationships change and you want the board to reflect real
centrality again.

Usage (from the project root, with the venv active):
    .\\venv\\Scripts\\python.exe -m scripts.recompute_hub_scores
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.db import SessionLocal, EntityRecord, RelationshipRecord
from pipeline.graph.analytics import GraphAnalyticsEngine


def recompute_hub_scores():
    db = SessionLocal()
    try:
        entity_records = db.query(EntityRecord).all()
        relationship_records = db.query(RelationshipRecord).all()

        if not entity_records:
            print("[Recompute] No entities in the database. Nothing to do.")
            return

        entities = [
            {
                "canonical_id": e.id,
                "canonical_name": e.canonical_name,
                "type": e.type,
                "domains": e.domains or [],
                "verified_by_officer": e.verified_by_officer,
                "status": e.status,
            }
            for e in entity_records
        ]
        relationships = [
            {
                "source_id": r.source_id,
                "target_id": r.target_id,
                "relationship_type": r.relationship_type,
                "raw_relationship_type": r.raw_relationship_type,
                "confidence": r.confidence,
                "weight_multiplier": r.weight_multiplier,
                "domain": r.domain,
                "timestamp": r.timestamp,
                "verified_by_officer": r.verified_by_officer,
                "status": r.status,
            }
            for r in relationship_records
        ]

        engine = GraphAnalyticsEngine(entities, relationships)
        ranked = {h["entity_id"]: h for h in engine.get_ranked_key_influencers(top_n=len(entities))}

        updated = 0
        for e in entity_records:
            hub_info = ranked.get(e.id)
            if not hub_info:
                # Isolated node with no edges: GraphAnalyticsEngine still adds it
                # to the graph, so this should be rare, but fall back safely.
                continue
            e.hub_score = hub_info["combined_hub_score"]
            e.community_cluster = hub_info["community_cluster"]
            updated += 1

        db.commit()

        print(f"[Recompute] Updated hub_score/community_cluster for {updated}/{len(entity_records)} entities.")
        print("[Recompute] Top 10 by hub score:")
        top = sorted(ranked.values(), key=lambda x: x["combined_hub_score"], reverse=True)[:10]
        for i, h in enumerate(top, 1):
            print(f"  {i:>2}. {h['name']:<30} hub_score={h['combined_hub_score']:.4f}  community={h['community_cluster']}")
    finally:
        db.close()


if __name__ == "__main__":
    recompute_hub_scores()
