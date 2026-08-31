from dataclasses import dataclass, field, asdict
from typing import Dict, Any, Optional


@dataclass
class EntityMention:
    """An individual extracted entity mention from raw text."""
    mention_id: str
    text: str
    entity_type: str  # One of EntityType values
    start_char: int
    end_char: int
    document_id: str
    domain_name: str = ""
    confidence: float = 0.90
    metadata: Dict[str, Any] = field(default_factory=dict)
    canonical_id: Optional[str] = None
    canonical_name: Optional[str] = None
    timestamp: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
