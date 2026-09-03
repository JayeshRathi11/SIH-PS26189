import React from 'react';

export default function CaseFolder({ caseItem, index, isActive, onSelect, onReorder }) {
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
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (!isNaN(fromIndex) && fromIndex !== index) {
      onReorder(fromIndex, index);
    }
  };

  const isGlobal = caseItem.tag === 'Global' || caseItem.id === 'case-all';
  // Same status-color convention as CaseFilesPage.jsx's statusSlug().
  const statusClass = 'status-' + String(caseItem.tag || 'active').trim().toLowerCase().replace(/\s+/g, '-');

  return (
    <div
      className={`case-folder ${isActive ? 'active' : ''}`}
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => onSelect(caseItem.id)}
      title="Drag to reorder · Click to view case network"
    >
      <div className="fid">{caseItem.caseId}</div>
      <div className="ftitle">{caseItem.title}</div>
      <div className="fmeta">
        <span>{typeof caseItem.entities === 'number' ? `${caseItem.entities} entities · ${caseItem.links} links` : `${caseItem.entities} · ${caseItem.links}`}</span>
        <span className={`ftag ${isGlobal ? 'global' : statusClass}`}>{caseItem.tag || 'Active'}</span>
      </div>
    </div>
  );
}