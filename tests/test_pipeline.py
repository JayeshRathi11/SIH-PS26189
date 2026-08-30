import pytest
from pathlib import Path
from pipeline.config import EntityType, MasterRelationshipType
from pipeline.normalization.schema_mapper import normalize_relationship, normalize_entity_type
from pipeline.resolution.entity_resolver import EntityResolver
from pipeline.graph.analytics import GraphAnalyticsEngine

def test_schema_mapper_normalization():
    rel = {
        "source": "Sethji",
        "source_type": "PERSON",
        "relationship_type": "INSTRUCTED",
        "target": "Bunty",
        "target_type": "PERSON",
        "confidence": 0.95
    }
    normalized = normalize_relationship(rel)
    assert normalized["relationship_type"] == MasterRelationshipType.ASSOCIATE_OF.value
    assert normalized["raw_relationship_type"] == "INSTRUCTED"

def test_entity_resolver_canonical_hub_linking():
    resolver = EntityResolver()
    
    # Test resolving "Sethji" (Narcotics) and "Bhai" (Extortion)
    cid1, name1 = resolver.resolve_entity("Sethji", EntityType.PERSON.value, "01_narcotics_trafficking")
    cid2, name2 = resolver.resolve_entity("Bhai", EntityType.PERSON.value, "05_organized_extortion")
    
    assert cid1 == "ENT_HUB_IQBAL_ANSARI"
    assert cid2 == "ENT_HUB_IQBAL_ANSARI"
    assert name1 == "Iqbal Ansari"
    assert name2 == "Iqbal Ansari"

def test_graph_analytics_hub_identification():
    entities = [
        {"canonical_id": "ENT_HUB_IQBAL_ANSARI", "canonical_name": "Iqbal Ansari", "type": "PERSON", "domains": ["01", "05"]},
        {"canonical_id": "ENT_01", "canonical_name": "Bunty", "type": "PERSON", "domains": ["01"]},
        {"canonical_id": "ENT_02", "canonical_name": "Iliyas Khan", "type": "PERSON", "domains": ["01"]}
    ]
    relationships = [
        {"source_id": "ENT_HUB_IQBAL_ANSARI", "target_id": "ENT_01", "relationship_type": "ASSOCIATE_OF"},
        {"source_id": "ENT_HUB_IQBAL_ANSARI", "target_id": "ENT_02", "relationship_type": "ASSOCIATE_OF"},
    ]
    
    analytics = GraphAnalyticsEngine(entities, relationships)
    ranked = analytics.get_ranked_key_influencers(top_n=5)
    
    assert len(ranked) > 0
    assert ranked[0]["entity_id"] == "ENT_HUB_IQBAL_ANSARI"
    assert ranked[0]["combined_hub_score"] > ranked[1]["combined_hub_score"]
