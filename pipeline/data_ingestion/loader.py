import json
import logging
import hashlib
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, Any, Optional, List, Set, Tuple

logger = logging.getLogger(__name__)


@dataclass
class Document:
    """Represents a single document loaded from a dataset domain."""
    document_id: str
    text: str
    source_file: str
    domain_name: Optional[str] = None
    document_type: Optional[str] = None
    case_id: Optional[str] = None
    date: Optional[str] = None
    location: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    @property
    def domain_id(self) -> Optional[str]:
        return self.domain_name


@dataclass
class Domain:
    """Represents a domain containing extracted documents and optional ground truth."""
    name: str
    documents: List[Document] = field(default_factory=list)
    ground_truth: Optional[Dict[str, Any]] = None
    ground_truth_file: Optional[str] = None
    markdown_files: List[str] = field(default_factory=list)


class DatasetLoader:
    """Recursively discovers and loads multi-domain datasets with delimited markdown and ground truth."""
    
    DOC_DELIMITER = "###_DOC_START_###"
    IGNORE_DIRS = {"processed", "predictions", ".git", "__pycache__", ".pytest_cache"}
    
    def __init__(self, data_dir: str):
        self.data_dir = Path(data_dir)
        self.domains: Dict[str, Domain] = {}
        self.documents: List[Document] = []
        self.ground_truth_files: List[str] = []
        
        self.unreadable_files: List[str] = []
        self.empty_documents: List[str] = []
        self.duplicate_documents: List[str] = []
        
        self._doc_hashes: Set[str] = set()
        self._seen_file_doc_ids: Set[Tuple[str, str]] = set()

    def _generate_doc_id(self, file_path: Path, index: int = 0) -> str:
        if index > 0:
            return f"{file_path.stem}_{index}"
        return file_path.stem
    
    def _hash_text(self, text: str) -> str:
        return hashlib.sha256(text.encode('utf-8')).hexdigest()

    def _get_or_create_domain(self, domain_name: str) -> Domain:
        if domain_name not in self.domains:
            self.domains[domain_name] = Domain(name=domain_name)
        return self.domains[domain_name]

    def _determine_domain_name(self, file_path: Path) -> str:
        try:
            rel_path = file_path.relative_to(self.data_dir)
            if len(rel_path.parts) > 1:
                return rel_path.parts[0]
        except ValueError:
            pass
        return "default"

    def load_dataset(self) -> None:
        if not self.data_dir.exists() or not self.data_dir.is_dir():
            logger.warning(f"Data directory does not exist or is not a directory: {self.data_dir}")
            return

        for file_path in self.data_dir.rglob('*'):
            if file_path.is_file():
                try:
                    rel_parts = file_path.relative_to(self.data_dir).parts
                    if any(part.lower() in self.IGNORE_DIRS for part in rel_parts):
                        continue
                except ValueError:
                    pass
                self._load_file(file_path)
                
    def _load_file(self, file_path: Path) -> None:
        try:
            domain_name = self._determine_domain_name(file_path)
            domain = self._get_or_create_domain(domain_name)
            suffix = file_path.suffix.lower()
            file_name = file_path.name.lower()
            
            if suffix == '.json' or file_name.endswith('.json.json'):
                self._load_json(file_path, domain)
            elif suffix in ('.txt', '.md', '.markdown'):
                if suffix in ('.md', '.markdown'):
                    domain.markdown_files.append(str(file_path))
                self._load_text_or_markdown(file_path, domain)
        except Exception as e:
            logger.error(f"Failed to read {file_path}: {e}")
            self.unreadable_files.append(str(file_path))

    def _load_json(self, file_path: Path, domain: Domain) -> None:
        try:
            with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
                data = json.load(f)
            file_name = file_path.name.lower()
            is_ground_truth = (
                "groundtruth" in file_name or
                (isinstance(data, dict) and ("entities" in data or "relationships" in data or "timeline" in data))
            )
            if is_ground_truth:
                domain.ground_truth = data
                domain.ground_truth_file = str(file_path)
                if str(file_path) not in self.ground_truth_files:
                    self.ground_truth_files.append(str(file_path))
            elif isinstance(data, list):
                for idx, item in enumerate(data):
                    if isinstance(item, dict):
                        self._parse_and_add_json_doc(item, file_path, idx, domain)
            elif isinstance(data, dict):
                if 'text' in data or 'document_id' in data:
                    self._parse_and_add_json_doc(data, file_path, 0, domain)
        except Exception as e:
            logger.error(f"JSON decode error in {file_path}: {e}")
            self.unreadable_files.append(str(file_path))
            
    def _load_text_or_markdown(self, file_path: Path, domain: Domain) -> None:
        with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
            content = f.read()

        if self.DOC_DELIMITER in content:
            chunks = content.split(self.DOC_DELIMITER)
            doc_idx = 0
            for chunk in chunks[1:]:
                chunk = chunk.strip()
                if not chunk:
                    continue
                doc_idx += 1
                self._parse_delimited_chunk(chunk, file_path, doc_idx, domain)
        else:
            text = content.strip()
            doc_id = self._generate_doc_id(file_path)
            doc_type = "markdown" if file_path.suffix.lower() in ('.md', '.markdown') else "text"
            self._add_document(
                doc_id=doc_id,
                text=text,
                source_file=str(file_path),
                domain=domain,
                document_type=doc_type
            )

    def _parse_delimited_chunk(self, chunk: str, file_path: Path, index: int, domain: Domain) -> None:
        lines = chunk.splitlines()
        first_line = lines[0].strip()
        header_fields = self._parse_header_line(first_line)
        
        if header_fields:
            doc_id = header_fields.get("doc_id") or header_fields.get("document_id") or self._generate_doc_id(file_path, index)
            doc_type = header_fields.get("doc_type") or header_fields.get("document_type")
            case_id = header_fields.get("case_id")
            date = header_fields.get("date")
            location = header_fields.get("location")
            known_keys = {"doc_id", "document_id", "doc_type", "document_type", "case_id", "date", "location"}
            extra_meta = {k: v for k, v in header_fields.items() if k not in known_keys}
            text = "\n".join(lines[1:]).strip()
        else:
            doc_id = self._generate_doc_id(file_path, index)
            doc_type = "markdown" if file_path.suffix.lower() in ('.md', '.markdown') else "text"
            case_id = None
            date = None
            location = None
            extra_meta = {}
            text = chunk

        self._add_document(
            doc_id=doc_id,
            text=text,
            source_file=str(file_path),
            domain=domain,
            case_id=case_id,
            document_type=doc_type,
            date=date,
            location=location,
            metadata=extra_meta
        )

    def _parse_header_line(self, line: str) -> Optional[Dict[str, str]]:
        if not line or ":" not in line:
            return None
        parts = line.split("|")
        fields = {}
        for part in parts:
            if ":" not in part:
                return None
            k, v = part.split(":", 1)
            k_clean = k.strip().lower()
            v_clean = v.strip()
            if not k_clean:
                return None
            fields[k_clean] = v_clean
            
        if any(k in fields for k in ("doc_id", "document_id", "doc_type", "document_type")):
            return fields
        return None

    def _parse_and_add_json_doc(self, item: Dict[str, Any], file_path: Path, index: int, domain: Domain) -> None:
        text = item.get('text', '')
        doc_id = str(item.get('document_id', self._generate_doc_id(file_path, index)))
        case_id = item.get('case_id')
        document_type = item.get('document_type')
        date = item.get('date')
        location = item.get('location')
        known_keys = {'text', 'document_id', 'case_id', 'document_type', 'date', 'location'}
        extra_meta = {k: v for k, v in item.items() if k not in known_keys}
        
        self._add_document(
            doc_id=doc_id,
            text=text,
            source_file=str(file_path),
            domain=domain,
            case_id=case_id,
            document_type=document_type,
            date=date,
            location=location,
            metadata=extra_meta
        )

    def _add_document(self, doc_id: str, text: str, source_file: str, domain: Domain, **kwargs) -> None:
        if not text.strip():
            self.empty_documents.append(f"{source_file} (doc_id: {doc_id})")
            return
        text_hash = self._hash_text(text)
        file_doc_key = (source_file, doc_id)
        if text_hash in self._doc_hashes or file_doc_key in self._seen_file_doc_ids:
            self.duplicate_documents.append(f"{source_file} (doc_id: {doc_id})")
            return
        self._doc_hashes.add(text_hash)
        self._seen_file_doc_ids.add(file_doc_key)
        
        doc = Document(
            document_id=doc_id,
            text=text,
            source_file=source_file,
            domain_name=domain.name,
            **kwargs
        )
        domain.documents.append(doc)
        self.documents.append(doc)
