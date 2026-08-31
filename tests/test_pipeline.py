import pytest
from pathlib import Path
from pipeline.config import EntityType, MasterRelationshipType
from pipeline.normalization.schema_mapper import normalize_relationship, normalize_entity_type
from pipeline.resolution.entity_resolver import EntityResolver
from pipeline.graph.analytics import GraphAnalyticsEngine
from pipeline.ingestion.sanitizer import sanitize_text, compute_sha256
from pipeline.graph.pattern_detector import SuspiciousPatternDetector
from pipeline.preprocessing.redaction import SensitiveIdRedactor
from pipeline.knowledge_graph.builder import KnowledgeGraphBuilder
from pipeline.relation_extraction.extractor import RuleBasedRelationExtractor
from pipeline.preprocessing.preprocessor import ProcessedDocument
from pipeline.ner.entity import EntityMention


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
    assert hash1 == hash2


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


def test_temporal_decay_weighting_and_chronological_ordering():
    entities = [
        {"canonical_id": "ENT_01", "canonical_name": "Entity 1", "type": "PERSON", "domains": ["01"]},
        {"canonical_id": "ENT_02", "canonical_name": "Entity 2", "type": "PERSON", "domains": ["01"]}
    ]
    relationships = [
        {"source_id": "ENT_01", "target_id": "ENT_02", "relationship_type": "ASSOCIATE_OF", "confidence": 0.95, "timestamp": "2024-01-01"},
        {"source_id": "ENT_01", "target_id": "ENT_02", "relationship_type": "CALLED", "confidence": 0.90, "timestamp": "2025-06-15"}
    ]
    analytics = GraphAnalyticsEngine(entities, relationships, as_of_date="2026-08-31")
    edge_weight = analytics.G.get_edge_data("ENT_01", "ENT_02")["weight"]
    assert edge_weight < 0.95 # Verified decay applied

    # Verify chronological sequence ordering
    timeline = analytics.get_chronological_events()
    assert len(timeline) == 2
    assert timeline[0]["timestamp"] == "2024-01-01"
    assert timeline[1]["timestamp"] == "2025-06-15"


def test_10_node_pole_schema_graph_construction():
    """Validates full 10-node POLE schema support in KnowledgeGraphBuilder."""
    builder = KnowledgeGraphBuilder()
    
    canonical_entities = [
        {"canonical_id": "ENT_P1", "canonical_name": "Iqbal Ansari", "entity_type": EntityType.PERSON.value},
        {"canonical_id": "ENT_ORG1", "canonical_name": "Ansari Logistics Pvt Ltd", "entity_type": EntityType.ORGANIZATION.value},
        {"canonical_id": "ENT_LOC1", "canonical_name": "Nhava Sheva Port Safehouse", "entity_type": EntityType.LOCATION.value},
        {"canonical_id": "ENT_VEH1", "canonical_name": "MH-12-AB-1234", "entity_type": EntityType.VEHICLE.value},
        {"canonical_id": "ENT_PHONE1", "canonical_name": "+91-98201-99999", "entity_type": EntityType.PHONE_NUMBER.value},
        {"canonical_id": "ENT_BANK1", "canonical_name": "HDFC-00129481928", "entity_type": EntityType.BANK_ACCOUNT.value},
    ]
    
    documents = [
        {"document_id": "DOC_FIR_1163", "original_text": "FIR 1163/2026 Seizure of contraband.", "domain_name": "01_narcotics_trafficking"}
    ]
    
    transactions = [
        {"transaction_id": "TXN_HAWALA_01", "amount": 2500000, "currency": "INR", "method": "HAWALA", "sender_id": "ENT_P1", "receiver_id": "ENT_BANK1"}
    ]
    
    cases = [
        {"case_id": "CASE_1163", "title": "Special Anti-Narcotics Case 1163", "domain": "01_narcotics_trafficking"}
    ]
    
    kg = builder.build_graph(
        canonical_entities=canonical_entities,
        extracted_relations=[],
        documents=documents,
        transactions=transactions,
        cases=cases
    )
    
    node_types = {n.entity_type for n in kg.nodes.values()}
    # Assert all POLE node types present
    assert EntityType.PERSON.value in node_types
    assert EntityType.ORGANIZATION.value in node_types
    assert EntityType.LOCATION.value in node_types
    assert EntityType.VEHICLE.value in node_types
    assert EntityType.PHONE_NUMBER.value in node_types
    assert EntityType.BANK_ACCOUNT.value in node_types
    assert EntityType.TRANSACTION.value in node_types
    assert EntityType.CASE.value in node_types
    assert EntityType.DOCUMENT.value in node_types
    assert kg.metadata["pole_schema_version"] == "10_NODE_COMPLETE"


