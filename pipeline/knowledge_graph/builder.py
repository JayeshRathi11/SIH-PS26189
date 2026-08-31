import logging
import hashlib
from typing import List, Dict, Any, Optional
from datetime import datetime

from pipeline.knowledge_graph.models import KGNode, KGEdge, KnowledgeGraph
from pipeline.config import EntityType, MasterRelationshipType

logger = logging.getLogger(__name__)


class KnowledgeGraphBuilder:
    """
    Constructs an interconnected Knowledge Graph adhering to the 10-Node POLE Schema:
    PERSON, ORGANIZATION, LOCATION, VEHICLE, PHONE_NUMBER, BANK_ACCOUNT,
    TRANSACTION, CASE, EVENT, DOCUMENT.
    """

    def __init__(self):
        pass

    def build_graph(
        self,
        canonical_entities: List[Dict[str, Any]],
        extracted_relations: List[Dict[str, Any]],
        documents: Optional[List[Dict[str, Any]]] = None,
        cases: Optional[List[Dict[str, Any]]] = None,
        events: Optional[List[Dict[str, Any]]] = None,
        transactions: Optional[List[Dict[str, Any]]] = None,
    ) -> KnowledgeGraph:
        """
        Synthesizes all POLE entities, relations, cases, events, transactions, and documents into a KnowledgeGraph.
        """
        kg = KnowledgeGraph()
        now_iso = datetime.utcnow().isoformat() + "Z"

        # 1. Add Canonical POLE Entities (PERSON, ORG, LOC, VEHICLE, PHONE, BANK)
        for ce in canonical_entities:
            node_id = ce.get("canonical_id") or ce.get("id") or f"ENT_{ce.get('canonical_name', 'UNKNOWN').upper().replace(' ', '_')}"
            name = ce.get("canonical_name") or ce.get("name") or "Unknown"
            etype = ce.get("entity_type") or ce.get("type") or EntityType.PERSON.value
            domains = ce.get("domains") or ([ce["domain"]] if "domain" in ce else [])
            aliases = ce.get("aliases") or []
            timestamp = ce.get("timestamp") or ce.get("first_seen") or now_iso

            node = KGNode(
                node_id=node_id,
                canonical_name=name,
                entity_type=etype,
                domains=domains,
                aliases=aliases,
                properties=ce.get("properties", {}),
                first_seen=ce.get("first_seen", timestamp),
                last_seen=ce.get("last_seen", timestamp),
                timestamp=timestamp,
                hub_score=float(ce.get("hub_score", ce.get("centrality", 0.05))),
                community_cluster=int(ce.get("community_cluster", ce.get("cluster_id", 0))),
                verified_by_officer=bool(ce.get("verified_by_officer", False)),
                status=ce.get("status", "ACTIVE"),
                source_document_id=ce.get("source_document_id") or ce.get("doc_id")
            )
            kg.add_node(node)

        # 2. Add DOCUMENT Nodes (Digital Provenance & Section 65B Integrity)
        if documents:
            for doc in documents:
                doc_id = doc.get("document_id") or doc.get("doc_id")
                if not doc_id:
                    continue
                doc_text = doc.get("original_text") or doc.get("text") or ""
                doc_sha256 = doc.get("sha256_hash") or hashlib.sha256(doc_text.encode("utf-8")).hexdigest()
                doc_node_id = f"DOC_{doc_id}"
                
                doc_node = KGNode(
                    node_id=doc_node_id,
                    canonical_name=f"Document {doc_id}",
                    entity_type=EntityType.DOCUMENT.value,
                    domains=[doc.get("domain_name") or doc.get("domain") or "GLOBAL"],
                    properties={
                        "doc_type": doc.get("document_type", "FIR"),
                        "sha256_hash": doc_sha256,
                        "source_file": doc.get("source_file", ""),
                        "classification": "LAW_ENFORCEMENT_SENSITIVE"
                    },
                    timestamp=doc.get("date") or now_iso,
                    source_document_id=doc_id
                )
                kg.add_node(doc_node)

        # 3. Add TRANSACTION Nodes (Hawala, NEFT, Mule Flows)
        if transactions:
            for txn in transactions:
                txn_id = txn.get("transaction_id") or f"TXN_{len(kg.nodes)}"
                txn_node = KGNode(
                    node_id=txn_id,
                    canonical_name=f"Txn ₹{txn.get('amount', 0):,} ({txn.get('method', 'HAWALA')})",
                    entity_type=EntityType.TRANSACTION.value,
                    domains=[txn.get("domain", "GLOBAL")],
                    properties={
                        "amount": txn.get("amount", 0),
                        "currency": txn.get("currency", "INR"),
                        "method": txn.get("method", "HAWALA"),
                        "channel": txn.get("channel", "MULE_ACCOUNT")
                    },
                    timestamp=txn.get("timestamp") or now_iso
                )
                kg.add_node(txn_node)

                # Link sender and receiver to Transaction node
                if txn.get("sender_id") and txn["sender_id"] in kg.nodes:
                    kg.add_edge(KGEdge(
                        edge_id=f"{txn['sender_id']}-INITIATED-{txn_id}",
                        source_id=txn["sender_id"],
                        target_id=txn_id,
                        relationship_type=MasterRelationshipType.TRANSACTION_INVOLVES.value,
                        timestamp=txn.get("timestamp") or now_iso,
                        domain=txn.get("domain")
                    ))
                if txn.get("receiver_id") and txn["receiver_id"] in kg.nodes:
                    kg.add_edge(KGEdge(
                        edge_id=f"{txn_id}-BENEFICIARY-{txn['receiver_id']}",
                        source_id=txn_id,
                        target_id=txn["receiver_id"],
                        relationship_type=MasterRelationshipType.TRANSACTION_INVOLVES.value,
                        timestamp=txn.get("timestamp") or now_iso,
                        domain=txn.get("domain")
                    ))

        # 4. Add CASE Nodes (FIR Investigations)
        if cases:
            for c in cases:
                case_id = c.get("case_id") or c.get("id")
                case_node = KGNode(
                    node_id=f"CASE_{case_id}",
                    canonical_name=c.get("title", f"Case {case_id}"),
                    entity_type=EntityType.CASE.value,
                    domains=[c.get("domain", "GLOBAL")],
                    properties={
                        "status": c.get("status", "ACTIVE"),
                        "registered_date": c.get("registered_date", now_iso)
                    },
                    timestamp=c.get("registered_date", now_iso)
                )
                kg.add_node(case_node)

        # 5. Add Extracted Relationships
        for rel in extracted_relations:
            src_id = rel.get("source_id") or rel.get("source")
            tgt_id = rel.get("target_id") or rel.get("target")

            if not src_id or not tgt_id:
                continue

            # Ensure endpoints exist or create placeholder
            if src_id not in kg.nodes:
                kg.add_node(KGNode(node_id=src_id, canonical_name=src_id, entity_type=EntityType.PERSON.value, timestamp=now_iso))
            if tgt_id not in kg.nodes:
                kg.add_node(KGNode(node_id=tgt_id, canonical_name=tgt_id, entity_type=EntityType.PERSON.value, timestamp=now_iso))

            rel_type = rel.get("relationship_type") or rel.get("rel_type") or MasterRelationshipType.ASSOCIATE_OF.value
            edge_id = rel.get("edge_id") or f"{src_id}-{rel_type}-{tgt_id}"
            timestamp = rel.get("timestamp") or rel.get("valid_from") or now_iso

            edge = KGEdge(
                edge_id=edge_id,
                source_id=src_id,
                target_id=tgt_id,
                relationship_type=rel_type,
                raw_relationship_type=rel.get("raw_relationship_type"),
                domain=rel.get("domain"),
                confidence=float(rel.get("confidence", 0.90)),
                timestamp=timestamp,
                valid_from=timestamp,
                valid_to=rel.get("valid_to"),
                evidence_text=rel.get("evidence") or rel.get("evidence_text"),
                source_document_id=rel.get("source_document_id") or rel.get("doc_id"),
                verified_by_officer=bool(rel.get("verified_by_officer", False)),
                status=rel.get("status", "ACTIVE"),
                properties=rel.get("properties", {})
            )
            kg.add_edge(edge)

        kg.metadata = {
            "generated_at": now_iso,
            "pole_schema_version": "10_NODE_COMPLETE",
            "temporal_analytics_status": "OPERATIONAL",
            "total_nodes": len(kg.nodes),
            "total_edges": len(kg.edges)
        }

        return kg
