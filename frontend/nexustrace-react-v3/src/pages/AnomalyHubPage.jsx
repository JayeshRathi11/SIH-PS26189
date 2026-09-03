import React, { useState, useEffect } from 'react';
import { fetchNetworkBridges } from '../api/client';

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
          <div className="page-eyebrow">● GRAPH ANOMALY & SYNDICATE DETECTION</div>
          <h2 className="page-title">Syndicate Modus Operandi & Anomaly Hub</h2>
          <p className="page-subtitle">
            Algorithmic detection of syndicate patterns: cross-domain kingpins, Hawala mule loops, burner SIM grids, trafficking corridors, and cut-vertex network bottlenecks.
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search anomaly patterns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-box"
            style={{ width: '220px', padding: '6px 12px', background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--ink)', borderRadius: '3px' }}
          />
          <div className="filters" style={{ margin: 0, display: 'flex', gap: '6px' }}>
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map((lvl) => (
              <span
                key={lvl}
                className={`filter-chip ${filterRisk === lvl ? 'active' : ''}`}
                onClick={() => setFilterRisk(lvl)}
                style={{ cursor: 'pointer', padding: '4px 10px', fontSize: '11px', borderRadius: '3px', fontFamily: 'IBM Plex Mono, monospace' }}
              >
                {lvl}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Overview Stat Counters */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        <div className="stat-summary-card" style={{ background: 'var(--panel)', border: '1px solid var(--border)', padding: '16px', borderRadius: '4px' }}>
          <div className="stat-summary-title" style={{ fontSize: '11px', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace' }}>TOTAL PATTERNS DETECTED</div>
          <div className="stat-summary-value" style={{ fontSize: '24px', fontWeight: 700, color: 'var(--ink)', marginTop: '4px' }}>{patterns.length}</div>
        </div>
        <div className="stat-summary-card" style={{ background: 'var(--panel)', border: '1px solid var(--border)', padding: '16px', borderRadius: '4px' }}>
          <div className="stat-summary-title" style={{ fontSize: '11px', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace' }}>CRITICAL RISKS</div>
          <div className="stat-summary-value" style={{ fontSize: '24px', fontWeight: 700, color: 'var(--stamp-red)', marginTop: '4px' }}>
            {patterns.filter(p => p.risk_level === 'CRITICAL').length}
          </div>
        </div>
        <div className="stat-summary-card" style={{ background: 'var(--panel)', border: '1px solid var(--border)', padding: '16px', borderRadius: '4px' }}>
          <div className="stat-summary-title" style={{ fontSize: '11px', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace' }}>CRITICAL BRIDGE VULNERABILITIES</div>
          <div className="stat-summary-value" style={{ fontSize: '24px', fontWeight: 700, color: 'var(--tag-amber)', marginTop: '4px' }}>
            {bridges.length}
          </div>
        </div>
        <div className="stat-summary-card" style={{ background: 'var(--panel)', border: '1px solid var(--border)', padding: '16px', borderRadius: '4px' }}>
          <div className="stat-summary-title" style={{ fontSize: '11px', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace' }}>ACTIVE INVESTIGATION DOMAIN</div>
          <div className="stat-summary-value" style={{ fontSize: '13px', fontFamily: 'IBM Plex Mono, monospace', marginTop: '6px', color: 'var(--ink)' }}>
            {cases.find(c => c.id === activeCaseId)?.caseId || 'GLOBAL-MASTER'}
          </div>
        </div>
      </div>

      {/* Critical Network Bridges & Interdiction Vulnerabilities Section */}
      {bridges.length > 0 && (
        <div style={{ marginBottom: '28px', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '4px', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span style={{ fontSize: '16px' }}>⚡</span>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, fontFamily: 'Space Grotesk, sans-serif', color: 'var(--ink)' }}>
              Network Chokepoints & Interdiction Vulnerabilities (Cut-Vertices)
            </h3>
          </div>
          <p style={{ margin: '0 0 14px 0', fontSize: '12px', color: 'var(--ink-muted)' }}>
            Interdicting these strategic communication conduits will sever information flow between disjoint syndicate clusters.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
            {bridges.map((b, idx) => (
              <div key={idx} style={{
                background: 'rgba(0,0,0,0.03)',
                border: '1px solid var(--border-dim)',
                borderLeft: '3px solid var(--tag-amber)',
                padding: '10px 14px',
                borderRadius: '3px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tag-amber)', fontFamily: 'IBM Plex Mono, monospace' }}>
                    BRIDGE #{idx + 1}
                  </span>
                  <span style={{ fontSize: '9.5px', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace' }}>
                    HIGH IMPACT
                  </span>
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)' }}>
                  {b.source_name || b.source} <span style={{ color: 'var(--tag-amber)' }}>⮂</span> {b.target_name || b.target}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pattern Cards List */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '16px' }}>
        {filteredPatterns.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', color: 'var(--ink-muted)', background: 'var(--panel)', border: '1px dashed var(--border)', borderRadius: '4px' }}>
            No anomaly patterns matching the selected risk criteria.
          </div>
        ) : (
          filteredPatterns.map((p) => {
            const isCritical = p.risk_level === 'CRITICAL';
            const isHigh = p.risk_level === 'HIGH';
            const badgeColor = isCritical ? 'var(--stamp-red)' : (isHigh ? 'var(--tag-amber)' : 'var(--stamp-blue)');
            const badgeBg = isCritical ? 'rgba(185, 28, 28, 0.1)' : (isHigh ? 'rgba(217, 119, 6, 0.1)' : 'rgba(37, 99, 235, 0.1)');

            return (
              <div
                key={p.pattern_id}
                className="anomaly-card"
                style={{
                  background: 'var(--panel)',
                  border: '1px solid var(--border)',
                  borderLeft: `5px solid ${badgeColor}`,
                  borderRadius: '4px',
                  padding: '18px',
                  boxShadow: 'var(--shadow-paper)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{
                    background: badgeBg,
                    border: `1px solid ${badgeColor}`,
                    color: badgeColor,
                    fontSize: '9.5px',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '2px',
                    textTransform: 'uppercase',
                    fontFamily: 'IBM Plex Mono, monospace'
                  }}>
                    {p.risk_level} • Risk {Math.round(p.risk_score * 100)}%
                  </span>
                  <span style={{ fontSize: '10.5px', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace' }}>
                    {p.pattern_type}
                  </span>
                </div>

                <h3 style={{ margin: '10px 0 6px', fontSize: '15px', fontFamily: 'Space Grotesk, sans-serif', color: 'var(--ink)' }}>
                  {p.title}
                </h3>

                <p style={{ fontSize: '12.5px', color: 'var(--ink-muted)', lineHeight: '1.5', margin: '0 0 12px' }}>
                  {p.description}
                </p>

                {/* Subgraph node preview */}
                {p.subgraph_nodes && p.subgraph_nodes.length > 0 && (
                  <div style={{ fontSize: '11px', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '10px' }}>
                    <b>Nodes Flagged ({p.subgraph_nodes.length}):</b> {p.subgraph_nodes.join(', ')}
                  </div>
                )}

                {/* Involved Domains */}
                {p.involved_domains && p.involved_domains.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '14px' }}>
                    {p.involved_domains.map((dom) => (
                      <span key={dom} style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid var(--border-dim)', color: 'var(--ink)', fontSize: '9.5px', padding: '2px 6px', borderRadius: '2px', fontFamily: 'IBM Plex Mono, monospace' }}>
                        {dom.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => onFocusPattern(p)}
                  className="tactical-btn"
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    background: 'var(--stamp-red)',
                    color: '#FFF',
                    border: 'none',
                    padding: '8px 12px',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 600,
                    fontFamily: 'IBM Plex Mono, monospace'
                  }}
                >
                  🔍 Visualize Subgraph on Corkboard
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

