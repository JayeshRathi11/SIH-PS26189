import os
import re
from datetime import datetime
from typing import Dict, List, Any, Optional
from neo4j import GraphDatabase, Driver

# Mirrors pipeline.config.EntityType (the actual 8-type entity schema) --
# anything not listed here falls back to the generic :Entity label only.
POLE_LABEL_MAP = {
    "PERSON": "Person",
    "ORGANIZATION": "Organization",
    "LOCATION": "Location",
    "VEHICLE": "Vehicle",
    "PHONE_NUMBER": "PhoneNumber",
    "FINANCIAL_ACCOUNT": "BankAccount",
    "BANK_ACCOUNT": "BankAccount",
    "DOCUMENT_FRONT": "Document",
}

LAMBDA_DECAY = 0.005  # Matches pipeline/graph/analytics.py's temporal decay factor (days^-1)

def clean_label(label: str) -> str:
    """Sanitizes labels to safe alpha-numeric identifier strings."""
    return re.sub(r'[^a-zA-Z0-9_]', '', label)

class Neo4jClient:
    """
    Neo4j Database Client for NexusTrace POLE Graph Storage & Querying.

    postgres_id is stamped on every node and relationship so both stores
    can always be cross-referenced -- it is always the same value as the
    Postgres primary key (EntityRecord.id for nodes, RelationshipRecord.id
    for relationships), just made explicit as its own property rather than
    relying on callers knowing `id`/`postgres_id` happen to coincide.
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
            self.driver = None

    @property
    def is_connected(self) -> bool:
        return self.driver is not None

    def add_entity_node(self, entity_id: str, name: str, entity_type: str, aliases: List[str], domains: List[str],
                         hub_score: float = 0.0, community_cluster: int = 0,
                         verified_by_officer: bool = False, status: str = "ACTIVE",
                         phone_numbers: Optional[List[str]] = None,
                         has_prior_history: bool = False, prior_history_summary: Optional[str] = None):
        if not self.driver:
            return

        pole_label = POLE_LABEL_MAP.get(entity_type.upper(), "Entity")
        pole_label = clean_label(pole_label)

        # Merge with both primary POLE label and secondary generic :Entity label
        query = f"""
        MERGE (e:Entity {{id: $id}})
        SET e:{pole_label},
            e.postgres_id = $id,
            e.name = $name,
            e.type = $type,
            e.aliases = $aliases,
            e.domains = $domains,
            e.hub_score = $hub_score,
            e.community_cluster = $community_cluster,
            e.verified_by_officer = $verified_by_officer,
            e.status = $status,
            e.phone_numbers = $phone_numbers,
            e.has_prior_history = $has_prior_history,
            e.prior_history_summary = $prior_history_summary
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
                community_cluster=int(community_cluster),
                verified_by_officer=bool(verified_by_officer),
                status=status,
                phone_numbers=phone_numbers or [],
                has_prior_history=bool(has_prior_history),
                prior_history_summary=prior_history_summary or ""
            )

    def add_relationship_edge(self, source_id: str, target_id: str, rel_type: str, raw_rel_type: str,
                               domain: str, evidence: str, confidence: float = 0.9,
                               verified_by_officer: bool = False, weight_multiplier: float = 1.0,
                               timestamp: str = None, amount: float = None, currency: str = "INR",
                               postgres_id: str = None, status: str = "ACTIVE"):
        if not self.driver:
            return

        safe_rel_type = clean_label(rel_type.upper()) or "ASSOCIATE_OF"
        rel_id = postgres_id or f"REL_{source_id}_{target_id}_{safe_rel_type}_{domain}"

        query = f"""
        MATCH (a:Entity {{id: $source_id}})
        MATCH (b:Entity {{id: $target_id}})
        MERGE (a)-[r:{safe_rel_type}]->(b)
        SET r.postgres_id = $postgres_id,
            r.raw_relationship_type = $raw_rel_type,
            r.domain = $domain,
            r.evidence = $evidence,
            r.confidence = $confidence,
            r.verified_by_officer = $verified_by_officer,
            r.weight_multiplier = $weight_multiplier,
            r.timestamp = $timestamp,
            r.amount = $amount,
            r.currency = $currency,
            r.status = $status
        """
        with self.driver.session() as session:
            session.run(
                query,
                source_id=source_id,
                target_id=target_id,
                postgres_id=rel_id,
                raw_rel_type=raw_rel_type,
                domain=domain,
                evidence=evidence,
                confidence=float(confidence),
                verified_by_officer=bool(verified_by_officer),
                weight_multiplier=float(weight_multiplier),
                timestamp=timestamp or "",
                amount=amount,
                currency=currency,
                status=status
            )

    def update_entity_feedback(self, entity_id: str, verified_by_officer: bool, status: str = "ACTIVE"):
        """Updates a node's verification flag/status from investigator feedback (ENTITY target)."""
        if not self.driver:
            return
        query = """
        MATCH (e:Entity {id: $id})
        SET e.verified_by_officer = $verified_by_officer,
            e.status = $status
        """
        with self.driver.session() as session:
            session.run(query, id=entity_id, verified_by_officer=verified_by_officer, status=status)

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

    def detect_cycles(self, max_length: int = 4, rel_types: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """Detects directed circular financial / mule routing loops (A -> B -> C -> A)."""
        if not self.driver:
            return []
        types = rel_types or ["FINANCIAL_TRANSACTION_WITH", "ASSOCIATE_OF"]
        safe_types = "|".join(clean_label(t.upper()) for t in types)
        query = f"""
        MATCH path = (a:Entity)-[r:{safe_types}*2..{int(max_length)}]->(a)
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

    def find_entities_within_hops(self, entity_id: str, max_hops: int = 2) -> List[Dict[str, Any]]:
        """
        Multi-hop reachability query: every entity connected to `entity_id`
        within `max_hops` hops (any relationship type, either direction),
        with the shortest hop-distance at which each was reached.
        Straightforward in Cypher; expensive/awkward to express generically
        over an in-memory NetworkX graph rebuilt from scratch per request.
        """
        if not self.driver:
            return []
        query = f"""
        MATCH (start:Entity {{id: $entity_id}})
        MATCH path = (start)-[*1..{int(max_hops)}]-(other:Entity)
        WHERE other.id <> $entity_id
        WITH other, min(length(path)) AS hops
        RETURN other.id AS id, other.postgres_id AS postgres_id, other.name AS name,
               other.type AS type, other.domains AS domains, other.status AS status,
               hops
        ORDER BY hops ASC, other.name ASC
        """
        with self.driver.session() as session:
            result = session.run(query, entity_id=entity_id)
            return [dict(record) for record in result]

    # ------------------------------------------------------------------
    # Graph Data Science-backed analytics (replaces the NetworkX engine in
    # pipeline/graph/analytics.py for the /graph/centrality read path).
    # ------------------------------------------------------------------

    def compute_centrality(self, top_n: int = 500, as_of_date: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Computes PageRank + betweenness centrality + Louvain community
        detection over the whole graph via Neo4j GDS, reproducing the same
        weighting rules (temporal decay, officer-verification boost,
        REJECTED penalty) as GraphAnalyticsEngine, and returns results in
        the same shape as GraphAnalyticsEngine.get_ranked_key_influencers().
        """
        if not self.driver:
            return []

        as_of = as_of_date or datetime.utcnow().strftime("%Y-%m-%d")
        graph_name = "nexustrace_centrality"

        node_q = "MATCH (n:Entity) RETURN id(n) AS id"

        # Same edge-weight formula as GraphAnalyticsEngine._calculate_edge_weight
        # (REJECTED penalty, officer-verification boost, exponential temporal
        # decay, 0.05 floor). Each relationship is projected in BOTH
        # directions via UNION ALL to emulate analytics.py's undirected
        # nx.Graph() -- GDS Cypher projection has no separate "undirected"
        # flag, so the two directed rows are how that's expressed here.
        weight_calc = """
                 CASE WHEN r.verified_by_officer THEN 1.0 ELSE coalesce(r.confidence, 0.9) END AS conf,
                 CASE WHEN r.verified_by_officer
                      THEN (CASE WHEN coalesce(r.weight_multiplier, 1.0) > 1.2 THEN r.weight_multiplier ELSE 1.2 END)
                      ELSE coalesce(r.weight_multiplier, 1.0)
                 END AS wm
            WITH n1, n2, r, conf * wm AS base
            WITH n1, n2, r, base,
                 CASE WHEN r.timestamp IS NOT NULL AND r.timestamp <> ''
                      THEN duration.between(date(r.timestamp), date($as_of)).days
                      ELSE 0 END AS delta_days
            WITH n1, n2, r,
                 CASE WHEN delta_days > 0 THEN base * exp(-{lambda_decay} * delta_days) ELSE base END AS w
        """.format(lambda_decay=LAMBDA_DECAY)

        weight_return = """
            RETURN id(n1) AS source, id(n2) AS target,
                   (CASE WHEN r.status = 'REJECTED' THEN 0.01
                         WHEN coalesce(w, 0.0) < 0.05 THEN 0.05
                         ELSE w END) AS weight
        """

        rel_q = (
            f"MATCH (a:Entity)-[r]->(b:Entity) WITH a AS n1, b AS n2, r, {weight_calc}" + weight_return
            + " UNION ALL "
            + f"MATCH (a:Entity)-[r]->(b:Entity) WITH b AS n1, a AS n2, r, {weight_calc}" + weight_return
        )

        with self.driver.session() as session:
            try:
                session.run("CALL gds.graph.drop($name, false)", name=graph_name)
            except Exception:
                pass

            session.run(
                "CALL gds.graph.project.cypher($name, $nodeQ, $relQ, {parameters: {as_of: $as_of}}) "
                "YIELD graphName",
                name=graph_name, nodeQ=node_q, relQ=rel_q, as_of=as_of
            )

            try:
                node_count = session.run(
                    "CALL gds.graph.list($name) YIELD nodeCount RETURN nodeCount", name=graph_name
                ).single()
                n = node_count["nodeCount"] if node_count else 0
            except Exception:
                n = 0

            pagerank_rows = list(session.run(
                "CALL gds.pageRank.stream($name, {relationshipWeightProperty: 'weight', dampingFactor: 0.85}) "
                "YIELD nodeId, score "
                "RETURN nodeId, score",
                name=graph_name
            ))
            pr_sum = sum(r["score"] for r in pagerank_rows) or 1.0
            pagerank = {r["nodeId"]: r["score"] / pr_sum for r in pagerank_rows}

            betweenness_rows = list(session.run(
                "CALL gds.betweenness.stream($name, {relationshipWeightProperty: 'weight'}) "
                "YIELD nodeId, score "
                "RETURN nodeId, score",
                name=graph_name
            ))
            # Each edge was projected twice (both directions) to emulate an
            # undirected graph, which doubles raw path counts relative to a
            # true undirected computation; then apply the same normalization
            # factor networkx.betweenness_centrality uses by default for
            # undirected graphs: 2 / ((n-1)(n-2)).
            norm_factor = (2.0 / ((n - 1) * (n - 2))) if n > 2 else 0.0
            betweenness = {r["nodeId"]: (r["score"] / 2.0) * norm_factor for r in betweenness_rows}

            louvain_rows = list(session.run(
                "CALL gds.louvain.stream($name, {relationshipWeightProperty: 'weight'}) "
                "YIELD nodeId, communityId "
                "RETURN nodeId, communityId",
                name=graph_name
            ))
            community = {r["nodeId"]: r["communityId"] for r in louvain_rows}

            node_info_rows = list(session.run(
                "MATCH (n:Entity) "
                "RETURN id(n) AS nodeId, n.id AS entity_id, n.name AS name, n.type AS type, "
                "       n.verified_by_officer AS verified_by_officer, n.status AS status, "
                "       COUNT { (n)--() } AS degree"
            ))

            try:
                session.run("CALL gds.graph.drop($name, false)", name=graph_name)
            except Exception:
                pass

        ranked = []
        for row in node_info_rows:
            nid = row["nodeId"]
            pr_score = pagerank.get(nid, 0.0)
            bt_score = betweenness.get(nid, 0.0)
            combined_score = (pr_score * 0.6) + (bt_score * 0.4)
            ranked.append({
                "entity_id": row["entity_id"],
                "name": row["name"] or row["entity_id"],
                "type": row["type"] or "PERSON",
                "pagerank_score": round(pr_score, 4),
                "betweenness_score": round(bt_score, 4),
                "combined_hub_score": round(combined_score, 4),
                "community_cluster": community.get(nid, 0),
                "degree": row["degree"],
                "verified_by_officer": bool(row["verified_by_officer"]),
                "status": row["status"] or "ACTIVE"
            })

        ranked.sort(key=lambda x: x["combined_hub_score"], reverse=True)
        return ranked[:top_n]


# ----------------------------------------------------------------------
# Process-wide singleton. GraphDatabase.driver() performs a real network
# handshake + auth round-trip; creating one per request (as the old
# feedback.py did) added real, measurable latency to every confirm/reject
# action. A single Driver instance already pools/reuses its underlying
# connections internally, so the fix is simply: connect once, reuse the
# same client everywhere (FastAPI routes via backend/main.py's startup/
# shutdown hooks, and standalone pipeline scripts on first use).
# ----------------------------------------------------------------------
_singleton_client: Optional[Neo4jClient] = None

def get_neo4j_client() -> Neo4jClient:
    global _singleton_client
    if _singleton_client is None:
        _singleton_client = Neo4jClient()
        _singleton_client.connect()
    return _singleton_client

def close_neo4j_client():
    global _singleton_client
    if _singleton_client is not None:
        _singleton_client.close()
        _singleton_client = None
