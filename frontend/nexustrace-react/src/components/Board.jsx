import React, { useMemo } from 'react';
import PinNode from './PinNode';

const NODE_WIDTH = 128;
const PIN_OFFSET_Y = 7;

export default function Board({
  entities,
  threads,
  selectedId,
  onSelect,
  onDrag,
  activeCase,
  focusedPattern,
  onClearPatternFocus,
  temporalDate,
  onTemporalDateChange
}) {
  // Highlight / dimming calculation
  const highlightedNodeIds = useMemo(() => {
    if (!focusedPattern || !focusedPattern.subgraph_nodes) return new Set();
    return new Set(focusedPattern.subgraph_nodes);
  }, [focusedPattern]);

  const paths = useMemo(() => {
    const map = Object.fromEntries(entities.map((e) => [e.id, e]));
    return threads
      .map(([a, b, strong, type, domain, verified, status]) => {
        const ea = map[a];
        const eb = map[b];
        if (!ea || !eb) return null;
        const x1 = ea.x + NODE_WIDTH / 2;
        const y1 = ea.y - PIN_OFFSET_Y;
        const x2 = eb.x + NODE_WIDTH / 2;
        const y2 = eb.y - PIN_OFFSET_Y;

        const isPatternEdge = focusedPattern ? (highlightedNodeIds.has(a) && highlightedNodeIds.has(b)) : false;

        return {
          key: `${a}-${b}`,
          d: `M ${x1} ${y1} L ${x2} ${y2}`,
          strong,
          isPatternEdge,
          isRejected: status === 'REJECTED',
          isVerified: verified
        };
      })
      .filter(Boolean);
  }, [entities, threads, focusedPattern, highlightedNodeIds]);

  return (
    <main className="board" style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header bar */}
      <div className="board-header">
        <div className="titles">
          <h2>Network — {activeCase?.title || 'Case'}</h2>
          <div className="sub">
            {entities.length} ENTITIES · {threads.length} THREADS · DIGITAL CUSTODY VERIFIED
          </div>
        </div>
        <div className="board-hint">
          📌 Drag pin to organize · Click for XAI & Court Brief
        </div>
      </div>

      {/* Pattern Focus Banner */}
      {focusedPattern && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.15)',
          borderBottom: '1px solid #F59E0B',
          padding: '8px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: '#FCD34D',
          fontSize: '0.8rem',
          zIndex: 10
        }}>
          <div>
            <b>🚨 Active Pattern Focus:</b> {focusedPattern.title} ({focusedPattern.subgraph_nodes.length} Nodes Highlighted)
          </div>
          <button
            onClick={onClearPatternFocus}
            style={{
              background: '#F59E0B',
              color: '#000',
              border: 'none',
              borderRadius: '4px',
              padding: '3px 8px',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Clear Pattern Focus
          </button>
        </div>
      )}

      {/* Canvas */}
      <div className="canvas" style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <svg className="threads" style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
          {paths.map((p) => {
            let strokeColor = undefined;
            if (p.isPatternEdge) strokeColor = '#F59E0B';
            else if (p.isRejected) strokeColor = '#7F1D1D';
            else if (p.isVerified) strokeColor = '#16A34A';

            return (
              <path
                key={p.key}
                className={`thread${p.strong ? ' strong' : ''}`}
                d={p.d}
                style={{
                  stroke: strokeColor,
                  strokeWidth: p.isPatternEdge ? 3 : (p.strong ? 2 : 1),
                  strokeDasharray: p.isRejected ? '4 4' : undefined,
                  opacity: (focusedPattern && !p.isPatternEdge) ? 0.2 : 1
                }}
              />
            );
          })}
        </svg>

        {entities.map((entity) => {
          const isHighlighted = focusedPattern ? highlightedNodeIds.has(entity.id) : false;
          const isDimmed = focusedPattern ? !highlightedNodeIds.has(entity.id) : false;

          return (
            <PinNode
              key={entity.id}
              entity={entity}
              selected={entity.id === selectedId}
              onSelect={onSelect}
              onDrag={onDrag}
              isHighlighted={isHighlighted}
              isDimmed={isDimmed}
            />
          );
        })}
      </div>

      {/* Interactive Temporal Evolution Slider Dock */}
      <div style={{
        background: '#0F172A',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        zIndex: 20,
        color: '#E2E8F0'
      }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
          <span>⏱️ Temporal Evolution:</span>
          <span style={{ color: '#38BDF8', fontFamily: 'monospace' }}>
            {temporalDate ? temporalDate : 'Current (Full Network)'}
          </span>
        </div>

        <input
          type="range"
          min="1"
          max="36"
          value={temporalDate ? parseInt(temporalDate.split('-')[1] || '36', 10) : 36}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            if (val === 36) {
              onTemporalDateChange(null);
            } else {
              const monthStr = String((val % 12) + 1).padStart(2, '0');
              onTemporalDateChange(`2026-${monthStr}-15`);
            }
          }}
          style={{ flex: 1, accentColor: '#38BDF8', cursor: 'pointer' }}
        />

        {temporalDate && (
          <button
            onClick={() => onTemporalDateChange(null)}
            style={{
              background: '#334155',
              border: 'none',
              color: '#F8FAFC',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '0.75rem',
              cursor: 'pointer'
            }}
          >
            Reset to Present
          </button>
        )}
      </div>
    </main>
  );
}