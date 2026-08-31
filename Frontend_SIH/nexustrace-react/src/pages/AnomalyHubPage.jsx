import React, { useState } from 'react';

export default function AnomalyHubPage({
  patterns,
  onFocusPattern,
  activeCaseId,
  cases,
  onSelectCase
}) {
  const [filterRisk, setFilterRisk] = useState('ALL');
  const [search, setSearch] = useState('');

  const filteredPatterns = patterns.filter((p) => {
    if (filterRisk !== 'ALL' && p.risk_level !== filterRisk) return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase()) && !p.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header-row">
        <div>
          <div className="page-eyebrow">● GRAPH ANOMALY & SYNDICATE DETECTION</div>
          <h2 className="page-title">Syndicate Modus Operandi & Anomaly Hub</h2>
          <p className="page-subtitle">
            Catalog of algorithmic subgraph detections: layering patterns, mule account rings, Hawala routing networks, and cross-border nexus.
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search anomaly patterns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-box"
            style={{ width: '240px' }}
          />
          <div className="filters" style={{ margin: 0 }}>
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map((lvl) => (
              <span
                key={lvl}
                className={`filter-chip ${filterRisk === lvl ? 'active' : ''}`}
                onClick={() => setFilterRisk(lvl)}
              >
                {lvl}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Overview Stat Counters */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
        <div className="stat-summary-card">
          <div className="stat-summary-title">Total Patterns Detected</div>
          <div className="stat-summary-value">{patterns.length}</div>
        </div>
        <div className="stat-summary-card">
          <div className="stat-summary-title">Critical Syndicate Risks</div>
          <div className="stat-summary-value" style={{ color: 'var(--stamp-red)' }}>
            {patterns.filter(p => p.risk_level === 'CRITICAL').length}
          </div>
        </div>
        <div className="stat-summary-card">
          <div className="stat-summary-title">High Priority Alerts</div>
          <div className="stat-summary-value" style={{ color: 'var(--tag-amber)' }}>
            {patterns.filter(p => p.risk_level === 'HIGH').length}
          </div>
        </div>
        <div className="stat-summary-card">
          <div className="stat-summary-title">Active Investigation Domain</div>
          <div className="stat-summary-value" style={{ fontSize: '13px', fontFamily: 'IBM Plex Mono, monospace', marginTop: '6px' }}>
            {cases.find(c => c.id === activeCaseId)?.caseId || 'GLOBAL'}
          </div>
        </div>
      </div>

      {/* Pattern Cards List */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '16px' }}>
        {filteredPatterns.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', color: 'var(--ink-muted)' }}>
            No anomaly patterns matching the selected risk criteria.
          </div>
        ) : (
          filteredPatterns.map((p) => {
            const isCritical = p.risk_level === 'CRITICAL';
            const isHigh = p.risk_level === 'HIGH';
            const badgeColor = isCritical ? 'var(--stamp-red)' : (isHigh ? 'var(--tag-amber)' : 'var(--stamp-blue)');
            const badgeBg = isCritical ? 'var(--stamp-red-bg)' : (isHigh ? 'var(--tag-amber-bg)' : 'var(--stamp-blue-bg)');

            return (
              <div
                key={p.pattern_id}
                className="anomaly-card"
                style={{ borderLeft: `5px solid ${badgeColor}` }}
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
                    {p.risk_level} • Risk {p.risk_score}%
                  </span>
                  <span style={{ fontSize: '10.5px', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace' }}>
                    {p.pattern_type}
                  </span>
                </div>

                <h3 style={{ margin: '8px 0 4px', fontSize: '15px', fontFamily: 'Space Grotesk, sans-serif', color: 'var(--ink)' }}>
                  {p.title}
                </h3>

                <p style={{ fontSize: '12.5px', color: 'var(--ink-soft)', lineHeight: '1.5', margin: '0 0 10px' }}>
                  {p.description}
                </p>

                {/* Subgraph node preview */}
                {p.subgraph_nodes && (
                  <div style={{ fontSize: '11px', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '10px' }}>
                    <b>Nodes Flagged ({p.subgraph_nodes.length}):</b> {p.subgraph_nodes.join(', ')}
                  </div>
                )}

                {/* Involved Domains */}
                {p.involved_domains && p.involved_domains.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '14px' }}>
                    {p.involved_domains.map((dom) => (
                      <span key={dom} style={{ background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--ink)', fontSize: '9.5px', padding: '2px 6px', borderRadius: '2px', fontFamily: 'IBM Plex Mono, monospace' }}>
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
                    borderColor: 'var(--stamp-red)',
                    padding: '8px 12px'
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
