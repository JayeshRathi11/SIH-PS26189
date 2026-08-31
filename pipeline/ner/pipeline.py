from typing import List, Dict
from pipeline.preprocessing.preprocessor import ProcessedDocument
from pipeline.ner.entity import EntityMention
from pipeline.ner.model import HybridNERModel


class NERPipeline:
    """Batch executor for Named Entity Recognition across multiple documents."""

    def __init__(self, model: HybridNERModel = None):
        self.model = model or HybridNERModel()

    def process_all(self, documents: List[ProcessedDocument]) -> Dict[str, List[EntityMention]]:
        results: Dict[str, List[EntityMention]] = {}
        for doc in documents:
            results[doc.document_id] = self.model.predict_document(doc)
        return results
