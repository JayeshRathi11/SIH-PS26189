import React from 'react';

export default function CaseFolder({ caseItem, index, isActive, onSelect, onReorder, onArchive, onDelete }) {
  const handleDragStart = (e) => {
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const fromIndex = Number(e.dataTransfer.getData('text/plain'));
    if (fromIndex !== index) onReorder(fromIndex, index);
  };

  // The unified master view (case-all) represents every domain at once,
  // so archiving/deleting it doesn't make sense -- hide the controls for it.
  const isGlobal = caseItem.id === 'case-all';

  const handleArchiveClick = (e) => {
    e.stopPropagation();
    onArchive(caseItem.id);
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    const ok = window.confirm(
      `Remove "${caseItem.title}" from your case list? This only removes it from view -- the underlying entities and documents are not deleted.`
    );
    if (ok) onDelete(caseItem.id);
  };

  return (
    <div
      className={`case-folder ${isActive ? 'active' : ''}`}
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => onSelect(caseItem.id)}
      title="Drag to reorder"
      style={{ opacity: caseItem.archived ? 0.5 : 1 }}
    >
      <div className="fid">{caseItem.caseId}</div>
      <div className="ftitle">{caseItem.title}</div>
      <div className="fmeta">
        <span>
          {caseItem.entities} entities · {caseItem.links} links
        </span>
        <span className="ftag">{caseItem.archived ? 'Archived' : caseItem.tag}</span>
      </div>
      {!isGlobal && (
        <div className="fcase-actions" style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleArchiveClick}
            style={{ fontSize: '0.65rem', padding: '2px 7px' }}
            title={caseItem.archived ? 'Restore this case to the active list' : 'Archive this case (hide it, keep the data)'}
          >
            {caseItem.archived ? '↩ Restore' : '📦 Archive'}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleDeleteClick}
            style={{ fontSize: '0.65rem', padding: '2px 7px', color: 'var(--stamp-red)' }}
            title="Remove from case list (does not delete underlying data)"
          >
            🗑 Delete
          </button>
        </div>
      )}
    </div>
  );
}