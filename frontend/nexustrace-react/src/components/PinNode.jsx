import React, { useRef } from 'react';

export default function PinNode({ entity, selected, onSelect, onDrag, isHighlighted, isDimmed, sizeFactor = 0 }) {
  const draggingRef = useRef(false);
  const offsetRef = useRef({ x: 0, y: 0 });
  const movedRef = useRef(false);

  const handlePointerDown = (e) => {
    e.stopPropagation();
    draggingRef.current = true;
    movedRef.current = false;
    offsetRef.current = { x: e.clientX - entity.x, y: e.clientY - entity.y };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const handlePointerMove = (e) => {
    if (!draggingRef.current) return;
    movedRef.current = true;
    const newX = Math.max(0, e.clientX - offsetRef.current.x);
    const newY = Math.max(0, e.clientY - offsetRef.current.y);
    onDrag(entity.id, newX, newY);
  };

  const handlePointerUp = () => {
    draggingRef.current = false;
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
  };

  const handleClick = () => {
    if (!movedRef.current) onSelect(entity.id);
  };

  const isConfirmed = entity.verified_by_officer || entity.status === 'CONFIRMED';
  const isRejected = entity.status === 'REJECTED';

  let customBorder = undefined;
  if (selected) {
    customBorder = '2px solid var(--info)';
  } else if (isHighlighted) {
    customBorder = '2px solid var(--tag-amber)';
  } else if (isConfirmed) {
    customBorder = '2px solid var(--stamp-green)';
  } else if (isRejected) {
    customBorder = '1px dashed var(--stamp-red)';
  }

  return (
    <div
      className={`pin-node type-${entity.type} ${selected ? 'selected' : ''}`}
      style={{
        left: entity.x,
        top: entity.y,
        // Scale 0.85x-1.35x by relative centrality, anchored at the pin dot
        // (7px above top-center) so higher-ranked entities visually stand
        // out without shifting where their edges connect on the board.
        transform: `scale(${(0.85 + sizeFactor * 0.5).toFixed(3)})`,
        transformOrigin: '50% -7px',
        zIndex: Math.round(sizeFactor * 10),
        opacity: isDimmed ? 0.35 : (isRejected ? 0.5 : 1),
        border: customBorder,
        boxShadow: isHighlighted ? '0 0 12px rgba(245, 158, 11, 0.6)' : undefined,
        textDecoration: isRejected ? 'line-through' : undefined,
        transition: 'opacity 0.2s, box-shadow 0.2s'
      }}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <div className="pname">{entity.shortName}</div>
        {isConfirmed && <span style={{ color: 'var(--stamp-green)', fontSize: '0.75rem', fontWeight: 800 }}>✓</span>}
        {isRejected && <span style={{ color: 'var(--stamp-red)', fontSize: '0.75rem', fontWeight: 800 }}>✗</span>}
      </div>
      <div className="prole">{entity.role}</div>
      <div className="pscore">CENTRALITY {typeof entity.centrality === 'number' ? entity.centrality.toFixed(2) : entity.centrality}</div>
      {entity.timestamp && (
        <div className="ptime mono">
          {new Date(entity.timestamp).toLocaleDateString(undefined, {
            day: 'numeric',
            month: 'short',
          })}
        </div>
      )}
    </div>
  );
}