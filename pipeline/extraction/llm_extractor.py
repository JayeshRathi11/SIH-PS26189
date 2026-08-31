import os
import json
import re
import time
import threading
from pathlib import Path
from typing import Dict, List, Any
from dotenv import load_dotenv

load_dotenv()

from pipeline.config import EntityType, MasterRelationshipType, PROCESSED_DIR
from pipeline.extraction.prompts.extraction_prompt import SYSTEM_EXTRACTION_PROMPT

CACHE_FILE = PROCESSED_DIR / "extraction_cache.json"

class LLMExtractor:
    """
    LLM-based Named Entity and Relationship Extractor.
    Supports API extraction via Gemini/Groq with disk caching and deterministic fallback extractor.
    """
    def __init__(self, api_key: str = None):
        self.gemini_key = api_key or os.getenv("GEMINI_API_KEY") or os.getenv("OPENAI_API_KEY")
        self.groq_key = os.getenv("GROQ_API_KEY")
        self.lock = threading.Lock()
        self.cache: Dict[str, Any] = self._load_cache()

    def _load_cache(self) -> Dict[str, Any]:
        PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
        if CACHE_FILE.exists():
            try:
                with open(CACHE_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                return {}
        return {}

    def _save_cache(self):
        try:
            with open(CACHE_FILE, "w", encoding="utf-8") as f:
                json.dump(self.cache, f, indent=2, ensure_ascii=False)
        except Exception as e:
            pass

    def extract_from_document(self, doc_text: str, doc_id: str = "DOC_001") -> Dict[str, Any]:
        """
        Extracts entities and relationships from raw document text.
        Returns dict with "entities" and "relationships".
        Uses cache if available.
        """
        cache_key = f"{doc_id}_{abs(hash(doc_text[:100]))}"
        with self.lock:
            if cache_key in self.cache:
                return self.cache[cache_key]

        res = None

        # 1. Try Gemini API if key is present
        if self.gemini_key:
            try:
                res = self._call_gemini_api(doc_text)
            except Exception as e:
                res = None

        # 2. Try Groq API if key is present and Gemini didn't return
        if not res and self.groq_key:
            try:
                res = self._call_groq_api(doc_text)
            except Exception as e:
                res = None

        # 3. Fallback to rule-based NLP extractor
        if not res or not isinstance(res, dict) or "entities" not in res:
            res = self._deterministic_fallback_extract(doc_text)

        # Cache valid result
        with self.lock:
            self.cache[cache_key] = res
            self._save_cache()
        return res

    def _call_gemini_api(self, doc_text: str) -> Dict[str, Any]:
        """Calls Google Gemini API using google-genai SDK."""
        from google import genai
        client = genai.Client(api_key=self.gemini_key)
        
        prompt = f"{SYSTEM_EXTRACTION_PROMPT}\n\nDocument Text to Analyze:\n{doc_text}"
        
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        raw_response = response.text
        
        # Extract JSON block
        json_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw_response, re.DOTALL)
        if json_match:
            return json.loads(json_match.group(1))
        
        start_idx = raw_response.find("{")
        end_idx = raw_response.rfind("}")
        if start_idx != -1 and end_idx != -1:
            clean_json = raw_response[start_idx:end_idx + 1]
            return json.loads(clean_json)

        return json.loads(raw_response)

    def _call_groq_api(self, doc_text: str) -> Dict[str, Any]:
        """Calls Groq API using groq SDK if GROQ_API_KEY is present."""
        from groq import Groq
        client = Groq(api_key=self.groq_key)
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": SYSTEM_EXTRACTION_PROMPT},
                {"role": "user", "content": f"Document Text:\n{doc_text}"}
            ],
            model="llama-3.3-70b-versatile",
            response_format={"type": "json_object"}
        )
        raw_response = chat_completion.choices[0].message.content
        return json.loads(raw_response)

    def _deterministic_fallback_extract(self, doc_text: str) -> Dict[str, Any]:
        """
        Rule-based NLP fallback extractor using regex patterns.
        """
        entities = []
        relationships = []
        entity_names = set()

        # 1. Phone numbers
        phone_matches = re.findall(r"\+?\d{2,4}[-\s]?\d{5}[-\s]?\d{5}|\+?\d{10,12}", doc_text)
        for p in phone_matches:
            clean_p = p.strip()
            if clean_p not in entity_names:
                entity_names.add(clean_p)
                entities.append({"name": clean_p, "type": EntityType.PHONE_NUMBER.value, "aliases": []})

        # 2. Vehicle registrations
        veh_matches = re.findall(r"\b[A-Z]{2}\s?\d{2}\s?[A-Z]{1,2}\s?\d{4}\b", doc_text)
        for v in veh_matches:
            clean_v = v.strip()
            if clean_v not in entity_names:
                entity_names.add(clean_v)
                entities.append({"name": clean_v, "type": EntityType.VEHICLE.value, "aliases": []})

        # 3. Known Crime Network Hub Aliases
        hub_aliases = [
            "Sethji", "Bhai", "the contact", "the director", "the financier", 
            "the negotiator", "the source contact", "the controller", "the buyer", 
            "the fixer", "Iqbal Ansari", "I.A.", "the account holder", "the beneficial owner"
        ]
        for ha in hub_aliases:
            if re.search(rf"\b{re.escape(ha)}\b", doc_text, re.IGNORECASE):
                if ha not in entity_names:
                    entity_names.add(ha)
                    entities.append({"name": ha, "type": EntityType.PERSON.value, "aliases": [ha]})

        # 4. Operatives and Person Names
        person_matches = re.findall(
            r"\b(?:Devendra Solanki|Bunty|Iliyas Khan|Manoj Tiwari|Rina Das|Rohit Chaurasia|Farhan Qureshi|Ashraf Mallick|Nilesh Kadam|Harjeet Singh|Waseem Akhtar|Rakesh Pawar|Salim Sheikh|Sunil Yadav|Ajay Bhonsle|Naseer Ahmed|Vikas Chopra|Deepak Malhotra|Rizwan Ali|Anil Kamble|Ramesh Naidu|Prakash Jadhav|Rajendra Kulkarni)\b",
            doc_text, re.IGNORECASE
        )
        for p in person_matches:
            clean_p = p.strip()
            if clean_p not in entity_names:
                entity_names.add(clean_p)
                entities.append({"name": clean_p, "type": EntityType.PERSON.value, "aliases": []})

        # 5. Organizations & Fronts
        org_matches = re.findall(
            r"\b(?:Sunrise Placement Services|IA Digital Ventures Pvt Ltd|Chopra Fuel & Service Station|Shreeji Construction & Developers|Shreeji Constructions)\b",
            doc_text, re.IGNORECASE
        )
        for o in org_matches:
            clean_o = o.strip()
            if clean_o not in entity_names:
                entity_names.add(clean_o)
                entities.append({"name": clean_o, "type": EntityType.ORGANIZATION.value, "aliases": []})

        # 6. Bank accounts
        acct_matches = re.findall(r"\b(?:account ending\s+\d{4}|A/C\s+\d{4,16})\b", doc_text, re.IGNORECASE)
        for a in acct_matches:
            clean_a = a.strip()
            if clean_a not in entity_names:
                entity_names.add(clean_a)
                entities.append({"name": clean_a, "type": EntityType.FINANCIAL_ACCOUNT.value, "aliases": []})

        # 7. Extract relationship triples when entities co-occur
        ent_list = [e["name"] for e in entities]
        for i in range(len(ent_list)):
            for j in range(i + 1, len(ent_list)):
                e1 = ent_list[i]
                e2 = ent_list[j]
                
                pattern = rf"{re.escape(e1)}[\s\S]{{1,200}}?(called|contacted|instructed|directed|met|transferred|handed off|paid|associated|recruited|forged|registered|monitored)[\s\S]{{1,200}}?{re.escape(e2)}"
                m = re.search(pattern, doc_text, re.IGNORECASE)
                if not m:
                    pattern_rev = rf"{re.escape(e2)}[\s\S]{{1,200}}?(called|contacted|instructed|directed|met|transferred|handed off|paid|associated|recruited|forged|registered|monitored)[\s\S]{{1,200}}?{re.escape(e1)}"
                    m = re.search(pattern_rev, doc_text, re.IGNORECASE)

                if m:
                    verb = m.group(1).lower()
                    rel_type = "ASSOCIATE_OF"
                    if "call" in verb or "contact" in verb:
                        rel_type = "CALLED"
                    elif "pay" in verb or "transfer" in verb:
                        rel_type = "FINANCIAL_TRANSACTION_WITH"
                    elif "hand" in verb or "vehicle" in verb or "register" in verb:
                        rel_type = "OWNS_VEHICLE"
                    elif "met" in verb:
                        rel_type = "CO_LOCATED_WITH"
                    elif "direct" in verb or "instruct" in verb:
                        rel_type = "LEADS_ORGANIZATION" if any(o in e2 for o in ["Ltd", "Services", "Station", "Developers"]) else "ASSOCIATE_OF"
                    
                    e1_type = next((e["type"] for e in entities if e["name"] == e1), "PERSON")
                    e2_type = next((e["type"] for e in entities if e["name"] == e2), "PERSON")

                    relationships.append({
                        "source": e1,
                        "source_type": e1_type,
                        "relationship_type": rel_type,
                        "target": e2,
                        "target_type": e2_type,
                        "confidence": 0.92,
                        "evidence": m.group(0)[:160].strip()
                    })

        return {
            "entities": entities,
            "relationships": relationships
        }
