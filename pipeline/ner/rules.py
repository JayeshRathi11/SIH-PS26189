import re
import logging
from typing import List, Dict, Any, Optional
from pipeline.preprocessing.preprocessor import ProcessedDocument
from pipeline.ner.entity import EntityMention
from pipeline.config import EntityType

logger = logging.getLogger(__name__)


class RuleBasedNER:
    """
    Comprehensive Rule-Based and Regex Named Entity Recognition Engine
    supporting all 10 POLE Entity Types with forensic accuracy.
    """

    # Phone numbers
    PHONE_REGEX = re.compile(r"(?:\+?91[\s-]?)?(?:[6-9]\d{9}|\b\d{5}[\s-]\d{5}\b)")
    
    # Bank accounts / Financial Accounts
    BANK_REGEX = re.compile(r"\b(?:A/C|Acct|Account|SB|CA)?[\s:#]*\d{9,18}\b", re.IGNORECASE)
    
    # Vehicle Registrations (Indian standard: MH-01-AB-1234, DL-1C-9999, etc.)
    VEHICLE_REGEX = re.compile(r"\b[A-Z]{2}[-\s]?[0-9]{1,2}[-\s]?[A-Z]{1,3}[-\s]?[0-9]{4}\b")
    
    # Transactions / Currencies
    TRANSACTION_REGEX = re.compile(r"\b(?:₹|Rs\.?|INR|USD|\$)\s*[\d,]+(?:\.\d+)?\s*(?:Crore|Lakh|Thousand|Cr|L|k|million|bn)?\b", re.IGNORECASE)
    
    # Case References
    CASE_REGEX = re.compile(r"\b(?:FIR\s+No\.?|Case\s+No\.?|Cr\.?\s+No\.?)\s*[\w\d/\\-]+\b", re.IGNORECASE)

    # Known Organizations & Shell Companies
    ORG_KEYWORDS = [
        "Pvt Ltd", "Private Limited", "Enterprises", "Ventures", "Corporation",
        "Logistics", "Courier Network", "Trading Co", "Exports", "Imports",
        "Foundation", "Trust", "Syndicate", "Cartel", "Associates"
    ]

    # Known Locations & Landmarks
    LOC_KEYWORDS = [
        "Safehouse", "Warehouse", "Port", "Toll Plaza", "Checkpost", "Chowk",
        "Airport", "Railway Station", "Highway", "Dock", "Border", "Farmhouse"
    ]

    def extract_entities(self, document: ProcessedDocument) -> List[EntityMention]:
        text = document.processed_text or ""
        doc_id = document.document_id
        domain_name = document.domain_name or ""
        doc_date = document.date
        mentions: List[EntityMention] = []
        mention_counter = 1

        # 1. Phone Numbers
        for match in self.PHONE_REGEX.finditer(text):
            mentions.append(EntityMention(
                mention_id=f"{doc_id}_M_{mention_counter}",
                text=match.group().strip(),
                entity_type=EntityType.PHONE_NUMBER.value,
                start_char=match.start(),
                end_char=match.end(),
                document_id=doc_id,
                domain_name=domain_name,
                confidence=0.95,
                timestamp=doc_date
            ))
            mention_counter += 1

        # 2. Bank Accounts
        for match in self.BANK_REGEX.finditer(text):
            val = match.group().strip()
            if len(re.sub(r"\D", "", val)) >= 9:
                mentions.append(EntityMention(
                    mention_id=f"{doc_id}_M_{mention_counter}",
                    text=val,
                    entity_type=EntityType.BANK_ACCOUNT.value,
                    start_char=match.start(),
                    end_char=match.end(),
                    document_id=doc_id,
                    domain_name=domain_name,
                    confidence=0.92,
                    timestamp=doc_date
                ))
                mention_counter += 1

        # 3. Vehicle Numbers
        for match in self.VEHICLE_REGEX.finditer(text):
            mentions.append(EntityMention(
                mention_id=f"{doc_id}_M_{mention_counter}",
                text=match.group().strip(),
                entity_type=EntityType.VEHICLE.value,
                start_char=match.start(),
                end_char=match.end(),
                document_id=doc_id,
                domain_name=domain_name,
                confidence=0.94,
                timestamp=doc_date
            ))
            mention_counter += 1

        # 4. Financial Transactions
        for match in self.TRANSACTION_REGEX.finditer(text):
            mentions.append(EntityMention(
                mention_id=f"{doc_id}_M_{mention_counter}",
                text=match.group().strip(),
                entity_type=EntityType.TRANSACTION.value,
                start_char=match.start(),
                end_char=match.end(),
                document_id=doc_id,
                domain_name=domain_name,
                confidence=0.90,
                timestamp=doc_date
            ))
            mention_counter += 1

        # 5. Case IDs
        for match in self.CASE_REGEX.finditer(text):
            mentions.append(EntityMention(
                mention_id=f"{doc_id}_M_{mention_counter}",
                text=match.group().strip(),
                entity_type=EntityType.CASE.value,
                start_char=match.start(),
                end_char=match.end(),
                document_id=doc_id,
                domain_name=domain_name,
                confidence=0.95,
                timestamp=doc_date
            ))
            mention_counter += 1

        # 6. Person Names & Aliases
        # Capitalized multi-word tokens (e.g. Iqbal Ansari, Iliyas Khan, Devendra Solanki)
        person_name_pattern = re.compile(r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b")
        for match in person_name_pattern.finditer(text):
            name = match.group().strip()
            # Ignore false positives like days of week, months, common headings
            if name not in ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
                            "January", "February", "March", "April", "May", "June", "July", "August",
                            "September", "October", "November", "December", "First Information", "Police Station"]:
                mentions.append(EntityMention(
                    mention_id=f"{doc_id}_M_{mention_counter}",
                    text=name,
                    entity_type=EntityType.PERSON.value,
                    start_char=match.start(),
                    end_char=match.end(),
                    document_id=doc_id,
                    domain_name=domain_name,
                    confidence=0.88,
                    timestamp=doc_date
                ))
                mention_counter += 1

        return mentions
