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
      background: '#0F172A',
      borderLeft: '1px solid rgba(255, 255, 255, 0.15)',
      boxShadow: '-10px 0 25px rgba(0,0,0,0.5)',
      zIndex: 9990,
      display: 'flex',
      flexDirection: 'column',
      color: '#F8FAFC'
    }}>
      {/* Header */}
      <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🚨</span> Suspicious Pattern Alerts
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#94A3B8' }}>
            Rule-Based & Graph Anomaly Detection Catalog
          </p>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', color: '#94A3B8', fontSize: '1.2rem', cursor: 'pointer' }}
        >
          ✕
        </button>
      </div>

      {/* Content List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {patterns.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 10px', color: '#64748B', fontSize: '0.85rem' }}>
            No anomaly patterns flagged for the active domain.
          </div>
        ) : (
          patterns.map((p) => {
            const isCritical = p.risk_level === 'CRITICAL';
            const isHigh = p.risk_level === 'HIGH';
            const badgeColor = isCritical ? '#EF4444' : (isHigh ? '#F59E0B' : '#3B82F6');

            return (
              <div
                key={p.pattern_id}
                style={{
                  background: '#1E293B',
                  border: `1px solid ${isCritical ? '#EF4444' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: '8px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{
                    background: `${badgeColor}22`,
                    border: `1px solid ${badgeColor}`,
                    color: badgeColor,
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    textTransform: 'uppercase'
                  }}>
                    {p.risk_level} • Risk {p.risk_score}%
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>{p.pattern_type}</span>
                </div>

                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#F1F5F9' }}>
                  {p.title}
                </div>

                <p style={{ margin: 0, fontSize: '0.8rem', color: '#CBD5E1', lineHeight: '1.35' }}>
                  {p.description}
                </p>

                {p.involved_domains && p.involved_domains.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
                    {p.involved_domains.map((dom) => (
                      <span key={dom} style={{ background: '#334155', color: '#94A3B8', fontSize: '0.65rem', padding: '1px 5px', borderRadius: '3px' }}>
                        {dom.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => onFocusPattern(p)}
                  style={{
                    marginTop: '6px',
                    background: '#2563EB',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '6px 10px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
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
