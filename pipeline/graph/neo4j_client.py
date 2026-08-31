import os
import re
from typing import Dict, List, Any, Optional
from neo4j import GraphDatabase, Driver

POLE_LABEL_MAP = {
    "PERSON": "Person",
    "ORGANIZATION": "Organization",
    "LOCATION": "Location",
    "PHONE_NUMBER": "PhoneNumber",
    "VEHICLE": "Vehicle",
    "BANK_ACCOUNT": "BankAccount",
    "FINANCIAL_ACCOUNT": "BankAccount",
    "TRANSACTION": "Transaction",
    "CASE": "Case",
    "EVENT": "Event",
    "DOCUMENT": "Document",
    "DOCUMENT_FRONT": "Document"
}

def clean_label(label: str) -> str:
    """Sanitizes labels to safe alpha-numeric identifier strings."""
    return re.sub(r'[^a-zA-Z0-9_]', '', label)

class Neo4jClient:
    """
    Neo4j Database Client for NexusTrace POLE Graph Storage & Querying.
    """
    def __init__(self, uri: str = None, user: str = None, password: str = None):
        self.uri = uri or os.getenv("NEO4J_URI", "bolt://localhost:7687")
        self.user = user or os.getenv("NEO4J_USER", "neo4j")
        self.password = password or os.getenv("NEO4J_PASSWORD", "password")
        self.driver: Optional[Driver] = None

    def connect(self) -> bool:
        try:
            self.driver = GraphDatabase.driver(self.uri, auth=(self.user, self.password))
            self.driver.verify_connectivity()
            print(f"[Neo4jClient] Connected successfully to {self.uri}")
            return True
        except Exception as e:
            print(f"[Neo4jClient Warning] Could not connect to Neo4j at {self.uri}: {e}")
            self.driver = None
            return False

    def close(self):
        if self.driver:
            self.driver.close()

    def add_entity_node(self, entity_id: str, name: str, entity_type: str, aliases: List[str], domains: List[str], hub_score: float = 0.0, community_cluster: int = 0):
        if not self.driver:
            return
        
        pole_label = POLE_LABEL_MAP.get(entity_type.upper(), "Entity")
        pole_label = clean_label(pole_label)
        
        # Merge with both primary POLE label and secondary generic :Entity label
        query = f"""
        MERGE (e:Entity {{id: $id}})
        SET e:{pole_label},
            e.name = $name,
            e.type = $type,
            e.aliases = $aliases,
            e.domains = $domains,
            e.hub_score = $hub_score,
            e.community_cluster = $community_cluster
        """
        with self.driver.session() as session:
            session.run(
                query,
                id=entity_id,
                name=name,
                type=entity_type,
                aliases=aliases,
                domains=domains,
                hub_score=float(hub_score),
                community_cluster=int(community_cluster)
            )

    def add_relationship_edge(self, source_id: str, target_id: str, rel_type: str, raw_rel_type: str,
                               domain: str, evidence: str, confidence: float = 0.9,
                               verified_by_officer: bool = False, weight_multiplier: float = 1.0,
                               timestamp: str = None, amount: float = None, currency: str = "INR"):
        if not self.driver:
            return
        
        safe_rel_type = clean_label(rel_type.upper()) or "ASSOCIATE_OF"
        
        query = f"""
        MATCH (a:Entity {{id: $source_id}})
        MATCH (b:Entity {{id: $target_id}})
        MERGE (a)-[r:{safe_rel_type}]->(b)
        SET r.raw_relationship_type = $raw_rel_type,
            r.domain = $domain,
            r.evidence = $evidence,
            r.confidence = $confidence,
            r.verified_by_officer = $verified_by_officer,
            r.weight_multiplier = $weight_multiplier,
            r.timestamp = $timestamp,
            r.amount = $amount,
            r.currency = $currency
        """
        with self.driver.session() as session:
            session.run(
                query,
                source_id=source_id,
                target_id=target_id,
                raw_rel_type=raw_rel_type,
                domain=domain,
                evidence=evidence,
                confidence=float(confidence),
                verified_by_officer=bool(verified_by_officer),
                weight_multiplier=float(weight_multiplier),
                timestamp=timestamp or "",
                amount=amount,
                currency=currency
            )

    def update_edge_feedback(self, source_id: str, target_id: str, rel_type: str,
                             verified_by_officer: bool, weight_multiplier: float, status: str = "ACTIVE"):
        """Updates edge weights and verification flags based on investigator feedback."""
        if not self.driver:
            return
        safe_rel_type = clean_label(rel_type.upper())
        query = f"""
        MATCH (a:Entity {{id: $source_id}})-[r:{safe_rel_type}]->(b:Entity {{id: $target_id}})
        SET r.verified_by_officer = $verified_by_officer,
            r.weight_multiplier = $weight_multiplier,
            r.status = $status
        """
        with self.driver.session() as session:
            session.run(
                query,
                source_id=source_id,
                target_id=target_id,
                verified_by_officer=verified_by_officer,
                weight_multiplier=weight_multiplier,
                status=status
            )

    def find_shortest_path(self, source_id: str, target_id: str, max_depth: int = 4) -> List[Dict[str, Any]]:
        """Finds all shortest paths between two entities with edge evidence."""
        if not self.driver:
            return []
        query = f"""
        MATCH path = allShortestPaths((a:Entity {{id: $source_id}})-[*..{int(max_depth)}]-(b:Entity {{id: $target_id}}))
        RETURN [n in nodes(path) | {{id: n.id, name: n.name, type: n.type}}] AS nodes,
               [r in relationships(path) | {{type: type(r), raw_type: r.raw_relationship_type, domain: r.domain, evidence: r.evidence}}] AS relationships
        """
        with self.driver.session() as session:
            result = session.run(query, source_id=source_id, target_id=target_id)
            paths = []
            for record in result:
                paths.append({
                    "nodes": record["nodes"],
                    "relationships": record["relationships"]
                })
            return paths

    def detect_cycles(self, max_length: int = 4) -> List[Dict[str, Any]]:
        """Detects directed circular financial / mule routing loops (A -> B -> C -> A)."""
        if not self.driver:
            return []
        query = f"""
        MATCH path = (a:Entity)-[r:FINANCIAL_TRANSACTION_WITH*2..{int(max_length)}]->(a)
        RETURN [n in nodes(path) | {{id: n.id, name: n.name, type: n.type}}] AS loop_nodes,
               [rel in relationships(path) | {{type: type(rel), domain: rel.domain, evidence: rel.evidence}}] AS loop_relationships
        LIMIT 20
        """
        with self.driver.session() as session:
            result = session.run(query)
            cycles = []
            for record in result:
                cycles.append({
                    "nodes": record["loop_nodes"],
                    "relationships": record["loop_relationships"]
                })
            return cycles
