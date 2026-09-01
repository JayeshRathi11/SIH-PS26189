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
  onTemporalDateChange,
  activeFilter
}) {
  // Highest centrality currently on the board, used to scale node
  // prominence relative to the others in view (so a kingpin stands out
  // in a single-domain subgraph just as much as in the unified network,
  // rather than by raw score which shrinks as the subgraph shrinks).
  const maxCentrality = useMemo(() => {
    return entities.reduce((max, e) => Math.max(max, e.centrality || 0), 0.0001);
  }, [entities]);

  // Highlight / dimming calculation
  const highlightedNodeIds = useMemo(() => {
    if (!focusedPattern || !focusedPattern.subgraph_nodes) return new Set();
    return new Set(focusedPattern.subgraph_nodes);
  }, [focusedPattern]);

  // Sidebar "Filters" chips (All / Persons / Orgs / High Risk). Rather than
  // hiding entities outright (which would silently break edges and the
  // temporal slider's sense of "the network"), non-matching entities are
  // dimmed in place, the same visual language already used for suspicious
  // pattern focus below. "High Risk" is defined as the entities whose
  // computed hub/centrality score sits at or above half of the current
  // view's maximum -- the same score that already drives pin size, so
  // "risk" here means "structurally central to this network" rather than
  // an arbitrary/undefined label.
  const filterMatchIds = useMemo(() => {
    if (!activeFilter || activeFilter === 'All') return null; // null = no filter active
    const matching = entities.filter((e) => {
      if (activeFilter === 'Persons') return e.type === 'person';
      if (activeFilter === 'Orgs') return e.type === 'org';
      if (activeFilter === 'High Risk') return (e.centrality || 0) >= maxCentrality * 0.5;
      return true;
    });
    return new Set(matching.map((e) => e.id));
  }, [entities, activeFilter, maxCentrality]);

  const paths = useMemo(() => {
    const map = Object.fromEntries(entities.map((e) => [e.id, e]));
    return threads
      .map(([a, b, confidence, type, domain, verified, status]) => {
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
          confidence,
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
            {filterMatchIds && ` · FILTER: ${activeFilter.toUpperCase()} (${filterMatchIds.size} MATCHED)`}
          </div>
        </div>
        <div className="board-hint">
          📌 Drag pin to organize · Click for XAI & Court Brief
        </div>
      </div>

      {/* Confidence / provenance legend -- always visible so a reviewer can
          read a pin's border/opacity/edge styling without guessing. Kept
          compact (one line, wraps if the window is narrow) since it has to
          coexist with the pattern-focus banner and the case header above. */}
      <div
        className="board-legend"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '14px',
          padding: '6px 16px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--panel)',
          fontSize: '0.7rem',
          color: 'var(--ink-soft)',
          zIndex: 10
        }}
      >
        <span style={{ fontWeight: 700, color: 'var(--ink)' }}>Legend:</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, border: '2px solid var(--stamp-green)' }} />
          Officer-confirmed
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, border: '1px dashed var(--stamp-red)' }} />
          Rejected
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, border: '2px solid var(--tag-amber)', boxShadow: '0 0 6px rgba(245, 158, 11, 0.6)' }} />
          Pattern-highlighted
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, border: '2px solid var(--info)' }} />
          Selected
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, border: '1px solid var(--border)' }} />
          Unverified / AI-extracted
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, border: '1px solid var(--border)', opacity: 0.35 }} />
          Dimmed by active filter
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: 16, height: 2, background: 'var(--stamp-green)' }} />
          Verified link
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: 16, height: 0, borderTop: '1.5px dashed var(--stamp-red)' }} />
          Rejected link
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          Thicker/darker thread = higher confidence
        </span>
      </div>

      {/* Pattern Focus Banner */}
      {focusedPattern && (
        <div style={{
          background: 'var(--warning-soft)',
          borderBottom: '1px solid var(--tag-amber)',
          padding: '8px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: 'var(--tag-amber)',
          fontSize: '0.8rem',
          zIndex: 10
        }}>
          <div>
            <b><span aria-hidden="true">🚨</span> Active Pattern Focus:</b> {focusedPattern.title} ({focusedPattern.subgraph_nodes.length} Nodes Highlighted)
          </div>
          <button
            type="button"
            className="btn btn-warning is-active"
            onClick={onClearPatternFocus}
            style={{ padding: '3px 10px', fontSize: '0.75rem' }}
          >
            Clear Pattern Focus
          </button>
        </div>
      )}

      {/* Canvas */}
      <div className="canvas" style={{ flex: 1, position: 'relative', overflow: 'auto' }}>
        <svg className="threads" style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
          {paths.map((p) => {
            let strokeColor = undefined;
            if (p.isPatternEdge) strokeColor = 'var(--tag-amber)';
            else if (p.isRejected) strokeColor = 'var(--stamp-red)';
            else if (p.isVerified) strokeColor = 'var(--stamp-green)';

            // Confidence-driven thickness/opacity so a weak, unverified link
            // reads as background noise and a strong one stands out, instead
            // of every thread rendering at the same full-opacity weight.
            const conf = typeof p.confidence === 'number' ? p.confidence : 0.5;
            const baseOpacity = 0.22 + conf * 0.45;
            const baseWidth = 1 + conf * 1.3;

            return (
              <path
                key={p.key}
                className="thread"
                d={p.d}
                style={{
                  stroke: strokeColor,
                  strokeWidth: p.isPatternEdge ? 3 : baseWidth,
                  strokeDasharray: p.isRejected ? '4 4' : undefined,
                  opacity: (focusedPattern && !p.isPatternEdge) ? 0.12 : (p.isPatternEdge ? 1 : baseOpacity)
                }}
              />
            );
          })}
        </svg>

        {entities.map((entity) => {
          const matchesFilter = !filterMatchIds || filterMatchIds.has(entity.id);
          const isHighlighted = focusedPattern ? (highlightedNodeIds.has(entity.id) && matchesFilter) : false;
          const isDimmed = focusedPattern ? (!highlightedNodeIds.has(entity.id) || !matchesFilter) : !matchesFilter;
          const sizeFactor = Math.min(1, (entity.centrality || 0) / maxCentrality);

          return (
            <PinNode
              key={entity.id}
              entity={entity}
              selected={entity.id === selectedId}
              onSelect={onSelect}
              onDrag={onDrag}
              isHighlighted={isHighlighted}
              isDimmed={isDimmed}
              sizeFactor={sizeFactor}
            />
          );
        })}
      </div>

      {/* Interactive Temporal Evolution Slider Dock */}
      <div style={{
        background: 'var(--panel)',
        borderTop: '1px solid var(--border)',
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        zIndex: 20,
        color: 'var(--ink)'
      }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
          <span aria-hidden="true">⏱️</span> Temporal Evolution:
          <span style={{ color: 'var(--info)', fontFamily: 'monospace' }}>
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
          style={{ flex: 1, accentColor: 'var(--info)', cursor: 'pointer' }}
        />

        {temporalDate && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => onTemporalDateChange(null)}
            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
          >
            Reset to Present
          </button>
        )}
      </div>
    </main>
  );
}
