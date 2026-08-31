import json
import os
from pathlib import Path
from typing import Dict, Any
from pipeline.knowledge_graph.models import KnowledgeGraph


class KnowledgeGraphSerializer:
    """Serializes KnowledgeGraph instances to JSON and NetworkX-compatible formats."""

    @staticmethod
    def to_json(kg: KnowledgeGraph, file_path: str) -> None:
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(kg.to_dict(), f, indent=2)

    @staticmethod
    def from_json(file_path: str) -> Dict[str, Any]:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
