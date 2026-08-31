import pytest
from pathlib import Path
from pipeline.config import EntityType, MasterRelationshipType
from pipeline.normalization.schema_mapper import normalize_relationship, normalize_entity_type
from pipeline.resolution.entity_resolver import EntityResolver
from pipeline.graph.analytics import GraphAnalyticsEngine
from pipeline.ingestion.sanitizer import sanitize_text, compute_sha256
from pipeline.graph.pattern_detector import SuspiciousPatternDetector

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

def test_sanitizer_aadhaar_pan_redaction():
    sample_text = (
        "Subject Devendra Solanki holding Aadhaar UID 4589 1234 9876 and PAN ABCDE1234F "
        "was intercepted near Pune toll plaza."
    )
    sanitized, red_count = sanitize_text(sample_text)
    assert red_count >= 2
    assert "4589 1234 9876" not in sanitized
    assert "ABCDE1234F" not in sanitized
    assert "[ID Redacted:" in sanitized
    assert "[PAN Redacted:" in sanitized

def test_evidence_hashing():
    text1 = "FIR No. 1163/2026 registered against unknown syndicate."
    hash1 = compute_sha256(text1)
    hash2 = compute_sha256(text1)
    assert len(hash1) == 64
    assert hash1 == hash2 # Deterministic

def test_suspicious_pattern_detector():
    entities = [
        {"canonical_id": "ENT_A", "canonical_name": "Iqbal Ansari", "type": "PERSON", "domains": ["01", "02", "03", "04"]},
        {"canonical_id": "ENT_B", "canonical_name": "Mule B", "type": "PERSON", "domains": ["03"]},
        {"canonical_id": "ENT_C", "canonical_name": "Mule C", "type": "PERSON", "domains": ["03"]}
    ]
    relationships = [
        {"source_id": "ENT_A", "target_id": "ENT_B", "relationship_type": "FINANCIAL_TRANSACTION_WITH", "domain": "03_cyber_financial_fraud"},
        {"source_id": "ENT_B", "target_id": "ENT_C", "relationship_type": "FINANCIAL_TRANSACTION_WITH", "domain": "03_cyber_financial_fraud"},
        {"source_id": "ENT_C", "target_id": "ENT_A", "relationship_type": "FINANCIAL_TRANSACTION_WITH", "domain": "03_cyber_financial_fraud"}
    ]
    detector = SuspiciousPatternDetector(entities, relationships)
    alerts = detector.detect_all_patterns()
    
    assert len(alerts) >= 1
    pattern_types = [a["pattern_type"] for a in alerts]
    assert "CROSS_DOMAIN_SYNDICATE_HUB" in pattern_types or "CIRCULAR_HAWALA_MULE_ROUTING" in pattern_types

def test_temporal_decay_weighting():
    entities = [
        {"canonical_id": "ENT_01", "canonical_name": "Entity 1", "type": "PERSON", "domains": ["01"]},
        {"canonical_id": "ENT_02", "canonical_name": "Entity 2", "type": "PERSON", "domains": ["01"]}
    ]
    # Edge from 300 days ago vs today
    relationships = [
        {"source_id": "ENT_01", "target_id": "ENT_02", "relationship_type": "ASSOCIATE_OF", "confidence": 0.95, "timestamp": "2024-01-01"}
    ]
    analytics = GraphAnalyticsEngine(entities, relationships, as_of_date="2026-08-31")
    edge_weight = analytics.G.get_edge_data("ENT_01", "ENT_02")["weight"]
    assert edge_weight < 0.95 # Verified decay applied
