import React from 'react';

export default function PatternsDrawer({ isOpen, onClose, patterns, onFocusPattern }) {
  if (!isOpen) return null;

  return (
    <div className="tactical-drawer">
      {/* Header */}
      <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--panel)' }}>
        <div>
          <div className="eyebrow" style={{ color: 'var(--stamp-red)', fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'IBM Plex Mono, monospace' }}>
            ● SYNDICATE PATTERN DETECTION
          </div>
          <h3 style={{ margin: '2px 0 0', fontSize: '15px', fontFamily: 'Space Grotesk, sans-serif', color: 'var(--ink)' }}>
            Modus Operandi & Anomalies
          </h3>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', color: 'var(--ink-muted)', fontSize: '18px', cursor: 'pointer', padding: '2px 6px' }}
        >
          ✕
        </button>
      </div>

      {/* Content List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {patterns.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--ink-muted)', fontSize: '12px', fontStyle: 'italic' }}>
            No anomaly patterns flagged for the active domain.
          </div>
        ) : (
          patterns.map((p) => {
            const isCritical = p.risk_level === 'CRITICAL';
            const isHigh = p.risk_level === 'HIGH';
            const badgeColor = isCritical ? 'var(--stamp-red)' : (isHigh ? 'var(--tag-amber)' : 'var(--stamp-blue)');
            const badgeBg = isCritical ? 'var(--stamp-red-bg)' : (isHigh ? 'var(--tag-amber-bg)' : 'var(--stamp-blue-bg)');

            return (
              <div
                key={p.pattern_id}
                style={{
                  background: 'var(--paper)',
                  border: `1px solid ${isCritical ? 'var(--stamp-red)' : 'var(--border)'}`,
                  borderLeft: `4px solid ${badgeColor}`,
                  borderRadius: '2px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{
                    background: badgeBg,
                    border: `1px solid ${badgeColor}`,
                    color: badgeColor,
                    fontSize: '9px',
                    fontWeight: 700,
                    padding: '1px 5px',
                    borderRadius: '2px',
                    textTransform: 'uppercase',
                    fontFamily: 'IBM Plex Mono, monospace'
                  }}>
                    {p.risk_level} • Risk {p.risk_score}%
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace' }}>
                    {p.pattern_type}
                  </span>
                </div>

                <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--ink)', fontFamily: 'Space Grotesk, sans-serif' }}>
                  {p.title}
                </div>

                <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--ink-soft)', lineHeight: '1.4' }}>
                  {p.description}
                </p>

                {p.involved_domains && p.involved_domains.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                    {p.involved_domains.map((dom) => (
                      <span key={dom} style={{ background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--ink-soft)', fontSize: '9px', padding: '1px 5px', borderRadius: '2px', fontFamily: 'IBM Plex Mono, monospace' }}>
                        {dom.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => onFocusPattern(p)}
                  className="tactical-btn"
                  style={{
                    marginTop: '6px',
                    justifyContent: 'center',
                    background: 'var(--panel)',
                    color: 'var(--ink)',
                    borderColor: 'var(--border)'
                  }}
                >
                  🔍 Focus on Corkboard Graph
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
