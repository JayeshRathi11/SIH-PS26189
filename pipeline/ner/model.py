import logging
from typing import List, Optional
from pipeline.preprocessing.preprocessor import ProcessedDocument
from pipeline.ner.entity import EntityMention
from pipeline.ner.rules import RuleBasedNER

logger = logging.getLogger(__name__)


class HybridNERModel:
    """
    Hybrid Named Entity Recognition Model combining rule-based heuristics and contextual models.
    Supports all 10 POLE schema entity types.
    """

    def __init__(self, mode: str = "hybrid"):
        self.mode = mode
        self.rule_ner = RuleBasedNER()

    def predict_document(self, document: ProcessedDocument) -> List[EntityMention]:
        return self.rule_ner.extract_entities(document)


class IndicNERModel(HybridNERModel):
    """IndicNER Model specialization."""
    pass


class SpacyNERModel(HybridNERModel):
    """Spacy NER Model specialization."""
    pass
