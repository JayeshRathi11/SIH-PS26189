import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import PinNode from './PinNode';
import DetailPanel from './DetailPanel';

const NODE_WIDTH = 136;
const PIN_OFFSET_Y = 7;

export default function Board({
  entities,
  threads,
  selectedId,
  onSelect,
  onDrag,
  cases,
  activeCaseId,
  onSelectCase,
  focusedPattern,
  onClearPatternFocus,
  temporalDate,
  onTemporalDateChange,
  onFeedbackUpdated,
}) {
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectorOpen, setInspectorOpen] = useState(false);

  // Pan & Zoom Engine State
  const [pan, setPan] = useState({ x: 60, y: 40 });
  const [zoom, setZoom] = useState(1);
  const viewportRef = useRef(null);
  const isPanningRef = useRef(false);
  const startPanPosRef = useRef({ x: 0, y: 0 });

  const activeCase = cases.find((c) => c.id === activeCaseId);
  const selectedEntity = entities.find((e) => e.id === selectedId) || null;

  // Compute highlighted pattern nodes
  const highlightedNodeIds = useMemo(() => {
    if (!focusedPattern || !focusedPattern.subgraph_nodes) return new Set();
    return new Set(focusedPattern.subgraph_nodes);
  }, [focusedPattern]);

  // Compute visible entities based on search query and POLE filters
  const { visibleEntities, activeSearchSeedIds } = useMemo(() => {
    let matchedSeedIds = new Set();

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const filtered = entities.filter((e) => {
        const matchesName = e.name?.toLowerCase().includes(q);
        const matchesRole = e.role?.toLowerCase().includes(q);
        const matchesAlias = e.aliases?.some(a => a.toLowerCase().includes(q));
        if (matchesName || matchesRole || matchesAlias) {
          matchedSeedIds.add(e.id);
          return true;
        }
        return false;
      });

      return { visibleEntities: filtered, activeSearchSeedIds: matchedSeedIds };
    }

    // No search query: filter by POLE categories
    const filtered = entities.filter((e) => {
      if (activeFilter === 'Persons') return e.type === 'person';
      if (activeFilter === 'Locations') return e.type === 'location';
      if (activeFilter === 'Orgs') return e.type === 'org';
      if (activeFilter === 'Financial') return e.type === 'bank' || e.type === 'phone';
      if (activeFilter === 'High Risk') return typeof e.centrality === 'number' ? e.centrality > 0.4 : false;
      return true;
    });

    return { visibleEntities: filtered, activeSearchSeedIds: matchedSeedIds };
  }, [entities, activeFilter, searchQuery]);

  // Compute thread SVG line paths dynamically - strictly require BOTH endpoints to be in visibleEntities
  const paths = useMemo(() => {
    const visibleMap = Object.fromEntries(visibleEntities.map((e) => [e.id, e]));

    return threads
      .map(([a, b, strong, relType, domain, verified, status]) => {
        const ea = visibleMap[a];
        const eb = visibleMap[b];

        // STRICT CHECK: Both nodes MUST be currently visible on canvas with valid coordinates
        if (!ea || !eb) return null;
        if (typeof ea.x !== 'number' || typeof ea.y !== 'number') return null;
        if (typeof eb.x !== 'number' || typeof eb.y !== 'number') return null;

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
  }, [visibleEntities, threads, focusedPattern, highlightedNodeIds]);

  // ----------------------------------------------------
  // Infinite Canvas Pan & Zoom Handlers
  // ----------------------------------------------------
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    setZoom((prev) => {
      const nextZoom = Math.min(Math.max(prev * zoomFactor, 0.25), 2.5);
      return Math.round(nextZoom * 100) / 100;
    });
  }, []);

  const handlePointerDownBackground = (e) => {
    if (e.target !== viewportRef.current && !e.target.classList.contains('infinite-canvas-content') && !e.target.classList.contains('threads')) {
      return;
    }
    isPanningRef.current = true;
    startPanPosRef.current = {
      x: e.clientX - pan.x,
      y: e.clientY - pan.y,
    };

    window.addEventListener('pointermove', handlePointerMoveBackground);
    window.addEventListener('pointerup', handlePointerUpBackground);
  };

  const handlePointerMoveBackground = (e) => {
    if (!isPanningRef.current) return;
    setPan({
      x: e.clientX - startPanPosRef.current.x,
      y: e.clientY - startPanPosRef.current.y,
    });
  };

  const handlePointerUpBackground = () => {
    isPanningRef.current = false;
    window.removeEventListener('pointermove', handlePointerMoveBackground);
    window.removeEventListener('pointerup', handlePointerUpBackground);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(Math.round((prev + 0.15) * 100) / 100, 2.5));
  const handleZoomOut = () => setZoom(prev => Math.max(Math.round((prev - 0.15) * 100) / 100, 0.25));

  const handleNodeClick = (entityId) => {
    onSelect(entityId);
    setInspectorOpen(true);
  };

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const poleFilters = ['All', 'Persons', 'Locations', 'Orgs', 'Financial', 'High Risk'];

  return (
    <main className="board-page-layout">
      {/* Clean Top Board Control Bar */}
      <div className="board-top-toolbar">
        {/* Left: Case / Domain Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', fontFamily: 'IBM Plex Mono, monospace', color: 'var(--ink-soft)' }}>
            Domain:
          </span>
          <select
            value={activeCaseId}
            onChange={(e) => onSelectCase(e.target.value)}
            className="search-box"
            style={{ padding: '5px 10px', fontSize: '12px', width: '250px' }}
          >
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.caseId} — {c.title}
              </option>
            ))}
          </select>
        </div>

        {/* Center: POLE Filter Pills */}
        <div className="filters" style={{ margin: 0 }}>
          {poleFilters.map((f) => (
            <span
              key={f}
              className={`filter-chip ${activeFilter === f ? 'active' : ''}`}
              onClick={() => setActiveFilter(f)}
            >
              {f}
            </span>
          ))}
        </div>

        {/* Right: Quick Search in Canvas */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="text"
            placeholder="Search on board..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-box"
            style={{ width: '160px', padding: '5px 8px' }}
          />

          <span style={{ fontSize: '10.5px', fontFamily: 'IBM Plex Mono, monospace', color: 'var(--ink-muted)' }}>
            {visibleEntities.length} NODES · {paths.length} LINKS
          </span>
        </div>
      </div>

      {/* Pattern Highlight Incident Banner */}
      {focusedPattern && (
        <div className="board-pattern-banner">
          <div>
            <b>🚨 MODUS OPERANDI ALERT:</b> {focusedPattern.title} ({focusedPattern.subgraph_nodes.length} Syndicate Nodes)
          </div>
          <button
            onClick={onClearPatternFocus}
            style={{
              background: 'var(--tag-amber)',
              color: '#FFF',
              border: 'none',
              borderRadius: '2px',
              padding: '3px 8px',
              fontSize: '10px',
              fontFamily: 'IBM Plex Mono, monospace',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Clear Pattern Focus
          </button>
        </div>
      )}

      {/* Infinite Canvas Viewport */}
      <div
        ref={viewportRef}
        className="infinite-canvas-viewport"
        onPointerDown={handlePointerDownBackground}
      >
        {/* Infinite Transform Container (Pan & Zoom) */}
        <div
          className="infinite-canvas-content"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          {/* SVG Threads Layer */}
          <svg className="threads">
            {paths.map((p) => {
              let threadClass = 'thread';
              if (p.isPatternEdge) threadClass += ' pattern';
              else if (p.isRejected) threadClass += ' rejected';
              else if (p.isVerified) threadClass += ' verified';
              else if (p.strong) threadClass += ' strong';

              return (
                <path
                  key={p.key}
                  className={threadClass}
                  d={p.d}
                  style={{
                    opacity: (focusedPattern && !p.isPatternEdge) ? 0.15 : undefined
                  }}
                />
              );
            })}
          </svg>

          {/* Pin Nodes */}
          {visibleEntities.map((entity) => {
            const isPatternHighlighted = focusedPattern ? highlightedNodeIds.has(entity.id) : false;
            const isSearchSeed = activeSearchSeedIds.has(entity.id);
            const isHighlighted = isPatternHighlighted || isSearchSeed;
            const isDimmed = focusedPattern ? !highlightedNodeIds.has(entity.id) : false;

            return (
              <PinNode
                key={entity.id}
                entity={entity}
                selected={entity.id === selectedId}
                onSelect={handleNodeClick}
                onDrag={onDrag}
                isHighlighted={isHighlighted}
                isDimmed={isDimmed}
                zoom={zoom}
                pan={pan}
                viewportRef={viewportRef}
              />
            );
          })}
        </div>

        {/* Floating Zoom HUD */}
        <div className="canvas-hud-controls">
          <button onClick={handleZoomOut} className="hud-btn" title="Zoom Out (-)">-</button>
          <span className="hud-zoom-display">{Math.round(zoom * 100)}%</span>
          <button onClick={handleZoomIn} className="hud-btn" title="Zoom In (+)">+</button>
        </div>

        {/* Floating Contextual Subject Inspector Drawer */}
        {selectedEntity && inspectorOpen && (
          <div className="floating-inspector-drawer">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span className="eyebrow" style={{ fontSize: '9.5px' }}>
                ● SUBJECT INSPECTOR
              </span>
              <button
                onClick={() => setInspectorOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--ink-muted)', fontSize: '15px', cursor: 'pointer', padding: '2px 6px' }}
                title="Close Inspector"
              >
                ✕
              </button>
            </div>

            <DetailPanel
              entity={selectedEntity}
              isOpen={true}
              activeCaseId={activeCaseId}
              onFeedbackUpdated={onFeedbackUpdated}
            />
          </div>
        )}
      </div>

      {/* Temporal Timeline Evolution Slider Dock */}
      <div className="temporal-dock">
        <div className="temporal-title">
          <span>⏱️ Timeline Evolution:</span>
          <span style={{ color: 'var(--tag-amber)', letterSpacing: '0.04em' }}>
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
          className="temporal-slider"
          title="Slide to inspect network structure at past timestamps"
        />

        {temporalDate && (
          <button
            onClick={() => onTemporalDateChange(null)}
            className="temporal-reset-btn"
          >
            Reset to Present
          </button>
        )}
      </div>
    </main>
  );
}