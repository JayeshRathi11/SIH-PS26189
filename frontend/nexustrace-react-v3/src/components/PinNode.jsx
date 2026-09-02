import React, { useRef, useState } from 'react';

function PinNode({
  entity,
  selected,
  onSelect,
  onDrag,
  isHighlighted,
  isDimmed,
  panZoomRef,
  viewportRef
}) {
  const [isHovered, setIsHovered] = useState(false);
  const draggingRef = useRef(false);
  const offsetRef = useRef({ x: 0, y: 0 });
  const movedRef = useRef(false);
  const rafRef = useRef(null);

  const handlePointerDown = (e) => {
    e.stopPropagation();
    draggingRef.current = true;
    movedRef.current = false;

    // Calculate offset in world coordinates taking zoom & pan into account
    const { x: panX, y: panY, zoom } = panZoomRef?.current || { x: 0, y: 0, zoom: 1 };
    const viewportRect = viewportRef?.current?.getBoundingClientRect() || { left: 0, top: 0 };
    const mouseWorldX = (e.clientX - viewportRect.left - panX) / zoom;
    const mouseWorldY = (e.clientY - viewportRect.top - panY) / zoom;

    offsetRef.current = {
      x: mouseWorldX - entity.x,
      y: mouseWorldY - entity.y,
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', handlePointerUp);
  };

  const handlePointerMove = (e) => {
    if (!draggingRef.current) return;
    movedRef.current = true;

    if (rafRef.current) return; // Drop redundant frames to lock 60fps

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      if (!draggingRef.current) return;

      const { x: panX, y: panY, zoom } = panZoomRef?.current || { x: 0, y: 0, zoom: 1 };
      const viewportRect = viewportRef?.current?.getBoundingClientRect() || { left: 0, top: 0 };
      const mouseWorldX = (e.clientX - viewportRect.left - panX) / zoom;
      const mouseWorldY = (e.clientY - viewportRect.top - panY) / zoom;

      const newX = Math.round(mouseWorldX - offsetRef.current.x);
      const newY = Math.round(mouseWorldY - offsetRef.current.y);

      onDrag(entity.id, newX, newY);
    });
  };

  const handlePointerUp = () => {
    draggingRef.current = false;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
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

  // Check if this node represents a phone or encrypted number
  const isPhoneNumber = entity.type === 'phone' ||
    entity.id?.startsWith('ENT_PHONE') ||
    /^[+]?[\d\s-]{7,}$/.test(entity.name || '') ||
    /^[+]?[\d\s-]{7,}$/.test(entity.shortName || '');

  const rawName = entity.shortName || entity.name;
  const isRevealed = isHovered || selected;

  const displayName = isPhoneNumber
    ? (isRevealed ? rawName : 'Unknown')
    : rawName;

  const displayRole = isPhoneNumber
    ? (isRevealed ? '📞 Decrypted Line' : '🔒 Intercept (Hover)')
    : (entity.role || entity.typeLabel);

  return (
    <div
      className={nodeClasses}
      style={{
        left: entity.x,
        top: entity.y,
      }}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={isPhoneNumber ? `Phone Intercept: ${rawName}` : 'Drag to reposition on canvas · Click for profile'}
    >
      <div className="pname-row">
        <div className="pname" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {isPhoneNumber && !isRevealed && (
            <span style={{ fontSize: '10px', opacity: 0.75 }}>🔒</span>
          )}
          <span>{displayName}</span>
        </div>
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

      <div className="prole" style={{ color: isPhoneNumber && isRevealed ? 'var(--tag-amber)' : undefined }}>
        {displayRole}
      </div>

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

export default React.memo(PinNode);
