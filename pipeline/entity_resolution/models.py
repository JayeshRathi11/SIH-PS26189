from dataclasses import dataclass, field, asdict
from typing import Dict, Any, List, Optional


@dataclass
class CanonicalEntity:
    """A resolved canonical entity clustering multiple raw entity mentions."""
    canonical_id: str
    canonical_name: str
    entity_type: str
    domains: List[str] = field(default_factory=list)
    aliases: List[str] = field(default_factory=list)
    mention_ids: List[str] = field(default_factory=list)
    properties: Dict[str, Any] = field(default_factory=dict)
    first_seen: Optional[str] = None
    last_seen: Optional[str] = None
    timestamp: Optional[str] = None
    hub_score: float = 0.0
    community_cluster: int = 0
    verified_by_officer: bool = False
    status: str = "ACTIVE"

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
