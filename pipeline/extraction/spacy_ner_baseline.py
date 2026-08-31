from typing import Dict, List, Any
from pipeline.config import EntityType

class SpacyNERBaseline:
    """
    Optional secondary/baseline NLP extractor using spaCy NER rules for baseline comparison.
    """
    def __init__(self, model_name: str = "en_core_web_sm"):
        self.model_name = model_name
        self.nlp = None

    def _load_model(self):
        if self.nlp is None:
            try:
                import spacy
                self.nlp = spacy.load(self.model_name)
            except Exception as e:
                print(f"[SpacyNERBaseline Warning] Could not load spaCy model {self.model_name}: {e}")
                self.nlp = False

    def extract(self, text: str) -> Dict[str, Any]:
        self._load_model()
        if not self.nlp:
            return {"entities": [], "relationships": []}

        doc = self.nlp(text)
        entities = []
        for ent in doc.ents:
            etype = EntityType.PERSON.value
            if ent.label_ in ["ORG"]:
                etype = EntityType.ORGANIZATION.value
            elif ent.label_ in ["GPE", "LOC"]:
                etype = EntityType.LOCATION.value
            elif ent.label_ in ["DATE", "TIME", "MONEY"]:
                continue
                
            entities.append({
                "name": ent.text,
                "type": etype,
                "aliases": []
            })

        return {"entities": entities, "relationships": []}
