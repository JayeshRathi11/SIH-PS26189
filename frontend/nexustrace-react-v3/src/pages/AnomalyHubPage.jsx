import React, { useState, useEffect } from 'react';
import { fetchNetworkBridges } from '../api/client';

function cleanEntityName(nodeId) {
  if (!nodeId) return 'Unknown Entity';
  return nodeId
    .replace(/^ENT_(PERSON|HUB|ORG|PHONE|LOC|BANK)_/i, '')
    .replace(/^VEH_/i, 'Vehicle ')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function cleanDomainName(domain) {
  if (!domain) return '';
  return domain
    .replace(/^\d+_/, '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatHumanDescription(desc, title) {
  if (!desc) return 'Algorithmic pattern flagged across multiple cross-domain interactions.';
  // Clean up technical centrality values for human readability
  let text = desc
    .replace(/with Betweenness Centrality [\d.]+/gi, 'acting as the central coordinator')
    .replace(/Betweenness Centrality/gi, 'Syndicate Influence')
    .replace(/0\.\d{3,}/g, (m) => `${Math.round(parseFloat(m) * 100)}%`)
    .replace(/_\w+/g, (m) => m.replace(/_/g, ' '));
  return text;
}

export default function AnomalyHubPage({
  patterns,
  onFocusPattern,
  activeCaseId,
  cases,
  onSelectCase
}) {
  const [filterRisk, setFilterRisk] = useState('ALL');
  const [search, setSearch] = useState('');
  const [bridges, setBridges] = useState([]);
  const [loadingBridges, setLoadingBridges] = useState(false);
  const [expandedPatternId, setExpandedPatternId] = useState(null);

  useEffect(() => {
    setLoadingBridges(true);
    fetchNetworkBridges()
      .then(setBridges)
      .catch((err) => console.log('[Bridges Notice]', err))
      .finally(() => setLoadingBridges(false));
  }, [activeCaseId]);

  const filteredPatterns = patterns.filter((p) => {
    if (filterRisk !== 'ALL' && p.risk_level !== filterRisk) return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase()) && !p.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="page-container" style={{ padding: '24px', overflowY: 'auto', height: '100vh', boxSizing: 'border-box' }}>
      {/* Header */}
      <div className="page-header-row" style={{ marginBottom: '20px' }}>
        <div>
          <div className="page-eyebrow" style={{ color: 'var(--stamp-red)', fontSize: '11px', fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace' }}>
            🚨 SYNDICATE MODUS OPERANDI & ANOMALIES
          </div>
          <h2 className="page-title" style={{ margin: '4px 0', fontSize: '22px', fontFamily: 'Space Grotesk, sans-serif' }}>
            Syndicate Anomaly Hub
          </h2>
          <p className="page-subtitle" style={{ margin: 0, color: 'var(--ink-muted)', fontSize: '12.5px' }}>
            Detected cross-domain kingpins, Hawala mule loops, burner phone grids, and strategic communication bottlenecks. Click any alert card to view details.
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="🔍 Search alerts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-box"
            style={{ width: '220px', padding: '7px 12px', background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--ink)', borderRadius: '4px', fontSize: '12px' }}
          />
          <div className="filters" style={{ margin: 0, display: 'flex', gap: '6px' }}>
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map((lvl) => (
              <button
                key={lvl}
                className={`filter-chip ${filterRisk === lvl ? 'active' : ''}`}
                onClick={() => setFilterRisk(lvl)}
                style={{
                  cursor: 'pointer',
                  padding: '5px 12px',
                  fontSize: '11px',
                  borderRadius: '4px',
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontWeight: 600,
                  border: filterRisk === lvl ? '1px solid var(--stamp-red)' : '1px solid var(--border)',
                  background: filterRisk === lvl ? 'var(--stamp-red-bg)' : 'var(--panel)',
                  color: filterRisk === lvl ? 'var(--stamp-red)' : 'var(--ink-muted)'
                }}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Overview Stat Counters */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', padding: '16px', borderRadius: '6px', boxShadow: 'var(--shadow-node)' }}>
          <div style={{ fontSize: '10px', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, textTransform: 'uppercase' }}>TOTAL PATTERNS DETECTED</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--ink)', marginTop: '4px', fontFamily: 'Space Grotesk, sans-serif' }}>{patterns.length}</div>
        </div>
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', padding: '16px', borderRadius: '6px', boxShadow: 'var(--shadow-node)' }}>
          <div style={{ fontSize: '10px', color: 'var(--stamp-red)', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, textTransform: 'uppercase' }}>CRITICAL RISKS</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--stamp-red)', marginTop: '4px', fontFamily: 'Space Grotesk, sans-serif' }}>
            {patterns.filter((p) => p.risk_level === 'CRITICAL').length}
          </div>
        </div>
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', padding: '16px', borderRadius: '6px', boxShadow: 'var(--shadow-node)' }}>
          <div style={{ fontSize: '10px', color: 'var(--tag-amber)', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, textTransform: 'uppercase' }}>CHOKEPOINT BRIDGES</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--tag-amber)', marginTop: '4px', fontFamily: 'Space Grotesk, sans-serif' }}>
            {bridges.length}
          </div>
        </div>
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', padding: '16px', borderRadius: '6px', boxShadow: 'var(--shadow-node)' }}>
          <div style={{ fontSize: '10px', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, textTransform: 'uppercase' }}>ACTIVE DOMAIN</div>
          <div style={{ fontSize: '13px', fontFamily: 'IBM Plex Mono, monospace', marginTop: '6px', color: 'var(--ink)', fontWeight: 600 }}>
            {cases.find((c) => c.id === activeCaseId)?.caseId || 'GLOBAL-MASTER'}
          </div>
        </div>
      </div>

      {/* Critical Network Bridges & Interdiction Vulnerabilities Section */}
      {bridges.length > 0 && (
        <div style={{ marginBottom: '24px', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '6px', padding: '18px', boxShadow: 'var(--shadow-node)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '16px' }}>⚡</span>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, fontFamily: 'Space Grotesk, sans-serif', color: 'var(--ink)' }}>
              Network Chokepoints & Interdiction Vulnerabilities (Cut-Vertices)
            </h3>
          </div>
          <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: 'var(--ink-muted)' }}>
            Severing these strategic links will disrupt communication and financial flow between separate syndicate branches.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
            {bridges.map((b, idx) => (
              <div
                key={idx}
                style={{
                  background: 'var(--panel-elevated)',
                  border: '1px solid var(--border)',
                  borderLeft: '4px solid var(--tag-amber)',
                  padding: '10px 14px',
                  borderRadius: '4px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--tag-amber)', fontFamily: 'IBM Plex Mono, monospace' }}>
                    BRIDGE #{idx + 1}
                  </span>
                  <span style={{ fontSize: '9px', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace', background: 'var(--panel)', padding: '1px 5px', borderRadius: '2px' }}>
                    HIGH IMPACT
                  </span>
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)' }}>
                  {b.source_name || cleanEntityName(b.source)} <span style={{ color: 'var(--tag-amber)', margin: '0 4px' }}>➔</span> {b.target_name || cleanEntityName(b.target)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pattern Cards List */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(440px, 1fr))', gap: '16px' }}>
        {filteredPatterns.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', color: 'var(--ink-muted)', background: 'var(--panel)', border: '1px dashed var(--border)', borderRadius: '6px' }}>
            No anomaly patterns matching the selected criteria.
          </div>
        ) : (
          filteredPatterns.map((p) => {
            const isCritical = p.risk_level === 'CRITICAL';
            const isHigh = p.risk_level === 'HIGH';
            const badgeColor = isCritical ? 'var(--stamp-red)' : isHigh ? 'var(--tag-amber)' : 'var(--stamp-blue)';
            const badgeBg = isCritical ? 'var(--stamp-red-bg)' : isHigh ? 'var(--tag-amber-bg)' : 'var(--stamp-blue-bg)';

            // Fix the risk score percentage bug (98 instead of 9800%)
            const rawScore = typeof p.risk_score === 'number' ? p.risk_score : 0.9;
            const riskPercent = Math.round(rawScore > 1 ? rawScore : rawScore * 100);

            const isExpanded = expandedPatternId === p.pattern_id;

            return (
              <div
                key={p.pattern_id}
                onClick={() => setExpandedPatternId(isExpanded ? null : p.pattern_id)}
                style={{
                  background: 'var(--panel)',
                  border: isExpanded ? `1px solid ${badgeColor}` : '1px solid var(--border)',
                  borderLeft: `5px solid ${badgeColor}`,
                  borderRadius: '6px',
                  padding: '18px 20px',
                  boxShadow: 'var(--shadow-node)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {/* Card Top Row: Risk Pill & Type */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span
                    style={{
                      background: badgeBg,
                      border: `1px solid ${badgeColor}`,
                      color: badgeColor,
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '3px',
                      textTransform: 'uppercase',
                      fontFamily: 'IBM Plex Mono, monospace',
                      letterSpacing: '0.04em'
                    }}
                  >
                    {p.risk_level} • Risk {riskPercent}%
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '10px', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace', background: 'var(--paper)', padding: '2px 6px', borderRadius: '3px', border: '1px solid var(--border)' }}>
                      {(p.pattern_type || 'ANOMALY').replace(/_/g, ' ')}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--ink-muted)', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                      ▾
                    </span>
                  </div>
                </div>

                {/* Human-Readable Title */}
                <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontFamily: 'Space Grotesk, sans-serif', color: 'var(--ink)' }}>
                  {p.title}
                </h3>

                {/* Plain-Language Summary */}
                <p style={{ fontSize: '12.5px', color: 'var(--ink-soft)', lineHeight: '1.5', margin: '0 0 10px' }}>
                  {formatHumanDescription(p.description, p.title)}
                </p>

                {/* Collapsed Preview Hint */}
                {!isExpanded && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed var(--border)', fontSize: '11px', color: 'var(--tag-amber)' }}>
                    <span>
                      {p.subgraph_nodes ? `${p.subgraph_nodes.length} Suspect Entities Involved` : 'Click to inspect details'}
                    </span>
                    <span style={{ fontWeight: 600 }}>Click to expand ➔</span>
                  </div>
                )}

                {/* Expanded Details Section (Shown only when card is clicked!) */}
                {isExpanded && (
                  <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px dashed var(--border)' }} onClick={(e) => e.stopPropagation()}>
                    {/* Suspects Involved Named Tags */}
                    {p.subgraph_nodes && p.subgraph_nodes.length > 0 && (
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', marginBottom: '6px' }}>
                          Flagged Suspects & Assets ({p.subgraph_nodes.length}):
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                          {p.subgraph_nodes.map((nodeId, nIdx) => (
                            <span
                              key={nIdx}
                              style={{
                                background: 'var(--paper)',
                                border: '1px solid var(--border)',
                                color: 'var(--ink)',
                                fontSize: '10.5px',
                                padding: '3px 8px',
                                borderRadius: '3px',
                                fontWeight: 500
                              }}
                            >
                              {cleanEntityName(nodeId)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Involved Crime Domains */}
                    {p.involved_domains && p.involved_domains.length > 0 && (
                      <div style={{ marginBottom: '14px' }}>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', marginBottom: '6px' }}>
                          Crime Verticals Crossed:
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                          {p.involved_domains.map((dom, dIdx) => (
                            <span
                              key={dIdx}
                              style={{
                                background: 'var(--tag-amber-bg)',
                                border: '1px solid var(--tag-amber)',
                                color: 'var(--tag-amber)',
                                fontSize: '10px',
                                padding: '2px 7px',
                                borderRadius: '3px',
                                fontFamily: 'IBM Plex Mono, monospace',
                                fontWeight: 600
                              }}
                            >
                              {cleanDomainName(dom)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Visualize Action Button */}
                    <button
                      onClick={() => onFocusPattern(p)}
                      className="tactical-btn"
                      style={{
                        width: '100%',
                        justifyContent: 'center',
                        background: 'var(--stamp-red)',
                        color: '#FFF',
                        border: 'none',
                        padding: '9px 14px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 700,
                        fontFamily: 'IBM Plex Mono, monospace',
                        boxShadow: '0 2px 6px rgba(185, 28, 28, 0.25)'
                      }}
                    >
                      🔍 Visualize Subgraph on Corkboard
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
