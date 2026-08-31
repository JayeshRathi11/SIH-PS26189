import hashlib
from typing import Tuple
from pipeline.preprocessing.redaction import SensitiveIdRedactor, sanitize_text


def compute_sha256(text: str) -> str:
    """Computes deterministic SHA-256 hash for Section 65B legal integrity."""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()
