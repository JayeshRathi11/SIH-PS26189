import re
from dataclasses import dataclass
from typing import List, Set, Optional


@dataclass
class RelationRule:
    relation_type: str
    source_types: Set[str]
    target_types: Set[str]
    pattern: re.Pattern
    confidence: float
    is_reverse: bool = False
    post_target_pattern: Optional[re.Pattern] = None
    pre_source_pattern: Optional[re.Pattern] = None
    trigger_name: str = ""
    description: str = ""


RELATION_RULES: List[RelationRule] = [
    # =========================================================================
    # 1. BENEFICIAL_OWNER_OF & LEADS_ORGANIZATION (PASSIVE FIRST)
    # =========================================================================
    RelationRule(
        relation_type="BENEFICIAL_OWNER_OF",
        source_types={"PERSON"},
        target_types={"ORGANIZATION"},
        pattern=re.compile(
            r"\b(?:is\s+(?:understood\s+to\s+be\s+)?beneficially\s+owned\s+by|is\s+controlled\s+by|registered\s+entity\s+styled\s+[A-Za-z0-9&'\s]+\s+is\s+understood\s+to\s+be\s+controlled\s+by|controlled\s+by|beneficially\s+owned\s+by|headed\s+by|run\s+by|managed\s+by)\b",
            re.IGNORECASE,
        ),
        confidence=0.96,
        is_reverse=True,
        trigger_name="beneficially_owned_by_passive",
    ),
    RelationRule(
        relation_type="BENEFICIAL_OWNER_OF",
        source_types={"PERSON"},
        target_types={"ORGANIZATION"},
        pattern=re.compile(
            r"\b(?:beneficial\s+owner\s+of|beneficial\s+ownership\s+of|beneficial\s+controller\s+of|beneficial\s+controller\s+behind|beneficially\s+owns|ultimate\s+beneficial\s+owner\s+of|director\s+of|controls|runs\s+(?:the\s+)?company|owner\s+of|managing\s+director|founder\s+of|head\s+of)\b",
            re.IGNORECASE,
        ),
        confidence=0.95,
        trigger_name="beneficial_owner_of_direct",
    ),
    RelationRule(
        relation_type="LEADS_ORGANIZATION",
        source_types={"PERSON"},
        target_types={"ORGANIZATION"},
        pattern=re.compile(
            r"\b(?:leads|operates|coordinates|heads|runs|supervises|commands|primary\s+point\s+of\s+coordination\s+for)\b",
            re.IGNORECASE,
        ),
        confidence=0.92,
        trigger_name="leads_organization_direct",
    ),

    # =========================================================================
    # 2. ASSOCIATE_OF & INSTRUCTIONS (PASSIVE FIRST)
    # =========================================================================
    RelationRule(
        relation_type="ASSOCIATE_OF",
        source_types={"PERSON"},
        target_types={"PERSON"},
        pattern=re.compile(
            r"\b(?:was\s+instructed\s+by|was\s+ordered\s+by|was\s+tasked\s+by|was\s+directed\s+by|was\s+handled\s+by|was\s+recruited\s+by|reports\s+to|takes\s+orders\s+from|subordinate\s+to)\b",
            re.IGNORECASE,
        ),
        confidence=0.96,
        is_reverse=True,
        trigger_name="associate_instructions_passive",
    ),
    RelationRule(
        relation_type="ASSOCIATE_OF",
        source_types={"PERSON"},
        target_types={"PERSON"},
        pattern=re.compile(
            r"\b(?:instructed|ordered|commanded|tasked|directed|contacted|met\s+with|handler\s+of|co-conspirator|associate\s+of|working\s+under|operative\s+for|confirms\s+to|reported\s+to)\b",
            re.IGNORECASE,
        ),
        confidence=0.93,
        trigger_name="associate_instructions_direct",
    ),

    # =========================================================================
    # 3. CONSIGNMENT & NARCOTICS (PASSIVE FIRST)
    # =========================================================================
    RelationRule(
        relation_type="DISTRIBUTED_CONSIGNMENT",
        source_types={"PERSON"},
        target_types={"PERSON"},
        pattern=re.compile(
            r"\b(?:was\s+handed\s+by|was\s+supplied\s+by|received\s+(?:the\s+)?consignment\s+from|consignment\s+was\s+delivered\s+by|package\s+received\s+from)\b",
            re.IGNORECASE,
        ),
        confidence=0.95,
        is_reverse=True,
        trigger_name="received_consignment_passive",
    ),
    RelationRule(
        relation_type="DISTRIBUTED_CONSIGNMENT",
        source_types={"PERSON"},
        target_types={"PERSON"},
        pattern=re.compile(
            r"\b(?:handed|handing|passed|passing|delivered|giving|supplied|supplying|couriered|transferred)\s+(?:[A-Za-z]+\s+){0,3}(?:a\s+)?(?:small\s+)?(?:wrapped\s+)?(?:bundle|consignment|crate|contraband|package|packet|substance|paraphernalia)\b",
            re.IGNORECASE,
        ),
        confidence=0.95,
        trigger_name="handed_consignment_direct",
    ),

    # =========================================================================
    # 4. FINANCIAL ROUTING, HAWALA & TRANSACTIONS (PASSIVE FIRST)
    # =========================================================================
    RelationRule(
        relation_type="FINANCIAL_TRANSACTION_WITH",
        source_types={"PERSON", "ORGANIZATION"},
        target_types={"PERSON", "ORGANIZATION"},
        pattern=re.compile(
            r"\b(?:funds\s+were\s+transferred\s+by|was\s+paid\s+by|money\s+was\s+received\s+from|amount\s+was\s+credited\s+by)\b",
            re.IGNORECASE,
        ),
        confidence=0.95,
        is_reverse=True,
        trigger_name="financial_transaction_passive",
    ),
    RelationRule(
        relation_type="SETTLED_PAYMENT_VIA_HAWALA",
        source_types={"PERSON"},
        target_types={"PERSON"},
        pattern=re.compile(
            r"\b(?:settled\s+(?:the\s+)?(?:payment|amount|hisaab|figure)\s+(?:through|via)\s+hawala|hawala\s+settlement|amount\s+had\s+been\s+settled|figure\s+had\s+been\s+(?:[\"'])?settled|settle\s+(?:the\s+)?hisaab\s+through\s+(?:the\s+)?usual\s+route|adjust\s+(?:the\s+)?hisaab|hawala\s+operator|hawala\s+channel)\b",
            re.IGNORECASE,
        ),
        confidence=0.95,
        trigger_name="hawala_settlement_direct",
    ),
    RelationRule(
        relation_type="FINANCIAL_TRANSACTION_WITH",
        source_types={"PERSON", "ORGANIZATION"},
        target_types={"PERSON", "ORGANIZATION", "BANK_ACCOUNT"},
        pattern=re.compile(
            r"\b(?:transferred|routed|wired|sent|paid|funneled|deposited|credited|received\s+funds\s+from|payment\s+of|sum\s+of\s+₹?[\d,]+|remitted|mule\s+account\s+held\s+by|transferred\s+to\s+account)\b",
            re.IGNORECASE,
        ),
        confidence=0.92,
        trigger_name="financial_transaction_direct",
    ),

    # =========================================================================
    # 5. TELEPHONY & CALLS
    # =========================================================================
    RelationRule(
        relation_type="CALLED",
        source_types={"PERSON", "PHONE_NUMBER"},
        target_types={"PERSON", "PHONE_NUMBER"},
        pattern=re.compile(
            r"\b(?:called|telephoned|dialed|placed\s+a\s+call\s+to|voice\s+call\s+to|CDR\s+shows\s+call|intercepted\s+calling|telephonic\s+contact\s+with|messaged|sent\s+SMS\s+to)\b",
            re.IGNORECASE,
        ),
        confidence=0.94,
        trigger_name="telephony_called_direct",
    ),

    # =========================================================================
    # 6. LOCATED_AT & HARBORED_AT
    # =========================================================================
    RelationRule(
        relation_type="LOCATED_AT",
        source_types={"PERSON", "ORGANIZATION", "EVENT"},
        target_types={"LOCATION"},
        pattern=re.compile(
            r"\b(?:spotted\s+at|seen\s+at|located\s+at|arrived\s+at|fled\s+to|safehouse\s+at|residing\s+at|warehouse\s+in|operated\s+from|intercepted\s+near|assembled\s+at|meeting\s+at|situated\s+at)\b",
            re.IGNORECASE,
        ),
        confidence=0.92,
        trigger_name="located_at_direct",
    ),

    # =========================================================================
    # 7. VEHICLE USAGE
    # =========================================================================
    RelationRule(
        relation_type="OPERATES_VEHICLE",
        source_types={"PERSON"},
        target_types={"VEHICLE"},
        pattern=re.compile(
            r"\b(?:driving|traveling\s+in|boarded|transported\s+in|vehicle\s+ready|operating|fled\s+in|registered\s+owner\s+of|seen\s+in\s+vehicle)\b",
            re.IGNORECASE,
        ),
        confidence=0.90,
        trigger_name="operates_vehicle_direct",
    ),

    # =========================================================================
    # 8. EXTORTION, KIDNAPPING, ARMS & CRIME PATTERNS
    # =========================================================================
    RelationRule(
        relation_type="ASSOCIATE_OF",
        source_types={"PERSON"},
        target_types={"PERSON"},
        pattern=re.compile(
            r"\b(?:demanded\s+ransom\s+from|extorted\s+money\s+from|threatened|supplied\s+weapons\s+to|smuggled\s+arms\s+for|procured\s+fake\s+currency\s+from|grabbed\s+land\s+with)\b",
            re.IGNORECASE,
        ),
        confidence=0.92,
        trigger_name="criminal_action_direct",
    )
]
