import React, { useState, useRef } from 'react';
import EvaluationPanel from '../components/EvaluationPanel';
import {
  runPipeline,
  uploadCaseDocuments,
  pollPipelineJob,
  archiveCaseRecord,
  deleteCaseRecord,
  updateCaseStatus
} from '../api/client';

const STATUS_OPTIONS = ['New', 'Active', 'Under Review', 'Closed'];

// Slug used to color-code a status badge/select -- e.g. 'Under Review' -> 'status-under-review'.
function statusSlug(tag) {
  return 'status-' + String(tag || 'active').trim().toLowerCase().replace(/\s+/g, '-');
}

export default function CaseFilesPage({
  cases,
  activeCaseId,
  onSelectCase,
  onOpenInBoard,
  onAddCase,
  onCaseUpdated,
  onCaseRemoved,
  onRefreshCases,
  onRefreshGraph,
  entities
}) {
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCaseId, setNewCaseId] = useState('');
  const [newCaseTitle, setNewCaseTitle] = useState('');
  const [newCaseFiles, setNewCaseFiles] = useState([]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Which case file is currently open. Opening a case selects it as the
  // app's active case too, so `entities` (already fetched for the board)
  // is simply that case's entities -- no second fetch needed.
  const [openedCaseId, setOpenedCaseId] = useState(null);

  // Opened-case action state
  const [showEvidenceForm, setShowEvidenceForm] = useState(false);
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [addingEvidence, setAddingEvidence] = useState(false);
  const [evidenceError, setEvidenceError] = useState('');
  const [evidenceMessage, setEvidenceMessage] = useState('');
  const [caseActionBusy, setCaseActionBusy] = useState(false);
  const [caseActionError, setCaseActionError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const filteredCases = cases.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.caseId.toLowerCase().includes(search.toLowerCase())
  );

  const openedCase = cases.find((c) => c.id === openedCaseId);
  const isGlobalCase = (c) => !c || c.id === 'case-all' || c.tag === 'Global';

  const handleOpenCase = (caseId) => {
    setOpenedCaseId(caseId);
    onSelectCase(caseId);
    setShowEvidenceForm(false);
    setEvidenceFiles([]);
    setEvidenceError('');
    setEvidenceMessage('');
    setCaseActionError('');
    setConfirmDelete(false);
  };

  const handleRunPipeline = async (caseId, title) => {
    setStatusMessage(`Triggering intelligence ingestion for ${title}...`);
    try {
      const res = await runPipeline(caseId);
      setStatusMessage(`Ingestion pipeline active (Job ID: ${res.job_id})`);
    } catch (err) {
      setStatusMessage(`Error: ${err.message}`);
    }
  };

  const handleRefreshCases = async () => {
    if (!onRefreshCases) return;
    setRefreshing(true);
    setStatusMessage('');
    try {
      const rows = await onRefreshCases();
      setStatusMessage(`Case list refreshed from the database -- ${rows ? rows.length : cases.length} case(s) on file.`);
    } catch (err) {
      setStatusMessage(`Could not refresh case list: ${err.message}`);
    } finally {
      setRefreshing(false);
    }
  };

  // ---- "+ Add New Case" form: real document upload, not just a name ----
  const handleFilesPicked = (fileList) => {
    setNewCaseFiles((prev) => [...prev, ...Array.from(fileList)]);
  };
  const removeNewCaseFile = (idx) => {
    setNewCaseFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  // Dropzone actually accepts drag-and-drop now -- previously the div was
  // styled and labeled like a dropzone (folder icon, "drop" framing) but
  // only wired up click-to-browse. Dragging a file onto it silently did
  // nothing, which is a very easy way to end up submitting with an empty
  // file list and hitting the "source document is required" error despite
  // having "added" a file from the user's point of view.
  const [dragActiveNewCase, setDragActiveNewCase] = useState(false);
  // Explicit ref + .click() instead of relying solely on <label htmlFor>
  // forwarding -- label-forwarding is standard and normally fine, but this
  // dropzone also carries onDragOver/onDragLeave/onDrop handlers, and
  // reports of needing to "spam click" to get the OS file dialog to open
  // are consistent with occasional lost label-forwarding in that combo.
  // An explicit ref click is the strictly more reliable pattern.
  const newCaseFileInputRef = useRef(null);
  const handleNewCaseDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActiveNewCase(false);
    if (e.dataTransfer?.files?.length) handleFilesPicked(e.dataTransfer.files);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setCreateError('');
    const id = newCaseId.trim();
    const title = newCaseTitle.trim();
    if (!id || !title) {
      setCreateError('Case ID and title are both required.');
      return;
    }
    if (newCaseFiles.length === 0) {
      setCreateError('At least one source document (.txt, .docx or .pdf) is required — without one there is nothing for the pipeline to extract entities from.');
      return;
    }

    setCreating(true);
    try {
      // 1) Persist the case "folder" itself in the shared case registry.
      // Backend's CaseCreateRequest types entities/links as Optional[str]
      // (they're display LABELS -- case-all's is "10 Domains", not a count)
      // -- sending the bare numbers 0/0 here fails Pydantic validation with
      // an HTTP 422 the moment you try to create any new case, which is
      // almost certainly why "+ Add New Case" looked completely broken.
      const saved = await onAddCase({
        id,
        caseId: id,
        title,
        entities: '0',
        links: '0',
        tag: 'New'
      });
      const savedId = saved?.id || id;

      // 2) Upload the source documents and kick off live extraction.
      const job = await uploadCaseDocuments(savedId, newCaseFiles);
      setStatusMessage(`Extracting entities from ${newCaseFiles.length} document(s)... (Job ${job.job_id})`);

      setNewCaseId('');
      setNewCaseTitle('');
      setNewCaseFiles([]);
      setShowAddForm(false);
      handleOpenCase(savedId);

      try {
        const finished = await pollPipelineJob(job.job_id, { timeoutMs: 300000 });
        if (finished.status === 'COMPLETED') {
          setStatusMessage(`Case created — ${finished.total_entities ?? 0} entities and ${finished.total_relationships ?? 0} relationships extracted.`);
          if (onRefreshGraph) onRefreshGraph();
        } else {
          setStatusMessage(`Extraction failed: ${finished.error_message || 'unknown error'}`);
        }
      } catch (pollErr) {
        // Still running server-side -- the background task isn't cancelled
        // just because we stopped polling. Don't report this as a failure.
        setStatusMessage('Still extracting in the background (this can take a few minutes for larger documents) — use Refresh above in a bit to see it land.');
      }
    } catch (err) {
      setCreateError(err.message || 'Failed to create case.');
    } finally {
      setCreating(false);
    }
  };

  // ---- add new evidence to an already-open case & re-run incrementally ----
  const handleEvidenceFilesPicked = (fileList) => {
    setEvidenceFiles((prev) => [...prev, ...Array.from(fileList)]);
  };
  const removeEvidenceFile = (idx) => {
    setEvidenceFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const [dragActiveEvidence, setDragActiveEvidence] = useState(false);
  const evidenceFileInputRef = useRef(null);
  const handleEvidenceDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActiveEvidence(false);
    if (e.dataTransfer?.files?.length) handleEvidenceFilesPicked(e.dataTransfer.files);
  };

  const handleAddEvidence = async (e) => {
    e.preventDefault();
    if (!openedCase) return;
    if (evidenceFiles.length === 0) {
      setEvidenceError('Pick at least one new document to ingest.');
      return;
    }
    setAddingEvidence(true);
    setEvidenceError('');
    setEvidenceMessage('');
    try {
      const job = await uploadCaseDocuments(openedCase.id, evidenceFiles);
      setEvidenceMessage(`Ingesting ${evidenceFiles.length} new document(s) into this case... (Job ${job.job_id})`);
      setEvidenceFiles([]);
      try {
        const finished = await pollPipelineJob(job.job_id, { timeoutMs: 300000 });
        if (finished.status === 'COMPLETED') {
          setEvidenceMessage(`Done — this case now has ${finished.total_entities ?? 0} entities and ${finished.total_relationships ?? 0} relationships (existing evidence merged with the new documents).`);
          setShowEvidenceForm(false);
          if (onRefreshGraph) onRefreshGraph();
        } else {
          setEvidenceError(`Extraction failed: ${finished.error_message || 'unknown error'}`);
        }
      } catch (pollErr) {
        setEvidenceMessage('Still ingesting in the background (large batches can take a few minutes) — reopen this case in a bit to see the new evidence merged in.');
        setShowEvidenceForm(false);
      }
    } catch (err) {
      setEvidenceError(err.message || 'Failed to add evidence.');
    } finally {
      setAddingEvidence(false);
    }
  };

  // ---- archive / status change / delete for the opened case ----
  const handleToggleArchive = async () => {
    if (!openedCase || isGlobalCase(openedCase)) return;
    setCaseActionBusy(true);
    setCaseActionError('');
    try {
      const nextArchived = !openedCase.archived;
      const updated = await archiveCaseRecord(openedCase.id, nextArchived);
      onCaseUpdated(openedCase.id, updated);
    } catch (err) {
      setCaseActionError(err.message || 'Failed to update case.');
    } finally {
      setCaseActionBusy(false);
    }
  };

  const handleStatusChange = async (newTag) => {
    if (!openedCase || isGlobalCase(openedCase) || newTag === openedCase.tag) return;
    setCaseActionBusy(true);
    setCaseActionError('');
    try {
      const updated = await updateCaseStatus(openedCase.id, newTag);
      onCaseUpdated(openedCase.id, updated);
    } catch (err) {
      setCaseActionError(err.message || 'Failed to change status.');
    } finally {
      setCaseActionBusy(false);
    }
  };

  const handleDeleteCase = async () => {
    if (!openedCase || isGlobalCase(openedCase)) return;
    setCaseActionBusy(true);
    setCaseActionError('');
    try {
      await deleteCaseRecord(openedCase.id);
      onCaseRemoved(openedCase.id);
      setOpenedCaseId(null);
      setConfirmDelete(false);
    } catch (err) {
      setCaseActionError(err.message || 'Failed to delete case.');
    } finally {
      setCaseActionBusy(false);
    }
  };

  // ---------------------------------------------------------------------
  // Case detail view -- a case and its entities are one screen.
  // ---------------------------------------------------------------------
  if (openedCase) {
    const global = isGlobalCase(openedCase);
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
            {openedCase.archived && (
              <div style={{ marginTop: '4px', fontSize: '10.5px', color: 'var(--tag-amber)', fontFamily: 'IBM Plex Mono, monospace' }}>
                &#128451; Archived — hidden from active investigations by default.
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {!global && (
              <select
                value={openedCase.tag || 'Active'}
                disabled={caseActionBusy}
                onChange={(e) => handleStatusChange(e.target.value)}
                className={`add-case-input status-select ${statusSlug(openedCase.tag)}`}
                style={{ width: 'auto', padding: '7px 10px' }}
                title="Change case status"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            )}
            <button
              className="tactical-btn"
              onClick={() => setShowEvidenceForm((v) => !v)}
              title="Upload new documents about this case and re-run extraction, keeping what's already been resolved"
            >
              &#128206; Add evidence
            </button>
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
            {!global && (
              <button
                className="tactical-btn"
                disabled={caseActionBusy}
                onClick={handleToggleArchive}
                title={openedCase.archived ? 'Restore this case to the active list' : 'Archive this case (soft-hide, fully reversible)'}
              >
                {openedCase.archived ? '↩ Restore' : '\u{1F5C4}️ Archive'}
              </button>
            )}
            {!global && (
              <span
                title="Archiving only removes a case from the active list. No evidence, entity, relationship, or document is ever destroyed -- everything stays intact and every change is permanently recorded in the audit log."
                style={{ fontSize: '10px', fontFamily: 'IBM Plex Mono, monospace', color: 'var(--ink-muted)', display: 'flex', alignItems: 'center', paddingLeft: '2px' }}
              >
                &#9432; nothing is ever destroyed
              </span>
            )}
            {/* Hard "Delete" intentionally removed from the UI: evidence-handling
                software should never present an action that reads as destructive.
                Archive (above) already covers the real need -- reversibly removing
                a case from the active list -- and, same as Delete used to, never
                touches the underlying entities/relationships/documents either way.
                handleDeleteCase/deleteCaseRecord are left in place (unused) rather
                than deleted, in case a genuinely-permanent admin cleanup path is
                ever needed later behind a proper confirmation flow. */}
          </div>
        </div>

        {caseActionError && (
          <div style={{ padding: '8px 14px', background: 'var(--stamp-red-bg)', border: '1px solid var(--stamp-red)', color: 'var(--stamp-red)', borderRadius: '3px', fontSize: '12px', marginBottom: '16px' }}>
            &#9888;&#65039; {caseActionError}
          </div>
        )}

        {statusMessage && (
          <div style={{ padding: '8px 14px', background: 'var(--tag-amber-bg)', border: '1px solid var(--tag-amber)', color: 'var(--ink)', borderRadius: '3px', fontSize: '12px', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '16px' }}>
            &#9889; {statusMessage}
          </div>
        )}

        {showEvidenceForm && (
          <form onSubmit={handleAddEvidence} className="add-case-form" style={{ maxWidth: '600px', marginBottom: '20px' }}>
            <div className="add-case-form-title">Add new evidence to this case</div>
            <p style={{ margin: '-6px 0 0', fontSize: '10.5px', color: 'var(--ink-muted)' }}>
              Found a new FIR, statement, or record about this case? Upload it here — it's merged into the entities
              and relationships already resolved for <b>{openedCase.title}</b>, not a fresh start.
            </p>

            <div
              className="add-case-dropzone"
              role="button"
              tabIndex={0}
              aria-label="Click or drag files to choose them"
              onClick={() => evidenceFileInputRef.current?.click()}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); evidenceFileInputRef.current?.click(); } }}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragActiveEvidence(true); }}
              onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragActiveEvidence(false); }}
              onDrop={handleEvidenceDrop}
              style={dragActiveEvidence ? { borderColor: 'var(--tag-amber)', background: 'var(--paper)' } : undefined}
            >
              <span className="add-case-dropzone-icon">&#128193;</span>
              <span className="add-case-dropzone-text">
                <strong>{evidenceFiles.length > 0 ? `${evidenceFiles.length} file(s) selected` : 'Click or drag files to choose them'}</strong>
                <span>.txt, .docx, .pdf — multiple files allowed</span>
              </span>
            </div>
            <input
              ref={evidenceFileInputRef}
              type="file"
              multiple
              accept=".txt,.docx,.pdf"
              style={{ display: 'none' }}
              onChange={(e) => { handleEvidenceFilesPicked(e.target.files); e.target.value = ''; }}
            />

            {evidenceFiles.length > 0 && (
              <div className="add-case-file-list">
                {evidenceFiles.map((f, idx) => (
                  <span key={`${f.name}-${idx}`} className="add-case-file-chip">
                    {f.name} &nbsp;
                    <span style={{ cursor: 'pointer', color: 'var(--stamp-red)' }} onClick={() => removeEvidenceFile(idx)}>&#10005;</span>
                  </span>
                ))}
              </div>
            )}

            {evidenceError && (
              <div style={{ fontSize: '11px', color: 'var(--stamp-red)' }}>{evidenceError}</div>
            )}
            {evidenceMessage && (
              <div style={{ fontSize: '11px', color: 'var(--stamp-green)' }}>{evidenceMessage}</div>
            )}

            <div className="add-case-form-actions">
              <button type="submit" className="add-case-submit-btn" disabled={addingEvidence}>
                {addingEvidence ? 'Ingesting…' : 'Ingest new evidence'}
              </button>
              <button type="button" className="add-case-cancel-btn" disabled={addingEvidence} onClick={() => setShowEvidenceForm(false)}>
                Cancel
              </button>
            </div>
          </form>
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
            <div className="stat-summary-value" style={{ fontSize: '15px' }}>
              <span className={`ftag ${statusSlug(openedCase.tag)}`} style={{ fontSize: '12px', padding: '3px 8px' }}>
                {openedCase.tag || 'Active'}
              </span>
            </div>
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
  // Catalog view -- the grid of cases
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
            onClick={handleRefreshCases}
            disabled={refreshing}
            title="Re-fetch the case list from the database — use this if a case you just created doesn't seem to be here"
          >
            {refreshing ? '⟳ Refreshing…' : '⟳ Refresh'}
          </button>
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
        <div style={{ padding: '8px 14px', background: 'var(--tag-amber-bg)', border: '1px solid var(--tag-amber)', color: 'var(--ink)', borderRadius: '3px', fontSize: '12px', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '16px' }}>
          &#9889; {statusMessage}
        </div>
      )}

      {showAddForm && (
        <form onSubmit={handleAddSubmit} className="add-case-form" style={{ maxWidth: '600px', margin: '0 0 16px' }}>
          <div className="add-case-form-title">Register New Case Investigation</div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              className="add-case-input"
              placeholder="Case ID (e.g. RC0322026A0099)"
              value={newCaseId}
              onChange={(e) => setNewCaseId(e.target.value)}
              style={{ flex: 1 }}
              required
            />
            <input
              className="add-case-input"
              placeholder="Investigation Title"
              value={newCaseTitle}
              onChange={(e) => setNewCaseTitle(e.target.value)}
              style={{ flex: 2 }}
              required
            />
          </div>

          <div
            className="add-case-dropzone"
            role="button"
            tabIndex={0}
            aria-label="Click or drag files to upload source documents"
            onClick={() => newCaseFileInputRef.current?.click()}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); newCaseFileInputRef.current?.click(); } }}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragActiveNewCase(true); }}
            onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragActiveNewCase(false); }}
            onDrop={handleNewCaseDrop}
            style={dragActiveNewCase ? { borderColor: 'var(--tag-amber)', background: 'var(--paper)' } : undefined}
          >
            <span className="add-case-dropzone-icon">&#128193;</span>
            <span className="add-case-dropzone-text">
              <strong>{newCaseFiles.length > 0 ? `${newCaseFiles.length} file(s) selected` : 'Click or drag files to upload source documents'}</strong>
              <span>.txt, .docx, .pdf — the FIR / statements this case is built from</span>
            </span>
          </div>
          <input
            ref={newCaseFileInputRef}
            type="file"
            multiple
            accept=".txt,.docx,.pdf"
            style={{ display: 'none' }}
            onChange={(e) => { handleFilesPicked(e.target.files); e.target.value = ''; }}
          />

          {newCaseFiles.length > 0 && (
            <div className="add-case-file-list">
              {newCaseFiles.map((f, idx) => (
                <span key={`${f.name}-${idx}`} className="add-case-file-chip">
                  {f.name} &nbsp;
                  <span style={{ cursor: 'pointer', color: 'var(--stamp-red)' }} onClick={() => removeNewCaseFile(idx)}>&#10005;</span>
                </span>
              ))}
            </div>
          )}

          {createError && (
            <div style={{ fontSize: '11px', color: 'var(--stamp-red)' }}>{createError}</div>
          )}

          <div className="add-case-form-actions">
            <button type="submit" className="add-case-submit-btn" disabled={creating}>
              {creating ? 'Creating…' : 'Create Case File'}
            </button>
            <button type="button" className="add-case-cancel-btn" disabled={creating} onClick={() => setShowAddForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="case-cards-grid">
        {filteredCases.map((c) => {
          const isGlobal = isGlobalCase(c);

          return (
            <div
              key={c.id}
              className="case-catalog-card"
              onClick={() => handleOpenCase(c.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span className="case-code">{c.caseId}</span>
                <span className={`ftag ${isGlobal ? 'global' : statusSlug(c.tag)}`}>{c.tag || 'Active'}</span>
              </div>

              <div className="case-catalog-title">
                {c.title}
                {c.archived && (
                  <span style={{ marginLeft: '6px', fontSize: '9.5px', color: 'var(--tag-amber)', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700 }}>
                    ARCHIVED
                  </span>
                )}
              </div>

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
