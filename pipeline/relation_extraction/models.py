from dataclasses import dataclass, field, asdict
from typing import Dict, Any, Optional, List


@dataclass
class RelationMention:
    """A raw textual relationship occurrence between two entity mentions."""
    source_mention_id: str
    target_mention_id: str
    source_text: str
    target_text: str
    source_type: str
    target_type: str
    relation_type: str
    raw_relation_type: Optional[str] = None
    confidence: float = 0.90
    evidence_text: str = ""
    start_char: int = 0
    end_char: int = 0
    document_id: str = ""
    domain_name: str = ""
    timestamp: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ExtractedRelation:
    """A resolved relationship between two canonical entity IDs."""
    source_id: str
    target_id: str
    relationship_type: str
    raw_relationship_type: Optional[str] = None
    confidence: float = 0.90
    domain: str = ""
    evidence: str = ""
    source_document_id: str = ""
    timestamp: Optional[str] = None
    properties: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
