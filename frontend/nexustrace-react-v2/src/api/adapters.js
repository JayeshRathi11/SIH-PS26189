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

  // Grid layout positioning
  const cols = Math.ceil(Math.sqrt(nodes.length));
  const spacingX = 260;
  const spacingY = 210;
  const startX = 80;
  const startY = 80;

  // Calculate connection counts
  const connectionCounts = {};
  edges.forEach((edge) => {
    connectionCounts[edge.source_id] = (connectionCounts[edge.source_id] || 0) + 1;
    connectionCounts[edge.target_id] = (connectionCounts[edge.target_id] || 0) + 1;
  });

  const entities = nodes.map((node, index) => {
    const type = getType(node.type);
    
    const row = Math.floor(index / cols);
    const col = index % cols;
    const x = startX + col * spacingX;
    const y = startY + row * spacingY;

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
    // Frontend thread tuple: [fromId, toId, isStrong, relType, domain, verified, status, confidence]
    // confidence is the real per-edge value from the backend (see
    // RelationshipRecord.confidence / explain_path's steps[].confidence) --
    // Board.jsx uses it to draw thicker lines for better-evidenced links
    // instead of just the binary isStrong cutoff.
    const confidence = typeof edge.confidence === 'number' ? edge.confidence : 0.9;
    const isStrong = confidence > 0.85;
    return [
      edge.source_id,
      edge.target_id,
      isStrong,
      edge.relationship_type || 'ASSOCIATE_OF',
      edge.domain || '',
      Boolean(edge.verified_by_officer),
      edge.status || 'ACTIVE',
      confidence
    ];
  });

  return { entities, threads };
}
