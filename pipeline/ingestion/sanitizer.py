import re
import hashlib
from typing import Dict, Tuple

# Regex Patterns for Sensitive National Identifiers
AADHAAR_PATTERN = re.compile(r'\b(?!(?:0000|1111|2222|3333|4444|5555|6666|7777|8888|9999))([2-9]\d{3})[ -]?(\d{4})[ -]?(\d{4})\b')
PAN_PATTERN = re.compile(r'\b([A-Z]{5}[0-9]{4}[A-Z]{1})\b')
VOTER_ID_PATTERN = re.compile(r'\b([A-Z]{3}[0-9]{7})\b')
PASSPORT_PATTERN = re.compile(r'\b([A-PR-WYa-pr-wy][1-9]\d{7})\b')
MYNUMBER_JP_PATTERN = re.compile(r'\b(\d{4})[ -]?(\d{4})[ -]?(\d{4})\b') # Japan My Number
KOREAN_RRN_PATTERN = re.compile(r'\b(\d{6})[ -]?([1-4]\d{6})\b') # Korean Resident Registration Number

def hash_token(val: str, length: int = 4) -> str:
    """Generates a non-reversible deterministic short hash tag for redacted identifiers."""
    cleaned = re.sub(r'\s+|-', '', val.strip())
    digest = hashlib.sha256(cleaned.encode('utf-8')).hexdigest().upper()
    return digest[:length]

def compute_sha256(text: str) -> str:
    """Computes full SHA-256 cryptographic digest for chain-of-custody verification."""
    if not text:
        return ""
    return hashlib.sha256(text.encode('utf-8')).hexdigest()

def sanitize_text(text: str) -> Tuple[str, int]:
    """
    Programmatically redacts sensitive national identifiers (Aadhaar, PAN, Voter ID, Passport, etc.)
    Returns sanitized text and the total count of redactions performed.
    """
    if not text or not isinstance(text, str):
        return text or "", 0

    redactions_count = 0

    def aadhaar_sub(match):
        nonlocal redactions_count
        redactions_count += 1
        full_match = match.group(0)
        h = hash_token(full_match, 4)
        return f"[ID Redacted: {h}]"

    def pan_sub(match):
        nonlocal redactions_count
        redactions_count += 1
        full_match = match.group(0)
        h = hash_token(full_match, 4)
        return f"[PAN Redacted: {h}]"

    def voter_sub(match):
        nonlocal redactions_count
        redactions_count += 1
        full_match = match.group(0)
        h = hash_token(full_match, 4)
        return f"[VoterID Redacted: {h}]"

    def passport_sub(match):
        nonlocal redactions_count
        redactions_count += 1
        full_match = match.group(0)
        h = hash_token(full_match, 4)
        return f"[Passport Redacted: {h}]"

    def rrn_sub(match):
        nonlocal redactions_count
        redactions_count += 1
        full_match = match.group(0)
        h = hash_token(full_match, 4)
        return f"[NationalID Redacted: {h}]"

    # Redact in order of specificity
    sanitized = AADHAAR_PATTERN.sub(aadhaar_sub, text)
    sanitized = PAN_PATTERN.sub(pan_sub, sanitized)
    sanitized = VOTER_ID_PATTERN.sub(voter_sub, sanitized)
    sanitized = PASSPORT_PATTERN.sub(passport_sub, sanitized)
    sanitized = KOREAN_RRN_PATTERN.sub(rrn_sub, sanitized)

    return sanitized, redactions_count
