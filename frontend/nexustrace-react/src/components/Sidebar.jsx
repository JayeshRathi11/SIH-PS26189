import React, { useState, useEffect, useRef } from 'react';
import CaseFolder from './CaseFolder';
import EvaluationPanel from './EvaluationPanel';
import { runPipeline } from '../api/client';

export default function Sidebar({ cases, activeCaseId, onSelectCase, onReorderCases, onAddCase, isOpen }) {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
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

    setPollingStatus('Starting pipeline...');
    try {
      // For a truly new case, we'd use the raw fetch, but since we are mapping cases to domains:
      // We will assume runPipeline supports it or we just use raw fetch for custom ones.
      // Actually, since client.js enforces CASE_TO_DOMAIN_MAP, we must use runPipeline.
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
            onClick={() => setActiveFilter(f)}
          >
            {f}
          </span>
        ))}
      </div>

      <h2 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: '16px' }}>
        Open Cases
        <button onClick={handleRunActivePipeline} disabled={!!pollingStatus} style={{ fontSize: '0.7rem', padding: '4px 8px', background: 'var(--accent, #646cff)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Run Pipeline
        </button>
      </h2>
      {pollingStatus && <div style={{ padding: '0 16px 12px', fontSize: '0.8rem', color: '#ff9800' }}>{pollingStatus}</div>}
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
            <div className="add-case-form-actions">
              <button type="submit" disabled={!!pollingStatus}>Create</button>
              <button type="button" onClick={() => { setShowAddForm(false); setPollingStatus(''); }} disabled={!!pollingStatus}>
                Cancel
              </button>
            </div>
            {pollingStatus && <div style={{ marginTop: '10px', fontSize: '0.85rem', color: '#888' }}>{pollingStatus}</div>}
          </form>
        )}
      </div>

      <EvaluationPanel domain={activeCaseId} />
    </aside>
  );
}