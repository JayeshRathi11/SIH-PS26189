import React, { useRef } from 'react';

export default function PinNode({
  entity,
  selected,
  onSelect,
  onDrag,
  isHighlighted,
  isDimmed,
  zoom = 1,
  pan = { x: 0, y: 0 },
  viewportRef
}) {
  const draggingRef = useRef(false);
  const offsetRef = useRef({ x: 0, y: 0 });
  const movedRef = useRef(false);

  const handlePointerDown = (e) => {
    e.stopPropagation();
    draggingRef.current = true;
    movedRef.current = false;

    // Calculate offset in world coordinates taking zoom & pan into account
    const viewportRect = viewportRef?.current?.getBoundingClientRect() || { left: 0, top: 0 };
    const mouseWorldX = (e.clientX - viewportRect.left - pan.x) / zoom;
    const mouseWorldY = (e.clientY - viewportRect.top - pan.y) / zoom;

    offsetRef.current = {
      x: mouseWorldX - entity.x,
      y: mouseWorldY - entity.y,
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const handlePointerMove = (e) => {
    if (!draggingRef.current) return;
    movedRef.current = true;

    const viewportRect = viewportRef?.current?.getBoundingClientRect() || { left: 0, top: 0 };
    const mouseWorldX = (e.clientX - viewportRect.left - pan.x) / zoom;
    const mouseWorldY = (e.clientY - viewportRect.top - pan.y) / zoom;

    const newX = Math.round(mouseWorldX - offsetRef.current.x);
    const newY = Math.round(mouseWorldY - offsetRef.current.y);

    onDrag(entity.id, newX, newY);
  };

  const handlePointerUp = () => {
    draggingRef.current = false;
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
  };

  const handleClick = (e) => {
    e.stopPropagation();
    if (!movedRef.current) {
      onSelect(entity.id);
    }
  };

  const isConfirmed = entity.verified_by_officer || entity.status === 'CONFIRMED';
  const isRejected = entity.status === 'REJECTED';

  let nodeClasses = `pin-node type-${entity.type || 'person'}`;
  if (selected) nodeClasses += ' selected';
  if (isHighlighted) nodeClasses += ' highlighted';
  if (isDimmed) nodeClasses += ' dimmed';
  if (isConfirmed) nodeClasses += ' confirmed';
  if (isRejected) nodeClasses += ' rejected';

  const centralityVal = typeof entity.centrality === 'number'
    ? entity.centrality.toFixed(2)
    : entity.centrality;

  return (
    <div
      className={nodeClasses}
      style={{
        left: entity.x,
        top: entity.y,
      }}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      title="Drag to reposition on canvas · Click for profile"
    >
      <div className="pname-row">
        <div className="pname">{entity.shortName || entity.name}</div>
        {isConfirmed && (
          <span style={{ color: 'var(--stamp-green)', fontWeight: 800, fontSize: '11px' }} title="Verified by Officer">
            ✓
          </span>
        )}
        {isRejected && (
          <span style={{ color: 'var(--stamp-red)', fontWeight: 800, fontSize: '11px' }} title="Rejected by Officer">
            ✗
          </span>
        )}
      </div>

      <div className="prole">{entity.role || entity.typeLabel}</div>

      <div className="pscore">
        <span>CENTRALITY</span>
        <span>{centralityVal}</span>
      </div>

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