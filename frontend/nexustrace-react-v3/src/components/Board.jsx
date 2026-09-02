import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import PinNode from './PinNode';
import DetailPanel from './DetailPanel';
import { exportGraphData } from '../api/client';

const NODE_WIDTH = 136;
const PIN_OFFSET_Y = 7;

export default function Board({
  entities,
  threads,
  selectedId,
  onSelect,
  onDrag,
  onBatchMove,
  cases,
  activeCaseId,
  onSelectCase,
  focusedPattern,
  onClearPatternFocus,
  onFeedbackUpdated,
}) {
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [lineMode] = useState('straight'); // toggle removed from the toolbar per the team's declutter request; curved mode stays in code, just unreachable from the UI
  const [hoveredEdge, setHoveredEdge] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const boardLayoutRef = useRef(null);
  const viewportRef = useRef(null);
  const isPanningRef = useRef(false);
  const startPanPosRef = useRef({ x: 0, y: 0 });

  // Pan & Zoom Engine State
  const [pan, setPan] = useState({ x: 80, y: 50 });
  const [zoom, setZoom] = useState(1);

  // PinNode only needs pan/zoom inside its drag-math event handlers, never
  // for what it renders (position comes from raw entity.x/y; the visual
  // pan/zoom is a CSS transform on the wrapping div, applied for free by
  // the browser). Passing pan/zoom as normal props forced every pin on the
  // board to re-render on every single pixel of a pan or wheel-zoom, which
  // is what made the board feel laggy with more than a handful of nodes.
  // A ref sidesteps that: it's kept current every render but never causes one.
  const panZoomRef = useRef({ x: pan.x, y: pan.y, zoom });
  panZoomRef.current = { x: pan.x, y: pan.y, zoom };

  const activeCase = cases.find((c) => c.id === activeCaseId);
  const selectedEntity = entities.find((e) => e.id === selectedId) || null;

  // Sync fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (boardLayoutRef.current?.requestFullscreen) {
        boardLayoutRef.current.requestFullscreen().catch(err => console.warn(err));
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(err => console.warn(err));
      }
    }
  };

  const handleExport = async (format) => {
    try {
      setIsExporting(true);
      const res = await exportGraphData(format, activeCaseId);
      const blob = new Blob([res.content], {
        type: format === 'json' ? 'application/json' : 'application/xml'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nexustrace_graph_${activeCaseId || 'global'}_${new Date().toISOString().slice(0, 10)}.${format === 'json' ? 'json' : 'graphml'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

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

  // Compute thread SVG paths with realistic catenary sag curves & multi-edge curvature
  const paths = useMemo(() => {
    const visibleMap = Object.fromEntries(visibleEntities.map((e) => [e.id, e]));
    const pairCountMap = new Map();

    return threads
      .map(([a, b, strong, relType, domain, verified, status, confidence]) => {
        const ea = visibleMap[a];
        const eb = visibleMap[b];

        if (!ea || !eb) return null;
        if (typeof ea.x !== 'number' || typeof ea.y !== 'number') return null;
        if (typeof eb.x !== 'number' || typeof eb.y !== 'number') return null;

        const x1 = ea.x + NODE_WIDTH / 2;
        const y1 = ea.y - PIN_OFFSET_Y;
        const x2 = eb.x + NODE_WIDTH / 2;
        const y2 = eb.y - PIN_OFFSET_Y;

        // Group multiple links between same node pair
        const pairKey = [a, b].sort().join(':::');
        const edgeIdx = pairCountMap.get(pairKey) || 0;
        pairCountMap.set(pairKey, edgeIdx + 1);

        const dx = x2 - x1;
        const dy = y2 - y1;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const nx = -dy / dist;
        const ny = dx / dist;

        // Natural string droop and offset for multi-links
        const sag = Math.min(dist * 0.08, 36);
        const lateralOffset = edgeIdx === 0 ? 0 : (edgeIdx % 2 === 1 ? 1 : -1) * Math.ceil(edgeIdx / 2) * 24;

        const cx = (x1 + x2) / 2 + nx * lateralOffset;
        const cy = (y1 + y2) / 2 + ny * lateralOffset + (lineMode === 'curved' ? sag : 0);

        const d = lineMode === 'curved'
          ? `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`
          : `M ${x1} ${y1} L ${x2} ${y2}`;

        const isPatternEdge = focusedPattern ? (highlightedNodeIds.has(a) && highlightedNodeIds.has(b)) : false;
        const isRejected = status === 'REJECTED';

        // Line weight reads real evidentiary confidence, not just the binary
        // 'strong' flag -- a 0.5-confidence link and a 0.95-confidence link used
        // to render identically. Rejected links stay thin regardless (their
        // dashed style already says 'don't trust this'); a pattern-focus link
        // never goes thinner than the highlight weight even if its own
        // confidence is modest, since focus mode is about visibility, not proof.
        const MIN_STROKE = 1.3;
        const MAX_STROKE = 4.4;
        const conf = Math.max(0, Math.min(1, confidence ?? (strong ? 0.9 : 0.6)));
        const importanceStroke = MIN_STROKE + conf * (MAX_STROKE - MIN_STROKE);
        const strokeWidth = isRejected ? 1.2 : (isPatternEdge ? Math.max(3.2, importanceStroke) : importanceStroke);

        return {
          key: `${a}-${b}-${edgeIdx}`,
          sourceId: a,
          targetId: b,
          sourceName: ea.name,
          targetName: eb.name,
          relType: relType || 'ASSOCIATE_OF',
          domain: domain || 'GLOBAL',
          d,
          cx,
          cy,
          strong,
          confidence: conf,
          strokeWidth,
          isPatternEdge,
          isRejected,
          isVerified: verified
        };
      })
      .filter(Boolean);
  }, [visibleEntities, threads, focusedPattern, highlightedNodeIds, lineMode]);

  // ----------------------------------------------------
  // Ultra-Smooth, Controllable Pan & Zoom Handlers
  // ----------------------------------------------------
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    // Gentle, fractional damping factor so zooming is smooth and controllable
    const zoomDelta = -e.deltaY * 0.0008;
    setZoom((prev) => {
      const nextZoom = Math.min(Math.max(prev * (1 + zoomDelta), 0.15), 3.0);
      return Math.round(nextZoom * 1000) / 1000;
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

    window.addEventListener('pointermove', handlePointerMoveBackground, { passive: true });
    window.addEventListener('pointerup', handlePointerUpBackground);
  };

  const handlePointerMoveBackground = (e) => {
    if (!isPanningRef.current) return;
    setPan({
      x: Math.round(e.clientX - startPanPosRef.current.x),
      y: Math.round(e.clientY - startPanPosRef.current.y),
    });
  };

  const handlePointerUpBackground = () => {
    isPanningRef.current = false;
    window.removeEventListener('pointermove', handlePointerMoveBackground);
    window.removeEventListener('pointerup', handlePointerUpBackground);
  };

  // Smooth button zoom steps (+8% / -8%)
  const handleZoomIn = () => setZoom(prev => Math.min(Math.round((prev + 0.08) * 100) / 100, 3.0));
  const handleZoomOut = () => setZoom(prev => Math.max(Math.round((prev - 0.08) * 100) / 100, 0.15));

  // Auto-Fit all visible nodes to screen cleanly
  const handleAutoFit = useCallback(() => {
    if (visibleEntities.length === 0) {
      setPan({ x: 80, y: 50 });
      setZoom(1);
      return;
    }

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    visibleEntities.forEach((e) => {
      if (typeof e.x === 'number' && typeof e.y === 'number') {
        minX = Math.min(minX, e.x);
        maxX = Math.max(maxX, e.x + NODE_WIDTH);
        minY = Math.min(minY, e.y);
        maxY = Math.max(maxY, e.y + 110);
      }
    });

    const graphWidth = maxX - minX + 160;
    const graphHeight = maxY - minY + 160;
    const viewportWidth = viewportRef.current?.clientWidth || 1000;
    const viewportHeight = viewportRef.current?.clientHeight || 700;

    const fitZoom = Math.min(Math.max(Math.min(viewportWidth / graphWidth, viewportHeight / graphHeight), 0.35), 1.25);
    const fitX = (viewportWidth - (maxX + minX) * fitZoom) / 2;
    const fitY = (viewportHeight - (maxY + minY) * fitZoom) / 2;

    setZoom(Math.round(fitZoom * 100) / 100);
    setPan({ x: Math.round(fitX), y: Math.round(fitY) });
  }, [visibleEntities]);

  // High-Performance Concentric Radial Auto-Layout (Batched in 1 single update, zero lag!)
  const handleAutoLayout = () => {
    if (visibleEntities.length === 0) return;

    // Group entities into 3 hierarchical tiers: Core Hubs, Direct Operatives, Peripheral Assets
    const coreHubs = [];
    const operatives = [];
    const peripherals = [];

    visibleEntities.forEach((e) => {
      const centrality = typeof e.centrality === 'number' ? e.centrality : 0;
      const domainsCount = e.domains?.length || 1;
      if (centrality >= 0.3 || domainsCount >= 2 || e.type === 'person' && centrality >= 0.2) {
        coreHubs.push(e);
      } else if (e.type === 'person' || e.type === 'org') {
        operatives.push(e);
      } else {
        peripherals.push(e);
      }
    });

    const centerX = 650;
    const centerY = 450;
    const newPositions = {};

    // 1. Core Hubs (Center Ring)
    const coreCount = Math.max(coreHubs.length, 1);
    const coreRadius = coreCount === 1 ? 0 : 120;
    coreHubs.forEach((e, idx) => {
      const angle = (idx / coreCount) * 2 * Math.PI - Math.PI / 2;
      newPositions[e.id] = {
        x: Math.round(centerX + (coreCount === 1 ? 0 : coreRadius * Math.cos(angle))),
        y: Math.round(centerY + (coreCount === 1 ? 0 : coreRadius * Math.sin(angle))),
      };
    });

    // 2. Operatives (Middle Ring)
    const opCount = Math.max(operatives.length, 1);
    const opRadius = Math.max(260, opCount * 28);
    operatives.forEach((e, idx) => {
      const angle = (idx / opCount) * 2 * Math.PI;
      newPositions[e.id] = {
        x: Math.round(centerX + opRadius * Math.cos(angle)),
        y: Math.round(centerY + opRadius * Math.sin(angle)),
      };
    });

    // 3. Peripheral Assets (Locations, Phones, Vehicles, Accounts) (Outer Ring)
    const periphCount = Math.max(peripherals.length, 1);
    const periphRadius = opRadius + 180;
    peripherals.forEach((e, idx) => {
      const angle = (idx / periphCount) * 2 * Math.PI + Math.PI / periphCount;
      newPositions[e.id] = {
        x: Math.round(centerX + periphRadius * Math.cos(angle)),
        y: Math.round(centerY + periphRadius * Math.sin(angle)),
      };
    });

    // Batch update all entity positions in ONE single React state update!
    if (onBatchMove) {
      onBatchMove(newPositions);
    } else {
      Object.entries(newPositions).forEach(([id, pos]) => onDrag(id, pos.x, pos.y));
    }

    // Auto-fit to the newly arranged layout
    setTimeout(handleAutoFit, 50);
  };

  const handleNodeClick = useCallback((entityId) => {
    onSelect(entityId);
    setInspectorOpen(true);
  }, [onSelect]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const poleFilters = ['All', 'Persons', 'Locations', 'Orgs', 'Financial', 'High Risk'];

  return (
    <main ref={boardLayoutRef} className="board-page-layout">
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
            style={{ width: '220px', padding: '5px 8px' }}
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

        {/* Right: Quick Search & Export -- line-style toggle and the node/link
            counter both moved out of here to cut toolbar clutter; the counter
            now lives in the floating HUD next to zoom, where it's read alongside
            the controls that actually change what's visible. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="text"
            placeholder="Search on board..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-box"
            style={{ width: '150px', padding: '4px 8px' }}
          />

          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => handleExport('json')}
              disabled={isExporting}
              className="tactical-btn"
              style={{ padding: '4px 7px', fontSize: '12px' }}
              title="Export graph as JSON"
            >
              💾
            </button>
            <button
              onClick={() => handleExport('graphml')}
              disabled={isExporting}
              className="tactical-btn"
              style={{ padding: '4px 7px', fontSize: '12px' }}
              title="Export graph as GraphML"
            >
              🌐
            </button>
          </div>
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
              color: 'var(--on-amber)',
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
          {/* SVG Threads Layer with Curved Catenary String Paths */}
          <svg className="threads">
            {paths.map((p) => {
              let threadClass = 'thread';
              if (p.isPatternEdge) threadClass += ' pattern';
              else if (p.isRejected) threadClass += ' rejected';
              else if (p.isVerified) threadClass += ' verified';
              else if (p.strong) threadClass += ' strong';

              const isHovered = hoveredEdge?.key === p.key;
              if (isHovered) threadClass += ' hovered';

              return (
                <g
                  key={p.key}
                  className="thread-group"
                  onMouseEnter={() => setHoveredEdge(p)}
                  onMouseLeave={() => setHoveredEdge(null)}
                >
                  {/* Invisible wide stroke for easy hover interaction */}
                  <path d={p.d} className="thread-hitbox" />

                  {/* Visible thread line */}
                  <path
                    className={threadClass}
                    d={p.d}
                    style={{
                      opacity: (focusedPattern && !p.isPatternEdge) ? 0.15 : (hoveredEdge && !isHovered ? 0.25 : undefined),
                      strokeWidth: p.strokeWidth
                    }}
                  />
                </g>
              );
            })}
          </svg>

          {/* Interactive Thread Details Tooltip on Hover */}
          {hoveredEdge && (
            <div
              className="thread-tooltip-overlay"
              style={{
                left: hoveredEdge.cx,
                top: hoveredEdge.cy - 10,
              }}
            >
              <div style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--tag-amber)', textTransform: 'uppercase' }}>
                🔗 {hoveredEdge.relType.replace(/_/g, ' ')}
              </div>
              <div style={{ fontSize: '9.5px', color: 'var(--ink)', marginTop: '2px' }}>
                {hoveredEdge.sourceName} ➔ {hoveredEdge.targetName}
              </div>
              <div style={{ fontSize: '8.5px', color: 'var(--ink-muted)', marginTop: '2px' }}>
                Domain: {hoveredEdge.domain.replace(/_/g, ' ')}
              </div>
            </div>
          )}

          {/* Pin Nodes */}
          {visibleEntities.map((entity) => {
            const isPatternHighlighted = focusedPattern ? highlightedNodeIds.has(entity.id) : false;
            const isSearchSeed = activeSearchSeedIds.has(entity.id);
            const isEdgeHighlighted = hoveredEdge ? (hoveredEdge.sourceId === entity.id || hoveredEdge.targetId === entity.id) : false;
            const isHighlighted = isPatternHighlighted || isSearchSeed || isEdgeHighlighted;
            const isDimmed = focusedPattern ? !highlightedNodeIds.has(entity.id) : (hoveredEdge && !isEdgeHighlighted);

            return (
              <PinNode
                key={entity.id}
                entity={entity}
                selected={entity.id === selectedId}
                onSelect={handleNodeClick}
                onDrag={onDrag}
                isHighlighted={isHighlighted}
                isDimmed={isDimmed}
                panZoomRef={panZoomRef}
                viewportRef={viewportRef}
              />
            );
          })}
        </div>

        {/* Floating Zoom & Canvas HUD with Fullscreen beside Zoom + */}
        <div className="canvas-hud-controls">
          <span style={{ fontSize: '10px', fontFamily: 'IBM Plex Mono, monospace', color: 'var(--ink-muted)', padding: '0 6px 0 2px', borderRight: '1px solid var(--border)' }}>
            {visibleEntities.length}N · {paths.length}L
          </span>
          <button onClick={handleZoomOut} className="hud-btn" title="Zoom Out (−)">−</button>
          <span className="hud-zoom-display">{Math.round(zoom * 100)}%</span>
          <button onClick={handleZoomIn} className="hud-btn" title="Zoom In (+)">+</button>
          <button
            onClick={toggleFullscreen}
            className="hud-btn"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            style={{ padding: '5px 8px', fontSize: '12px' }}
          >
            {isFullscreen ? '⤦' : '⛶'}
          </button>
          <button onClick={handleAutoFit} className="hud-btn" title="Fit All Nodes in View" style={{ fontSize: '11px' }}>
            ⊡ Fit
          </button>
          <button onClick={handleAutoLayout} className="hud-btn" title="Auto-Organize Radial Layout" style={{ fontSize: '11px' }}>
            ⚡ Layout
          </button>
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
    </main>
  );
}