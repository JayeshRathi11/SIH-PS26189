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

  // Calculate connection counts
  const connectionCounts = {};
  edges.forEach((edge) => {
    connectionCounts[edge.source_id] = (connectionCounts[edge.source_id] || 0) + 1;
    connectionCounts[edge.target_id] = (connectionCounts[edge.target_id] || 0) + 1;
  });

  // Separate connected vs isolated entities
  const connectedNodes = [];
  const unconnectedNodes = [];

  nodes.forEach((node) => {
    const degree = connectionCounts[node.id] || 0;
    if (degree > 0) {
      connectedNodes.push(node);
    } else {
      unconnectedNodes.push(node);
    }
  });

  // Sort connected nodes so top hubs come first
  connectedNodes.sort((a, b) => (b.hub_score || 0) - (a.hub_score || 0));

  const positionMap = {};
  const centerX = 650;
  const centerY = 450;

  if (connectedNodes.length === 1) {
    positionMap[connectedNodes[0].id] = { x: centerX, y: centerY };
  } else if (connectedNodes.length > 1) {
    // Center the primary hub
    const primaryHub = connectedNodes[0];
    positionMap[primaryHub.id] = { x: centerX, y: centerY };

    // Remaining connected nodes
    const others = connectedNodes.slice(1);
    const othersCount = others.length;
    
    // Distribute in concentric tiers around the hub
    const tier1 = others.slice(0, 8);
    const tier2 = others.slice(8);

    const r1 = Math.max(260, tier1.length * 35);
    tier1.forEach((node, i) => {
      const angle = (i / tier1.length) * 2 * Math.PI - Math.PI / 2;
      positionMap[node.id] = {
        x: Math.round(centerX + r1 * Math.cos(angle)),
        y: Math.round(centerY + r1 * Math.sin(angle)),
      };
    });

    if (tier2.length > 0) {
      const r2 = r1 + 200;
      tier2.forEach((node, i) => {
        const angle = (i / tier2.length) * 2 * Math.PI - Math.PI / 2 + Math.PI / tier2.length;
        positionMap[node.id] = {
          x: Math.round(centerX + r2 * Math.cos(angle)),
          y: Math.round(centerY + r2 * Math.sin(angle)),
        };
      });
    }
  }

  // Position unconnected nodes neatly in a dedicated side column on the right
  const sideColumnX = 1350;
  const sideStartY = 80;
  unconnectedNodes.forEach((node, i) => {
    positionMap[node.id] = {
      x: sideColumnX,
      y: sideStartY + i * 115,
    };
  });

  const entities = nodes.map((node) => {
    const type = getType(node.type);
    const pos = positionMap[node.id] || { x: 100, y: 100 };
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
      x: pos.x,
      y: pos.y,
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
