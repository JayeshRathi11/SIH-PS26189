import React, { useState, useEffect, useRef } from 'react';
import CaseFolder from './CaseFolder';
import EvaluationPanel from './EvaluationPanel';
import { runPipeline } from '../api/client';

export default function Sidebar({
  cases,
  activeCaseId,
  onSelectCase,
  onReorderCases,
  onAddCase,
  isOpen,
  activeFilter = 'All',
  onFilterChange
}) {
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCaseId, setNewCaseId] = useState('');
  const [newCaseTitle, setNewCaseTitle] = useState('');

  const filteredCases = cases.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.caseId.toLowerCase().includes(search.toLowerCase())
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
        failureCountRef.current = 0;

        if (statusData.status === 'COMPLETED') {
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
            onSelectCase(null);
            setTimeout(() => onSelectCase(pollingDomain.id), 50);
          }
          setNewCaseId('');
          setNewCaseTitle('');
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
          setPollingStatus('Error polling: max retries reached.');
          setPollingJobId(null);
          setPollingDomain(null);
        } else {
          setPollingStatus(`Polling... (${failureCountRef.current}/3)`);
          timeoutRef.current = setTimeout(poll, 2000);
        }
      }
    };

    poll();

    return () => {
      isMounted = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [pollingJobId, pollingDomain, onAddCase, onSelectCase, cases]);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const domainId = newCaseId.trim();
    const domainTitle = newCaseTitle.trim();
    if (!domainId || !domainTitle) return;

    setPollingStatus('Triggering pipeline...');
    try {
      const data = await runPipeline(domainId);
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
    setPollingStatus('Triggering pipeline...');
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

  const filters = ['All', 'Persons', 'Locations', 'Orgs', 'Financial', 'High Risk'];

  return (
    <aside className={`sidebar ${isOpen ? '' : 'collapsed'}`}>
      {/* Search Entities */}
      <div>
        <div className="sidebar-section-title">Search Entities</div>
        <div className="search-box-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            className="search-box"
            placeholder="Name, phone, alias, org..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* POLE Entity Filters */}
      <div>
        <div className="sidebar-section-title">Entity Filters</div>
        <div className="filters">
          {filters.map((f) => (
            <span
              key={f}
              className={`filter-chip ${activeFilter === f ? 'active' : ''}`}
              onClick={() => onFilterChange && onFilterChange(f)}
            >
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* Case Folders List */}
      <div>
        <div className="sidebar-section-title">
          <span>Open Case Files</span>
          <button
            onClick={handleRunActivePipeline}
            disabled={!!pollingStatus}
            style={{
              fontSize: '9.5px',
              fontFamily: 'IBM Plex Mono, monospace',
              padding: '2px 7px',
              background: 'var(--paper)',
              color: 'var(--ink-soft)',
              border: '1px solid var(--border)',
              borderRadius: '2px',
              cursor: 'pointer'
            }}
            title="Re-run Entity Extraction & Ingestion Pipeline"
          >
            ⚡ Ingest
          </button>
        </div>

        {pollingStatus && (
          <div style={{ fontSize: '11px', color: 'var(--tag-amber)', marginBottom: '8px', fontFamily: 'IBM Plex Mono, monospace' }}>
            ⏳ {pollingStatus}
          </div>
        )}

        <div className="case-list">
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
              />
            );
          })}
        </div>

        {/* Add New Case */}
        <div className="add-case-block">
          {!showAddForm ? (
            <button className="add-case-btn" onClick={() => setShowAddForm(true)}>
              + Add Investigation Case
            </button>
          ) : (
            <form className="add-case-form" onSubmit={handleAddSubmit}>
              <input
                placeholder="Case ID (e.g. RC0322026A0099)"
                value={newCaseId}
                onChange={(e) => setNewCaseId(e.target.value)}
                required
              />
              <input
                placeholder="Case Title"
                value={newCaseTitle}
                onChange={(e) => setNewCaseTitle(e.target.value)}
                required
              />
              <div className="add-case-form-actions">
                <button type="submit" disabled={!!pollingStatus}>Create</button>
                <button
                  type="button"
                  onClick={() => { setShowAddForm(false); setPollingStatus(''); }}
                  disabled={!!pollingStatus}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Forensic Benchmark Audit */}
      <EvaluationPanel domain={activeCaseId} />
    </aside>
  );
}