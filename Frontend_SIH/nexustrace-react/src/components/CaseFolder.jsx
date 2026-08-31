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
    const fromIndex = Number(e.dataTransfer.getData('text/plain'));
    if (fromIndex !== index) onReorder(fromIndex, index);
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
    >
      <div className="fid">{caseItem.caseId}</div>
      <div className="ftitle">{caseItem.title}</div>
      <div className="fmeta">
        <span>
          {caseItem.entities} entities · {caseItem.links} links
        </span>
        <span className="ftag">{caseItem.tag}</span>
      </div>
    </div>
  );
}