export function adaptGraphResponse(graphData) {
  if (!graphData || !graphData.nodes) {
    return { entities: [], threads: [] };
  }

  const { nodes, edges } = graphData;

  // Map POLE Types to Frontend CSS Classes
  const getType = (backendType) => {
    const typeUpper = (backendType || '').toUpperCase();
    if (typeUpper === 'PERSON') return 'person';
    if (typeUpper === 'LOCATION') return 'location';
    if (typeUpper === 'ORGANIZATION') return 'org';
    if (typeUpper === 'VEHICLE') return 'vehicle';
    if (typeUpper === 'PHONE_NUMBER') return 'phone';
    if (typeUpper === 'FINANCIAL_ACCOUNT' || typeUpper === 'BANK_ACCOUNT') return 'bank';
    return 'org';
  };

  const getTypeLabel = (type) => {
    const map = {
      'person': 'Person (Subject)',
      'location': 'Location / Safehouse',
      'org': 'Front Organization',
      'vehicle': 'Vehicle Asset',
      'phone': 'Telephony Intercept',
      'bank': 'Financial / Mule Account'
    };
    return map[type] || 'Entity';
  };

  // Kingpin-centered radial layout: the entity with the highest computed
  // hub_score anchors the exact mathematical center of the board, and
  // every other entity sits in a ring whose radius is its graph distance
  // (BFS hop count) from that kingpin -- so relationships visibly radiate
  // outward from the most central figure, instead of the previous flat
  // cluster-grid, which grouped by community but had no sense of
  // "distance from the kingpin" at all. Nodes unreachable from the
  // kingpin (a separate, disconnected component) land in one further-out
  // ring together, so they stay visible but read as structurally
  // peripheral. Community cluster is still used as a tie-break for where
  // a node sits along its ring's arc, so entities from the same community
  // still land near each other.
  const CENTER_X = 1400;
  const CENTER_Y = 1000;
  const BASE_RADIUS = 260;
  const RING_GAP = 230;
  const ARC_UNIT = 190; // approx on-screen spacing needed per node sharing a ring

  const positions = new Array(nodes.length);

  if (nodes.length === 1) {
    positions[0] = { x: CENTER_X, y: CENTER_Y };
  } else if (nodes.length > 1) {
    // Undirected adjacency from the edge list -- board relationships
    // don't have a meaningful direction for layout purposes.
    const idToIndex = new Map(nodes.map((n, i) => [n.id, i]));
    const adjacency = nodes.map(() => []);
    edges.forEach((edge) => {
      const a = idToIndex.get(edge.source_id);
      const b = idToIndex.get(edge.target_id);
      if (a === undefined || b === undefined || a === b) return;
      adjacency[a].push(b);
      adjacency[b].push(a);
    });

    // Kingpin = highest hub_score, ties broken by degree then by
    // original order, so the pick is stable across re-renders of the
    // same graph.
    let kingpinIndex = 0;
    nodes.forEach((node, i) => {
      const score = node.hub_score ?? 0;
      const bestScore = nodes[kingpinIndex].hub_score ?? 0;
      if (
        score > bestScore ||
        (score === bestScore && adjacency[i].length > adjacency[kingpinIndex].length)
      ) {
        kingpinIndex = i;
      }
    });

    // BFS ring (hop distance) from the kingpin.
    const ring = new Array(nodes.length).fill(-1);
    ring[kingpinIndex] = 0;
    const queue = [kingpinIndex];
    let maxRing = 0;
    while (queue.length > 0) {
      const current = queue.shift();
      adjacency[current].forEach((next) => {
        if (ring[next] === -1) {
          ring[next] = ring[current] + 1;
          maxRing = Math.max(maxRing, ring[next]);
          queue.push(next);
        }
      });
    }
    // Anything BFS never reached (a disconnected component) goes one
    // ring further out than anything found, grouped together.
    const outerRing = maxRing + 1;
    nodes.forEach((_, i) => {
      if (ring[i] === -1) ring[i] = outerRing;
    });

    const ringGroups = new Map();
    nodes.forEach((node, i) => {
      const r = ring[i];
      if (!ringGroups.has(r)) ringGroups.set(r, []);
      ringGroups.get(r).push(i);
    });
    ringGroups.forEach((indices) => {
      indices.sort((a, b) => {
        const ca = nodes[a].community_cluster ?? 0;
        const cb = nodes[b].community_cluster ?? 0;
        if (ca !== cb) return ca - cb;
        return (nodes[b].hub_score ?? 0) - (nodes[a].hub_score ?? 0);
      });
    });

    const sortedRings = Array.from(ringGroups.keys()).sort((a, b) => a - b);
    positions[kingpinIndex] = { x: CENTER_X, y: CENTER_Y };

    let prevRadius = 0;
    sortedRings.forEach((r, ringOrder) => {
      if (r === 0) return; // kingpin already placed at dead center
      const indices = ringGroups.get(r);
      const count = indices.length;
      const radiusFromCircumference = (count * ARC_UNIT) / (2 * Math.PI);
      const radius = Math.max(
        BASE_RADIUS + (ringOrder - 1) * RING_GAP,
        prevRadius + RING_GAP,
        radiusFromCircumference
      );
      prevRadius = radius;

      // Slight per-ring rotation so successive rings don't line up into
      // dull straight spokes.
      const angleOffset = ringOrder * 0.35;
      indices.forEach((nodeIndex, i) => {
        const angle = angleOffset + (2 * Math.PI * i) / count;
        positions[nodeIndex] = {
          x: CENTER_X + radius * Math.cos(angle),
          y: CENTER_Y + radius * Math.sin(angle),
        };
      });
    });

    // Shift everything so the top/left-most pin sits at the same (80, 80)
    // padding origin the old layout used, keeping every coordinate positive.
    const minX = Math.min(...positions.map((p) => p.x));
    const minY = Math.min(...positions.map((p) => p.y));
    const shiftX = 80 - minX;
    const shiftY = 80 - minY;
    positions.forEach((p) => {
      p.x += shiftX;
      p.y += shiftY;
    });
  }

  // Calculate connection counts
  const connectionCounts = {};
  edges.forEach((edge) => {
    connectionCounts[edge.source_id] = (connectionCounts[edge.source_id] || 0) + 1;
    connectionCounts[edge.target_id] = (connectionCounts[edge.target_id] || 0) + 1;
  });

  const entities = nodes.map((node, index) => {
    const type = getType(node.type);

    const { x, y } = positions[index];

    const centrality = node.hub_score ?? 0.05;

    return {
      id: node.id,
      name: node.canonical_name || 'Unknown',
      shortName: node.canonical_name || 'Unknown',
      role: node.aliases && node.aliases.length > 0 ? `Alias: "${node.aliases[0]}"` : (node.type || 'Entity'),
      fullRole: node.aliases && node.aliases.length > 0 ? `Known Aliases: ${node.aliases.join(', ')}` : node.type || 'Entity',
      type: type,
      typeLabel: getTypeLabel(type),
      aliases: node.aliases || [],
      domains: node.domains || [],
      x: x,
      y: y,
      centrality: centrality,
      connections: connectionCounts[node.id] || 0,
      casesInvolved: node.domains ? node.domains.length : 1,
      communityCluster: node.community_cluster || 0,
      verified_by_officer: Boolean(node.verified_by_officer),
      status: node.status || 'ACTIVE',
      evidenceText: `Partitioned into Syndicate Community Cluster #${node.community_cluster || 0}. Connected across ${node.domains ? node.domains.length : 1} crime verticals.`,
      source: 'MHA / NCRB Intelligence Ingestion',
      timestamp: new Date().toISOString(),
      lastSynced: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  });

  const threads = edges.map((edge) => {
    // Frontend thread tuple: [fromId, toId, confidence, relType, domain, verified, status]
    // confidence (0-1) drives edge opacity/thickness so the board shows real
    // signal strength instead of every link looking equally loud.
    const confidence = typeof edge.confidence === 'number' ? edge.confidence : 0.5;
    return [
      edge.source_id,
      edge.target_id,
      confidence,
      edge.relationship_type || 'ASSOCIATE_OF',
      edge.domain || '',
      Boolean(edge.verified_by_officer),
      edge.status || 'ACTIVE'
    ];
  });

  return { entities, threads };
}
