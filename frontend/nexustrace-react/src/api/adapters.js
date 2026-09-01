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

  // Cluster-aware layout: group entities by their computed community
  // cluster (from the analytics pipeline) into visually separated "bays"
  // instead of dumping every node into one undifferentiated grid in raw
  // backend order. This is what actually declutters a 100+ node unified
  // graph -- structurally related entities land near each other, and
  // unrelated clusters read as distinct islands on the corkboard. A view
  // with no real cluster signal (everyone at cluster 0) degrades cleanly
  // to a single compact grid, same as before.
  const clusterMap = new Map();
  nodes.forEach((node, index) => {
    const cid = node.community_cluster ?? 0;
    if (!clusterMap.has(cid)) clusterMap.set(cid, []);
    clusterMap.get(cid).push(index);
  });
  // Largest cluster first: the core syndicate structure anchors the
  // top-left of the board, looser/singleton entities trail off after it.
  const clusters = Array.from(clusterMap.values()).sort((a, b) => b.length - a.length);

  const NODE_SPACING_X = 250;
  const NODE_SPACING_Y = 200;
  const CLUSTER_GAP_X = 110;
  const CLUSTER_GAP_Y = 140;
  const BAYS_PER_ROW = Math.max(1, Math.ceil(Math.sqrt(clusters.length)));

  const positions = new Array(nodes.length);
  let bayX = 80;
  let bayY = 80;
  let rowMaxHeight = 0;

  clusters.forEach((memberIndices, clusterIdx) => {
    const bayCols = Math.max(1, Math.ceil(Math.sqrt(memberIndices.length)));
    const bayWidth = bayCols * NODE_SPACING_X;
    const bayRows = Math.ceil(memberIndices.length / bayCols);
    const bayHeight = bayRows * NODE_SPACING_Y;

    memberIndices.forEach((nodeIndex, i) => {
      const col = i % bayCols;
      const row = Math.floor(i / bayCols);
      positions[nodeIndex] = {
        x: bayX + col * NODE_SPACING_X,
        y: bayY + row * NODE_SPACING_Y,
      };
    });

    rowMaxHeight = Math.max(rowMaxHeight, bayHeight);
    if ((clusterIdx + 1) % BAYS_PER_ROW === 0) {
      bayX = 80;
      bayY += rowMaxHeight + CLUSTER_GAP_Y;
      rowMaxHeight = 0;
    } else {
      bayX += bayWidth + CLUSTER_GAP_X;
    }
  });

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
