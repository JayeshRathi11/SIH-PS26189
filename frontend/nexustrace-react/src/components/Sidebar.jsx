import React, { useState, useEffect, useRef } from 'react';
import CaseFolder from './CaseFolder';
import EvaluationPanel from './EvaluationPanel';
import { runPipeline, uploadCaseDocument } from '../api/client';

export default function Sidebar({ cases, activeCaseId, onSelectCase, onReorderCases, onAddCase, onArchiveCase, onDeleteCase, isOpen, activeFilter, onFilterChange }) {
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCaseId, setNewCaseId] = useState('');
  const [newCaseTitle, setNewCaseTitle] = useState('');
  const [newCaseFiles, setNewCaseFiles] = useState([]);
  const fileInputRef = useRef(null);

  const [showArchived, setShowArchived] = useState(false);
  const archivedCount = cases.filter((c) => c.archived).length;

  const filteredCases = cases.filter(
    (c) =>
      (showArchived || !c.archived) &&
      (c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.caseId.toLowerCase().includes(search.toLowerCase()))
  );

  const [pollingStatus, setPollingStatus] = useState('');
  const [pollingJobId, setPollingJobId] = useState(null);
  const [pollingDomain, setPollingDomain] = useState(null);

  const timeoutRef = useRef(null);
  const failureCountRef = useRef(0);

  useEffect(() => {
    if (!pollingJobId || !pollingDomain) return;

    let isMounted = true;

    const poll = async () => {
      try {
        const statusRes = await fetch(`/api/pipeline/status/${pollingJobId}`);
        if (!statusRes.ok) throw new Error('Failed to fetch status');
        const statusData = await statusRes.json();

        if (!isMounted) return;
        failureCountRef.current = 0; // reset on success

        if (statusData.status === 'COMPLETED') {
          // If the case already exists, we just need to refresh it.
          // Otherwise, it's a new case being added.
          const exists = cases.some(c => c.id === pollingDomain.id);
          if (!exists) {
            onAddCase({
              id: pollingDomain.id,
              caseId: pollingDomain.id,
              title: pollingDomain.title,
              entities: statusData.total_entities || 0,
              links: statusData.total_relationships || 0,
              tag: 'Active',
            });
          } else {
            // Re-select to trigger App.jsx refetch (simple hack without adding new props)
            onSelectCase(null);
            setTimeout(() => onSelectCase(pollingDomain.id), 50);
          }
          setNewCaseId('');
          setNewCaseTitle('');
          setNewCaseFiles([]);
          if (fileInputRef.current) fileInputRef.current.value = '';
          setShowAddForm(false);
          setPollingStatus('');
          setPollingJobId(null);
          setPollingDomain(null);
        } else if (statusData.status === 'FAILED') {
          setPollingStatus('Pipeline failed: ' + statusData.error_message);
          setPollingJobId(null);
          setPollingDomain(null);
        } else {
          setPollingStatus(`Running... (${statusData.status})`);
          timeoutRef.current = setTimeout(poll, 2000);
        }
      } catch (err) {
        if (!isMounted) return;
        failureCountRef.current += 1;
        if (failureCountRef.current >= 3) {
          setPollingStatus('Error polling: max retries reached. ' + err.message);
          setPollingJobId(null);
          setPollingDomain(null);
        } else {
          setPollingStatus(`Error polling, retrying... (${failureCountRef.current}/3)`);
          timeoutRef.current = setTimeout(poll, 2000);
        }
      }
    };

    poll();

    return () => {
      isMounted = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [pollingJobId, pollingDomain, onAddCase]);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const domainId = newCaseId.trim();
    const domainTitle = newCaseTitle.trim();
    if (!domainId || !domainTitle) return;

    try {
      let data;
      if (newCaseFiles.length > 0) {
        // One or more source documents (FIR / case files) were attached:
        // send them to the upload endpoint so the pipeline extracts
        // entities/relationships from their actual text instead of
        // running on nothing.
        setPollingStatus(
          newCaseFiles.length === 1
            ? 'Uploading document & starting pipeline...'
            : `Uploading ${newCaseFiles.length} documents & starting pipeline...`
        );
        data = await uploadCaseDocument(domainId, newCaseFiles);
      } else {
        setPollingStatus('Starting pipeline...');
        data = await runPipeline(domainId);
      }

      failureCountRef.current = 0;
      setPollingDomain({ id: domainId, title: domainTitle });
      setPollingJobId(data.job_id);
    } catch (err) {
      console.error(err);
      setPollingStatus('Error: ' + err.message);
    }
  };

  const handleRunActivePipeline = async () => {
    if (!activeCaseId) return;
    setPollingStatus('Starting pipeline for active case...');
    try {
      const data = await runPipeline(activeCaseId);

      failureCountRef.current = 0;
      const activeCase = cases.find(c => c.id === activeCaseId);
      setPollingDomain({ id: activeCaseId, title: activeCase?.title || 'Active Case' });
      setPollingJobId(data.job_id);
    } catch (err) {
      console.error(err);
      setPollingStatus('Error: ' + err.message);
    }
  };

  return (
    <aside className={`sidebar ${isOpen ? '' : 'collapsed'}`}>
      <h2>Search Entities</h2>
      <div className="search-box-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
        <input
          className="search-box"
          placeholder="Name, phone, org, location..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <h2>Filters</h2>
      <div className="filters">
        {['All', 'Persons', 'Orgs', 'High Risk'].map((f) => (
          <span
            key={f}
            className={`filter-chip ${activeFilter === f ? 'active' : ''}`}
            onClick={() => onFilterChange(f)}
            title={
              f === 'High Risk'
                ? 'Entities with the highest computed centrality (hub score) in the current view'
                : f === 'All'
                ? 'Show every entity at full opacity'
                : `Dim every entity that is not a ${f.slice(0, -1)}`
            }
          >
            {f}
          </span>
        ))}
      </div>
      {activeFilter !== 'All' && (
        <div style={{ padding: '0 16px 10px', fontSize: '0.72rem', color: 'var(--ink-soft)' }}>
          Non-matching entities are dimmed on the corkboard.
        </div>
      )}

      <h2 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: '16px' }}>
        Open Cases
        <button className="btn btn-info" onClick={handleRunActivePipeline} disabled={!!pollingStatus} style={{ fontSize: '0.68rem', padding: '4px 9px' }}>
          Run Pipeline
        </button>
      </h2>
      {pollingStatus && <div style={{ padding: '0 16px 12px', fontSize: '0.8rem', color: 'var(--tag-amber)' }}>{pollingStatus}</div>}
      {archivedCount > 0 && (
        <button
          className="btn btn-ghost"
          onClick={() => setShowArchived((s) => !s)}
          style={{ margin: '0 16px 8px', fontSize: '0.7rem', padding: '3px 8px', alignSelf: 'flex-start' }}
        >
          {showArchived ? 'Hide' : 'Show'} Archived ({archivedCount})
        </button>
      )}
      {filteredCases.map((c) => {
        const originalIndex = cases.findIndex((x) => x.id === c.id);
        return (
          <CaseFolder
            key={c.id}
            caseItem={c}
            index={originalIndex}
            isActive={c.id === activeCaseId}
            onSelect={onSelectCase}
            onReorder={onReorderCases}
            onArchive={onArchiveCase}
            onDelete={onDeleteCase}
          />
        );
      })}

      <div className="add-case-block">
        {!showAddForm ? (
          <button className="add-case-btn" onClick={() => setShowAddForm(true)}>
            + Add New Case
          </button>
        ) : (
          <form className="add-case-form" onSubmit={handleAddSubmit}>
            <input
              placeholder="Case ID (e.g. RC0322026A0099)"
              value={newCaseId}
              onChange={(e) => setNewCaseId(e.target.value)}
            />
            <input
              placeholder="Case title"
              value={newCaseTitle}
              onChange={(e) => setNewCaseTitle(e.target.value)}
            />

            <label
              htmlFor="new-case-file"
              style={{
                display: 'block',
                marginTop: '4px',
                padding: '8px 10px',
                border: '1px dashed var(--border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.78rem',
                color: 'var(--ink-soft)',
                textAlign: 'center',
                cursor: 'pointer',
                background: 'var(--paper)'
              }}
            >
              {newCaseFiles.length > 0
                ? `📎 ${newCaseFiles.length} file${newCaseFiles.length > 1 ? 's' : ''} attached`
                : '📄 Attach FIR / Case Document(s) (.txt, .docx, .pdf) — optional'}
            </label>
            <input
              id="new-case-file"
              ref={fileInputRef}
              type="file"
              accept=".txt,.docx,.pdf"
              multiple
              onChange={(e) => setNewCaseFiles(Array.from(e.target.files || []))}
              style={{ display: 'none' }}
            />
            {newCaseFiles.length > 0 && (
              <ul style={{ margin: '2px 0 0', padding: '0 0 0 16px', fontSize: '0.72rem', color: 'var(--ink-soft)' }}>
                {newCaseFiles.map((f, i) => (
                  <li key={`${f.name}-${i}`}>{f.name}</li>
                ))}
              </ul>
            )}
            {newCaseFiles.length > 0 && (
              <button
                type="button"
                className="btn btn-ghost"
                style={{ fontSize: '0.7rem', padding: '3px 8px', alignSelf: 'flex-start' }}
                onClick={() => { setNewCaseFiles([]); if (fileInputRef.current) fileInputRef.current.value = ''; }}
              >
                Remove attachment{newCaseFiles.length > 1 ? 's' : ''}
              </button>
            )}
            {newCaseFiles.length === 0 && (
              <div style={{ fontSize: '0.68rem', color: 'var(--ink-soft)' }}>
                No document attached — the pipeline will run on the existing dataset for this case ID instead of extracting from a new source file.
              </div>
            )}

            <div className="add-case-form-actions">
              <button type="submit" disabled={!!pollingStatus}>Create</button>
              <button type="button" onClick={() => { setShowAddForm(false); setPollingStatus(''); setNewCaseFiles([]); if (fileInputRef.current) fileInputRef.current.value = ''; }} disabled={!!pollingStatus}>
                Cancel
              </button>
            </div>
            {pollingStatus && <div style={{ marginTop: '10px', fontSize: '0.85rem', color: 'var(--ink-soft)' }}>{pollingStatus}</div>}
          </form>
        )}
      </div>

      <EvaluationPanel domain={activeCaseId} />
    </aside>
  );
}