def test_relation_extraction_passive_voice_and_hawala():
    """Validates high-recall relation extraction parsing passive voice and hawala transfers."""
    extractor = RuleBasedRelationExtractor()
    
    # 1. Passive voice extraction
    doc1 = ProcessedDocument(
        document_id="DOC_TEST_PASSIVE",
        original_text="Farhan Qureshi was instructed by Iqbal Ansari to transport the consignment.",
        processed_text="Farhan Qureshi was instructed by Iqbal Ansari to transport the consignment.",
        source_file="test.md"
    )
    mentions1 = [
        EntityMention(mention_id="M1", text="Farhan Qureshi", entity_type="PERSON", start_char=0, end_char=14, document_id="DOC_TEST_PASSIVE"),
        EntityMention(mention_id="M2", text="Iqbal Ansari", entity_type="PERSON", start_char=33, end_char=45, document_id="DOC_TEST_PASSIVE")
    ]
    rels1 = extractor.extract_from_document(doc1, mentions1)
    assert len(rels1) >= 1
    # Iqbal Ansari is source (handler), Farhan is target
    assert rels1[0].relation_type == "ASSOCIATE_OF"
    assert rels1[0].source_text == "Iqbal Ansari"
    assert rels1[0].target_text == "Farhan Qureshi"

    # 2. Hawala settlement extraction
    doc2 = ProcessedDocument(
        document_id="DOC_TEST_HAWALA",
        original_text="Iliyas Khan settled payment via hawala with Devendra Solanki for the narcotics delivery.",
        processed_text="Iliyas Khan settled payment via hawala with Devendra Solanki for the narcotics delivery.",
        source_file="test.md"
    )
    mentions2 = [
        EntityMention(mention_id="M3", text="Iliyas Khan", entity_type="PERSON", start_char=0, end_char=11, document_id="DOC_TEST_HAWALA"),
        EntityMention(mention_id="M4", text="Devendra Solanki", entity_type="PERSON", start_char=44, end_char=60, document_id="DOC_TEST_HAWALA")
    ]
    rels2 = extractor.extract_from_document(doc2, mentions2)
    assert len(rels2) >= 1
    assert rels2[0].relation_type == "SETTLED_PAYMENT_VIA_HAWALA"


def test_sensitive_id_redactor_all_identifiers():
    """Validates P0 Automated Redaction for Aadhaar, PAN, Passport, and Bank Accounts."""
    redactor = SensitiveIdRedactor()
    raw = (
        "Operative Aadhaar: 1234 5678 9012, PAN: ABCDE1234F, Passport: Z1234567, "
        "Account: 91827364510293."
    )
    sanitized, audit = redactor.redact_text(raw)
    
    assert audit.aadhaar_redacted == 1
    assert audit.pan_redacted == 1
    assert audit.passport_redacted == 1
    assert audit.bank_account_redacted == 1
    assert audit.total_redactions == 4
    
    assert "1234 5678 9012" not in sanitized
    assert "ABCDE1234F" not in sanitized
    assert "Z1234567" not in sanitized
    assert "91827364510293" not in sanitized
    assert "[ID Redacted: XXXX-XXXX-9012]" in sanitized
    assert "[PAN Redacted: XXXXX1234F]" in sanitized
    assert "[Passport Redacted: Z*****7]" in sanitized
    assert "[Account Redacted: XXXX-XXXX-0293]" in sanitized
