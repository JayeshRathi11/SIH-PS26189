import json
import logging
import hashlib
import unicodedata
import re
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Dict, Any, Optional, List, Tuple

from pipeline.data_ingestion.loader import Document, DatasetLoader
from pipeline.preprocessing.redaction import SensitiveIdRedactor, RedactionAuditRecord

logger = logging.getLogger(__name__)


@dataclass
class ProcessedDocument:
    """Represents a preprocessed document with both original and cleaned text."""
    document_id: str
    original_text: str
    processed_text: str
    source_file: str
    domain_name: Optional[str] = None
    document_type: Optional[str] = None
    case_id: Optional[str] = None
    date: Optional[str] = None
    location: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    preprocessing_metadata: Dict[str, Any] = field(default_factory=dict)

    @property
    def domain_id(self) -> Optional[str]:
        return self.domain_name

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class TextPreprocessor:
    """
    Conservative text preprocessor designed for investigative and legal texts.
    Performs deterministic NFKC normalization and automated P0 sensitive ID redaction
    while preserving all case, punctuation, numbers, names, dates, amounts, and terminology.
    """

    def __init__(
        self,
        unicode_form: str = "NFKC",
        normalize_whitespace: bool = True,
        normalize_line_endings: bool = True,
        remove_zero_width_chars: bool = True,
        redact_sensitive_ids: bool = True,
        min_text_length_warning: int = 50,
    ):
        self.unicode_form = unicode_form
        self.normalize_whitespace = normalize_whitespace
        self.normalize_line_endings = normalize_line_endings
        self.remove_zero_width_chars = remove_zero_width_chars
        self.redact_sensitive_ids = redact_sensitive_ids
        self.min_text_length_warning = min_text_length_warning
        self.redactor = SensitiveIdRedactor() if redact_sensitive_ids else None

    def check_quality(self, raw_text: str, processed_text: str) -> List[str]:
        """Runs non-destructive quality checks on the text, returning warnings if any."""
        warnings: List[str] = []
        if len(processed_text.strip()) < self.min_text_length_warning:
            warnings.append(f"Short text warning: document has only {len(processed_text.strip())} characters.")

        if "\ufffd" in raw_text:
            warnings.append("Encoding artifact: Unicode replacement character (\\ufffd) detected.")

        control_chars = [c for c in raw_text if unicodedata.category(c).startswith("C") and c not in ("\n", "\r", "\t")]
        if control_chars:
            warnings.append(f"Control characters detected: {len(control_chars)} unusual control characters found.")

        if re.search(r"\n\s*\n\s*\n\s*\n", raw_text):
            warnings.append("Excessive structural whitespace: multiple consecutive empty lines detected.")

        return warnings

    def process(self, document: Any) -> ProcessedDocument:
        """
        Executes the full conservative preprocessing and redaction pipeline on a Document or ProcessedDocument.
        """
        text = getattr(document, "text", None) or getattr(document, "original_text", None) or getattr(document, "processed_text", "")
        original_text = text
        changes_applied: List[str] = []
        redaction_audit = RedactionAuditRecord()

        # 1. Line ending normalization (\r\n and \r to \n)
        if self.normalize_line_endings and ("\r\n" in text or "\r" in text):
            text = text.replace("\r\n", "\n").replace("\r", "\n")
            changes_applied.append("normalized_line_endings")

        # 2. Zero-width character removal
        if self.remove_zero_width_chars:
            zero_width_chars = ["\u200B", "\u200C", "\u200D", "\uFEFF", "\u2060"]
            has_zw = any(c in text for c in zero_width_chars)
            if has_zw:
                for c in zero_width_chars:
                    text = text.replace(c, "")
                changes_applied.append("removed_zero_width_chars")

        # 3. Unicode normalization (NFKC)
        if self.unicode_form:
            normalized_text = unicodedata.normalize(self.unicode_form, text)
            if normalized_text != text:
                text = normalized_text
                changes_applied.append(f"unicode_normalization_{self.unicode_form}")

        # 4. Conservative whitespace normalization (intra-line space collapsing)
        if self.normalize_whitespace:
            lines = text.split("\n")
            cleaned_lines = [re.sub(r"[ \t]+", " ", line).strip() for line in lines]
            collapsed_text = "\n".join(cleaned_lines)
            collapsed_text = re.sub(r"\n{3,}", "\n\n", collapsed_text)
            if collapsed_text != text:
                text = collapsed_text
                changes_applied.append("collapsed_redundant_whitespace")

        # 5. P0 Automated Sensitive ID Redaction (Aadhaar, PAN, Passport, Bank Accounts)
        if self.redactor:
            redacted_text, redaction_audit = self.redactor.redact_text(text)
            if redaction_audit.total_redactions > 0:
                text = redacted_text
                changes_applied.append(f"redacted_{redaction_audit.total_redactions}_sensitive_ids")

        warnings = self.check_quality(original_text, text)

        # Build comprehensive metadata
        clean_meta = dict(document.metadata)
        prep_meta = {
            "changes_applied": changes_applied,
            "quality_warnings": warnings,
            "original_length": len(original_text),
            "processed_length": len(text),
            "original_sha256": hashlib.sha256(original_text.encode("utf-8")).hexdigest(),
            "processed_sha256": hashlib.sha256(text.encode("utf-8")).hexdigest(),
            "redaction_audit": {
                "total_redactions": redaction_audit.total_redactions,
                "aadhaar_redacted": redaction_audit.aadhaar_redacted,
                "pan_redacted": redaction_audit.pan_redacted,
                "passport_redacted": redaction_audit.passport_redacted,
                "bank_account_redacted": redaction_audit.bank_account_redacted,
                "compliance_status": "COMPLIANT_P0_MASKED" if redaction_audit.total_redactions > 0 else "NO_PII_FOUND"
            }
        }

        return ProcessedDocument(
            document_id=document.document_id,
            original_text=original_text,
            processed_text=text,
            source_file=document.source_file,
            domain_name=document.domain_name,
            document_type=document.document_type,
            case_id=document.case_id,
            date=document.date,
            location=document.location,
            metadata=clean_meta,
            preprocessing_metadata=prep_meta,
        )


class PreprocessingPipeline:
    """Batch executor for text preprocessing and PII redaction across documents."""

    def __init__(self, preprocessor: Optional[TextPreprocessor] = None):
        self.preprocessor = preprocessor or TextPreprocessor()

    def process_all(self, documents: List[Document]) -> List[ProcessedDocument]:
        processed = []
        for doc in documents:
            processed.append(self.preprocessor.process(doc))
        return processed
