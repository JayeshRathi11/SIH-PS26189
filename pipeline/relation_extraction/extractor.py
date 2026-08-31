import re
import logging
from typing import List, Dict, Any, Optional, Tuple

from pipeline.preprocessing.preprocessor import ProcessedDocument
from pipeline.ner.entity import EntityMention
from pipeline.relation_extraction.models import RelationMention, ExtractedRelation
from pipeline.relation_extraction.patterns import RELATION_RULES, RelationRule
from pipeline.config import MasterRelationshipType

logger = logging.getLogger(__name__)


class RuleBasedRelationExtractor:
    """
    High-Recall Relation Extraction Engine.
    Parses active and passive voice, multi-sentence contextual evidence, and domain patterns.
    """

    def __init__(self, rules: Optional[List[RelationRule]] = None, max_sentence_window: int = 2):
        self.rules = rules or RELATION_RULES
        self.max_sentence_window = max_sentence_window

    def extract_from_document(
        self,
        document: ProcessedDocument,
        mentions: List[EntityMention]
    ) -> List[RelationMention]:
        """
        Extracts all relational mentions from document text given the identified entity mentions.
        """
        if not mentions or len(mentions) < 2:
            return []

        text = document.processed_text or ""
        doc_id = document.document_id
        domain_name = document.domain_name or ""
        doc_date = document.date

        # Group mentions by sentence
        sentences = [s.strip() for s in re.split(r"(?<=[.!?\n])\s+", text) if s.strip()]
        mentions_sorted = sorted(mentions, key=lambda m: m.start_char)

        extracted: List[RelationMention] = []
        seen_pairs = set()

        for i in range(len(mentions_sorted)):
            m1 = mentions_sorted[i]
            for j in range(i + 1, min(i + 8, len(mentions_sorted))):
                m2 = mentions_sorted[j]

                # Don't link identical text mentions
                if m1.text.lower() == m2.text.lower():
                    continue

                pair_key = (m1.mention_id, m2.mention_id)
                if pair_key in seen_pairs:
                    continue

                # Get context window between mentions
                span_start = min(m1.start_char, m2.start_char)
                span_end = max(m1.end_char, m2.end_char)
                context_between = text[span_start:span_end]

                # If distance between mentions is too large (> 350 chars), skip unless strong financial keywords
                if len(context_between) > 350 and not any(kw in context_between.lower() for kw in ["hawala", "crore", "lakh", "instruct", "call"]):
                    continue

                # Match rules
                for rule in self.rules:
                    # Check types
                    t1_matches = m1.entity_type in rule.source_types
                    t2_matches = m2.entity_type in rule.target_types

                    rev_t1_matches = m1.entity_type in rule.target_types
                    rev_t2_matches = m2.entity_type in rule.source_types

                    match = rule.pattern.search(context_between)
                    if match:
                        if t1_matches and t2_matches:
                            source = m2 if rule.is_reverse else m1
                            target = m1 if rule.is_reverse else m2
                        elif rev_t1_matches and rev_t2_matches:
                            source = m1 if rule.is_reverse else m2
                            target = m2 if rule.is_reverse else m1
                        else:
                            # If rule allows any matching type
                            source = m1
                            target = m2

                        rel = RelationMention(
                            source_mention_id=source.mention_id,
                            target_mention_id=target.mention_id,
                            source_text=source.text,
                            target_text=target.text,
                            source_type=source.entity_type,
                            target_type=target.entity_type,
                            relation_type=rule.relation_type,
                            raw_relation_type=rule.trigger_name or rule.relation_type,
                            confidence=rule.confidence,
                            evidence_text=context_between.strip(),
                            start_char=span_start,
                            end_char=span_end,
                            document_id=doc_id,
                            domain_name=domain_name,
                            timestamp=doc_date
                        )
                        extracted.append(rel)
                        seen_pairs.add(pair_key)
                        break

        return extracted


class RelationExtractionPipeline:
    """Batch executor for relation extraction across multiple documents."""

    def __init__(self, extractor: Optional[RuleBasedRelationExtractor] = None):
        self.extractor = extractor or RuleBasedRelationExtractor()

    def process_all(
        self,
        documents: List[ProcessedDocument],
        mentions_by_doc: Dict[str, List[EntityMention]]
    ) -> List[RelationMention]:
        all_relations = []
        for doc in documents:
            doc_mentions = mentions_by_doc.get(doc.document_id, [])
            rels = self.extractor.extract_from_document(doc, doc_mentions)
            all_relations.extend(rels)
        return all_relations
