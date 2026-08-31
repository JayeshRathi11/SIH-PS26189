import logging
from typing import Dict, Any, List
from pipeline.ner.model import HybridNERModel
from pipeline.relation_extraction.extractor import RuleBasedRelationExtractor
from pipeline.preprocessing.preprocessor import ProcessedDocument

logger = logging.getLogger(__name__)


class LLMExtractor:
    """Hybrid Extractor performing NER, RE, and POLE attribute extraction."""

    def __init__(self):
        self.ner_model = HybridNERModel()
        self.relation_extractor = RuleBasedRelationExtractor()

    def extract(self, text: str, domain: str = None) -> Dict[str, Any]:
        doc = ProcessedDocument(
            document_id="DOC_DYNAMIC",
            original_text=text,
            processed_text=text,
            source_file="dynamic_input",
            domain_name=domain
        )
        mentions = self.ner_model.predict_document(doc)
        relations = self.relation_extractor.extract_from_document(doc, mentions)

        return {
            "entities": [m.to_dict() for m in mentions],
            "relationships": [r.to_dict() for r in relations]
        }
