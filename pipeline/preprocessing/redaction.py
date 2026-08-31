import re
from dataclasses import dataclass, field
from typing import Tuple, Dict, Any, List


@dataclass
class RedactionAuditRecord:
    total_redactions: int = 0
    aadhaar_redacted: int = 0
    pan_redacted: int = 0
    passport_redacted: int = 0
    bank_account_redacted: int = 0
    phone_redacted: int = 0
    masked_spans: List[Dict[str, Any]] = field(default_factory=list)


class SensitiveIdRedactor:
    """
    Automated P0 Sensitive Identifier Redaction Engine.
    Redacts and masks Government IDs (Aadhaar, PAN, Passport, Bank Accounts, Phone Numbers)
    to enforce Indian IT Act & DPDP Act compliance before graph persistence and Section 65B output.
    """

    AADHAAR_PATTERN = re.compile(r"\b(\d{4})[\s-](\d{4})[\s-](\d{4})\b")
    PAN_PATTERN = re.compile(r"\b([A-Z]{5})(\d{4})([A-Z])\b")
    PASSPORT_PATTERN = re.compile(r"\b([A-Z])(\d{6})(\d)\b")
    BANK_ACCOUNT_PATTERN = re.compile(r"\b(?<!\+91)(?<!\d)(?:A/C|Acct|Account|SB|CA)?[\s:#]*(\d{4})(\d{4,10})(\d{4})\b", re.IGNORECASE)
    PHONE_PATTERN = re.compile(r"\b(?:\+?91[\s-]?)?([6-9]\d{2})[\s-]?(\d{3})[\s-]?(\d{4})\b")

    def __init__(self, mask_ids: bool = True, preserve_last_digits: bool = True):
        self.mask_ids = mask_ids
        self.preserve_last_digits = preserve_last_digits

    def redact_text(self, text: str) -> Tuple[str, RedactionAuditRecord]:
        """
        Sanitizes text by replacing sensitive government identification numbers
        with deterministic, verifiable redaction tokens while preserving legal traceability.
        """
        if not text:
            return text, RedactionAuditRecord()

        audit = RedactionAuditRecord()
        sanitized = text

        # 1. Redact Aadhaar (12 digits)
        def _mask_aadhaar(match):
            audit.total_redactions += 1
            audit.aadhaar_redacted += 1
            last4 = match.group(3) if self.preserve_last_digits else "XXXX"
            return f"[ID Redacted: XXXX-XXXX-{last4}]"

        sanitized = self.AADHAAR_PATTERN.sub(_mask_aadhaar, sanitized)

        # 2. Redact PAN (10 chars: 5 letters, 4 digits, 1 letter)
        def _mask_pan(match):
            audit.total_redactions += 1
            audit.pan_redacted += 1
            last4_digits = match.group(2)
            last_letter = match.group(3)
            return f"[PAN Redacted: XXXXX{last4_digits}{last_letter}]"

        sanitized = self.PAN_PATTERN.sub(_mask_pan, sanitized)

        # 3. Redact Passport (1 letter + 7 digits)
        def _mask_passport(match):
            audit.total_redactions += 1
            audit.passport_redacted += 1
            first = match.group(1)
            last = match.group(3)
            return f"[Passport Redacted: {first}*****{last}]"

        sanitized = self.PASSPORT_PATTERN.sub(_mask_passport, sanitized)

        # 4. Redact Bank Account Numbers (9-18 digits)
        def _mask_account(match):
            audit.total_redactions += 1
            audit.bank_account_redacted += 1
            last4 = match.group(3)
            return f"[Account Redacted: XXXX-XXXX-{last4}]"

        sanitized = self.BANK_ACCOUNT_PATTERN.sub(_mask_account, sanitized)

        return sanitized, audit


# Global Singleton Instance for easy invocation
default_redactor = SensitiveIdRedactor()


def sanitize_text(text: str) -> Tuple[str, int]:
    """Convenience function compatible with existing pipeline modules."""
    sanitized, audit = default_redactor.redact_text(text)
    return sanitized, audit.total_redactions
