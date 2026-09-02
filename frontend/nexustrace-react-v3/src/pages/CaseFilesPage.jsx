import React, { useState } from 'react';
import EvaluationPanel from '../components/EvaluationPanel';
import { runPipeline } from '../api/client';

export default function CaseFilesPage({
  cases,
  activeCaseId,
  onSelectCase,
  onOpenInBoard,
  onAddCase,
  entities
}) {
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCaseId, setNewCaseId] = useState('');
  const [newCaseTitle, setNewCaseTitle] = useState('');
  const [runningJobId, setRunningJobId] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  // Which case file is currently open. Opening a case selects it as the
  // app's active case too, so `entities` (already fetched for the board)
  // is simply that case's entities -- no second fetch needed.
  const [openedCaseId, setOpenedCaseId] = useState(null);

  const filteredCases = cases.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.caseId.toLowerCase().includes(search.toLowerCase())
  );

  const openedCase = cases.find((c) => c.id === openedCaseId);

  const handleOpenCase = (caseId) => {
    setOpenedCaseId(caseId);
    onSelectCase(caseId);
  };

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

  // ---------------------------------------------------------------------
  // Case detail view -- the merge: a case and its entities are now one
  // screen instead of two ("Case Files" and "Entities Registry" used to
  // be entirely separate pages with no link between them).
  // ---------------------------------------------------------------------
  if (openedCase) {
    return (
      <div className="page-container">
        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: 'var(--ink-muted)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => setOpenedCaseId(null)}
            style={{ background: 'none', border: 'none', color: 'var(--ink-muted)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', padding: 0 }}
          >
            Case Files
          </button>
          <span>&rsaquo;</span>
          <b style={{ color: 'var(--ink)', fontWeight: 600 }}>{openedCase.title}</b>
        </div>

        <div className="page-header-row">
          <div>
            <div className="page-eyebrow">&#9679; {openedCase.caseId}</div>
            <h2 className="page-title">{openedCase.title}</h2>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="tactical-btn"
              onClick={() => handleRunPipeline(openedCase.id, openedCase.title)}
              title="Re-run entity ingestion pipeline"
            >
              &#9889; Re-run ingestion
            </button>
            <button
              className="tactical-btn"
              style={{ background: 'var(--stamp-red)', color: '#FFF', borderColor: 'var(--stamp-red)' }}
              onClick={() => onOpenInBoard(openedCase.id)}
            >
              &#128204; Open on board
            </button>
          </div>
        </div>

        {statusMessage && (
          <div style={{ padding: '8px 14px', background: 'var(--tag-amber-bg)', border: '1px solid var(--tag-amber)', color: 'var(--ink)', borderRadius: '3px', fontSize: '12px', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '16px' }}>
            &#9889; {statusMessage}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '22px' }}>
          <div className="stat-summary-card">
            <div className="stat-summary-title">Entities found</div>
            <div className="stat-summary-value">{entities.length}</div>
          </div>
          <div className="stat-summary-card">
            <div className="stat-summary-title">Verified by officer</div>
            <div className="stat-summary-value" style={{ color: 'var(--stamp-green)' }}>
              {entities.filter((e) => e.verified_by_officer).length}
            </div>
          </div>
          <div className="stat-summary-card">
            <div className="stat-summary-title">Needs review</div>
            <div className="stat-summary-value" style={{ color: 'var(--tag-amber)' }}>
              {entities.filter((e) => !e.verified_by_officer && e.status !== 'REJECTED').length}
            </div>
          </div>
          <div className="stat-summary-card">
            <div className="stat-summary-title">Status</div>
            <div className="stat-summary-value" style={{ fontSize: '15px' }}>{openedCase.tag || 'Active'}</div>
          </div>
        </div>

        <div className="sidebar-section-title" style={{ marginBottom: '10px' }}>Entities in this case</div>
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '4px', overflow: 'hidden', marginBottom: '20px' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: 'var(--paper)', borderBottom: '1px solid var(--border)', fontFamily: 'IBM Plex Mono, monospace', fontSize: '10.5px', color: 'var(--ink-soft)', textTransform: 'uppercase' }}>
                  <th style={{ padding: '10px 14px' }}>Name</th>
                  <th style={{ padding: '10px 14px' }}>Type</th>
                  <th style={{ padding: '10px 14px' }}>Also known as</th>
                  <th style={{ padding: '10px 14px' }}>Links</th>
                  <th style={{ padding: '10px 14px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {entities.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '32px 14px', color: 'var(--ink-muted)' }}>No entities extracted for this case yet.</td></tr>
                ) : (
                  entities.map((entity) => {
                    const isConfirmed = entity.verified_by_officer || entity.status === 'CONFIRMED';
                    const isRejected = entity.status === 'REJECTED';
                    return (
                      <tr key={entity.id} className="entity-row-hover" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 700, fontSize: '13px' }}>{entity.name}</div>
                          <div style={{ fontSize: '10.5px', color: 'var(--ink-muted)', marginTop: '2px' }}>{entity.role}</div>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ fontSize: '10px', fontFamily: 'IBM Plex Mono, monospace', padding: '2px 6px', borderRadius: '2px', background: 'var(--paper)', border: '1px solid var(--border)', textTransform: 'uppercase' }}>
                            {entity.typeLabel || entity.type}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          {entity.aliases && entity.aliases.length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', maxWidth: '220px' }}>
                              {entity.aliases.slice(0, 3).map((al, idx) => (
                                <span key={idx} style={{ background: 'var(--paper)', border: '1px solid var(--border)', padding: '1px 5px', borderRadius: '2px', fontSize: '9.5px', fontFamily: 'IBM Plex Mono, monospace' }}>
                                  &quot;{al}&quot;
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--ink-muted)', fontSize: '11px' }}>&mdash;</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600 }}>{entity.connections}</td>
                        <td style={{ padding: '12px 14px' }}>
                          {isConfirmed && <span className="conf-stamp">&#10003; Verified</span>}
                          {isRejected && <span className="conf-stamp" style={{ color: 'var(--stamp-red)', borderColor: 'var(--stamp-red)', background: 'var(--stamp-red-bg)' }}>&#10007; Rejected</span>}
                          {!isConfirmed && !isRejected && <span className="conf-stamp" style={{ color: 'var(--tag-amber)', borderColor: 'var(--tag-amber)', background: 'var(--tag-amber-bg)' }}>Needs review</span>}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="sidebar-section-title" style={{ marginBottom: '10px' }}>Forensic audit for this case</div>
        <EvaluationPanel domain={openedCase.id} />
      </div>
    );
  }

  // ---------------------------------------------------------------------
  // Catalog view -- the grid of cases, unchanged in spirit from before
  // ---------------------------------------------------------------------
  return (
    <div className="page-container">
      <div className="page-header-row">
        <div>
          <div className="page-eyebrow">&#9679; INVESTIGATION DIRECTORY</div>
          <h2 className="page-title">Case Files</h2>
          <p className="page-subtitle">
            Every case, and the entities found inside it &mdash; open a case to see its people, places and accounts alongside its evidence.
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
          &#9889; {statusMessage}
        </div>
      )}

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

      <div className="case-cards-grid">
        {filteredCases.map((c) => {
          const isGlobal = c.tag === 'Global' || c.id === 'case-all';

          return (
            <div
              key={c.id}
              className="case-catalog-card"
              onClick={() => handleOpenCase(c.id)}
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
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={(e) => { e.stopPropagation(); handleOpenCase(c.id); }}
                >
                  Open case file
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
