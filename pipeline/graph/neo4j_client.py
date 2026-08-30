import os
from typing import Dict, List, Any, Optional
from neo4j import GraphDatabase, Driver

class Neo4jClient:
    """
    Neo4j Database Client for NexusTrace Graph Storage.
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

    def add_entity_node(self, entity_id: str, name: str, entity_type: str, aliases: List[str], domains: List[str]):
        if not self.driver:
            return
        query = """
        MERGE (e:Entity {id: $id})
        SET e.name = $name,
            e.type = $type,
            e.aliases = $aliases,
            e.domains = $domains
        """
        with self.driver.session() as session:
            session.run(query, id=entity_id, name=name, type=entity_type, aliases=aliases, domains=domains)

    def add_relationship_edge(self, source_id: str, target_id: str, rel_type: str, raw_rel_type: str, domain: str, evidence: str):
        if not self.driver:
            return
        query = f"""
        MATCH (a:Entity {{id: $source_id}})
        MATCH (b:Entity {{id: $target_id}})
        MERGE (a)-[r:{rel_type}]->(b)
        SET r.raw_relationship_type = $raw_rel_type,
            r.domain = $domain,
            r.evidence = $evidence
        """
        with self.driver.session() as session:
            session.run(query, source_id=source_id, target_id=target_id, raw_rel_type=raw_rel_type, domain=domain, evidence=evidence)
