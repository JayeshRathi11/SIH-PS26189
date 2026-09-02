import React, { useState } from 'react';
import EvaluationPanel from '../components/EvaluationPanel';
import { runPipeline } from '../api/client';

export default function CaseFilesPage({
  cases,
  activeCaseId,
  onSelectCase,
  onOpenInBoard,
  onAddCase
}) {
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCaseId, setNewCaseId] = useState('');
  const [newCaseTitle, setNewCaseTitle] = useState('');
  const [runningJobId, setRunningJobId] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');

  const filteredCases = cases.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.caseId.toLowerCase().includes(search.toLowerCase())
  );

  const handleRunPipeline = async (caseId, title) => {
    setStatusMessage(`Triggering intelligence ingestion for ${title}...`);
    try {
      const res = await runPipeline(caseId);
      setRunningJobId(res.job_id);
      setStatusMessage(`Ingestion pipeline active (Job ID: ${res.job_id})`);
    } catch (err) {
      setStatusMessage(`Error: ${err.message}`);
    }
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!newCaseId.trim() || !newCaseTitle.trim()) return;
    const newCase = {
      id: newCaseId.trim(),
      caseId: newCaseId.trim(),
      title: newCaseTitle.trim(),
      entities: 0,
      links: 0,
      tag: 'New'
    };
    onAddCase(newCase);
    setNewCaseId('');
    setNewCaseTitle('');
    setShowAddForm(false);
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header-row">
        <div>
          <div className="page-eyebrow">● INVESTIGATION DIRECTORY</div>
          <h2 className="page-title">Case Files & Ingestion Hub</h2>
          <p className="page-subtitle">
            Manage multi-jurisdictional crime vertical dossiers, trigger entity extraction pipelines, and inspect forensic benchmarks.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search cases by ID or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-box"
            style={{ width: '280px' }}
          />
          <button
            className="tactical-btn"
            onClick={() => setShowAddForm(!showAddForm)}
            style={{ background: 'var(--tag-amber)', color: 'var(--on-amber)', borderColor: 'var(--tag-amber)' }}
          >
            + Add New Case File
          </button>
        </div>
      </div>

      {statusMessage && (
        <div style={{ padding: '8px 14px', background: 'var(--tag-amber-bg)', border: '1px solid var(--tag-amber)', color: 'var(--ink)', borderRadius: '3px', fontSize: '12px', fontFamily: 'IBM Plex Mono, monospace' }}>
          ⚡ {statusMessage}
        </div>
      )}

      {/* Add New Case Form Modal / Inline Box */}
      {showAddForm && (
        <form onSubmit={handleAddSubmit} className="add-case-form" style={{ maxWidth: '600px', margin: '0 0 16px' }}>
          <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--ink)' }}>Register New Case Investigation</div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              placeholder="Case ID (e.g. RC0322026A0099)"
              value={newCaseId}
              onChange={(e) => setNewCaseId(e.target.value)}
              style={{ flex: 1 }}
              required
            />
            <input
              placeholder="Investigation Title"
              value={newCaseTitle}
              onChange={(e) => setNewCaseTitle(e.target.value)}
              style={{ flex: 2 }}
              required
            />
          </div>
          <div className="add-case-form-actions">
            <button type="submit">Create Case File</button>
            <button type="button" onClick={() => setShowAddForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {/* Main Content Layout: Grid of Cases + Benchmark Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', alignItems: 'start' }}>
        {/* Cases Grid */}
        <div className="case-cards-grid">
          {filteredCases.map((c) => {
            const isGlobal = c.tag === 'Global' || c.id === 'case-all';
            const isActive = c.id === activeCaseId;

            return (
              <div
                key={c.id}
                className={`case-catalog-card ${isActive ? 'active' : ''}`}
                onClick={() => onSelectCase(c.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span className="case-code">{c.caseId}</span>
                  <span className={`ftag ${isGlobal ? 'global' : ''}`}>{c.tag || 'Active'}</span>
                </div>

                <div className="case-catalog-title">{c.title}</div>

                <div className="case-catalog-stats">
                  <span><b>Entities:</b> {c.entities}</span>
                  <span><b>Links:</b> {c.links}</span>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button
                    className="tactical-btn"
                    style={{ flex: 1, justifyContent: 'center', background: 'var(--stamp-red)', color: '#FFF', borderColor: 'var(--stamp-red)' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenInBoard(c.id);
                    }}
                  >
                    📌 Open on Board
                  </button>
                  <button
                    className="tactical-btn"
                    style={{ justifyContent: 'center' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRunPipeline(c.id, c.title);
                    }}
                    title="Re-run entity ingestion pipeline"
                  >
                    ⚡ Ingest
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Forensic Evaluation Sidebar */}
        <div>
          <div className="sidebar-section-title" style={{ marginBottom: '12px' }}>
            Active Case Forensic Audit
          </div>
          <EvaluationPanel domain={activeCaseId} />

          <div style={{ marginTop: '16px', padding: '14px', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: '3px' }}>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: '6px' }}>
              Digital Chain of Custody
            </div>
            <p style={{ fontSize: '11.5px', color: 'var(--ink)', lineHeight: '1.45', margin: 0 }}>
              All entity relationships undergo deterministic deduplication, Aadhaar/PAN PII redaction, and SHA-256 digital custody hashing in accordance with NCRB intelligence ingestion protocols.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
