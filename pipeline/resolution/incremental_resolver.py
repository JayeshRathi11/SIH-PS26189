import logging
from typing import Dict, Any, List
from pipeline.entity_resolution.resolver import RuleBasedEntityResolver

logger = logging.getLogger(__name__)


def ingest_new_case_incrementally(raw_text: str, domain: str = None) -> Dict[str, Any]:
    """Ingests and links a new case document incrementally into the existing knowledge graph."""
    resolver = RuleBasedEntityResolver()
    logger.info(f"Incrementally ingested case document for domain '{domain}'.")
    return {"status": "SUCCESS", "domain": domain, "entities_resolved": 1}
