import React from 'react';

export default function PatternsDrawer({ isOpen, onClose, patterns, onFocusPattern }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      bottom: 0,
      right: 0,
      width: '380px',
      background: 'var(--panel)',
      borderLeft: '1px solid var(--border)',
      boxShadow: '-10px 0 25px rgba(0,0,0,0.25)',
      zIndex: 9990,
      display: 'flex',
      flexDirection: 'column',
      color: 'var(--ink)'
    }}>
      {/* Header */}
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span aria-hidden="true">🚨</span> Suspicious Pattern Alerts
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--ink-soft)' }}>
            Rule-Based &amp; Graph Anomaly Detection Catalog
          </p>
        </div>
        <button
          type="button"
          className="btn icon-btn btn-ghost"
          onClick={onClose}
          title="Close pattern alerts"
          aria-label="Close pattern alerts"
        >
          ✕
        </button>
      </div>

      {/* Content List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {patterns.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--ink-soft)', fontSize: '0.85rem' }}>
            No anomaly patterns flagged for the active domain.
          </div>
        ) : (
          patterns.map((p) => {
            const isCritical = p.risk_level === 'CRITICAL';
            const isHigh = p.risk_level === 'HIGH';
            const badgeClass = isCritical ? 'badge-danger' : (isHigh ? 'badge-warning' : 'badge-info');

            return (
              <div
                key={p.pattern_id}
                className="card-raised"
                style={isCritical ? { borderColor: 'var(--stamp-red)' } : undefined}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <span className={`badge ${badgeClass}`} style={{ textTransform: 'uppercase', fontWeight: 700 }}>
                    {p.risk_level} &bull; Risk {p.risk_score}%
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--ink-soft)' }}>{p.pattern_type}</span>
                </div>

                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginTop: '8px' }}>
                  {p.title}
                </div>

                <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: 'var(--ink-soft)', lineHeight: '1.35' }}>
                  {p.description}
                </p>

                {p.involved_domains && p.involved_domains.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                    {p.involved_domains.map((dom) => (
                      <span key={dom} className="badge">
                        {dom.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => onFocusPattern(p)}
                  style={{ marginTop: '10px', width: '100%', padding: '7px 10px', fontSize: '0.75rem' }}
                >
                  <span aria-hidden="true">🔍</span> Focus on Corkboard Graph
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
