import React, { useState, useEffect, useRef } from 'react';
import EvaluationPanel from '../components/EvaluationPanel';
import { runPipeline, uploadCaseDocuments, fetchJobStatus } from '../api/client';

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
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [rawTextInput, setRawTextInput] = useState('');
  const [runningJobId, setRunningJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [openedCaseId, setOpenedCaseId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef(null);

  // Poll running job
  useEffect(() => {
    if (!runningJobId) return;

    const interval = setInterval(async () => {
      try {
        const status = await fetchJobStatus(runningJobId);
        setJobStatus(status);
        if (status.status === 'COMPLETED') {
          setStatusMessage(`✓ Extraction Pipeline Complete: ${status.total_entities || 0} entities, ${status.total_relationships || 0} links resolved!`);
          setRunningJobId(null);
          setIsSubmitting(false);
        } else if (status.status === 'FAILED') {
          setStatusMessage(`❌ Pipeline Failed: ${status.error_message || 'Unknown error'}`);
          setRunningJobId(null);
          setIsSubmitting(false);
        } else {
          setStatusMessage(`⚡ Processing documents through AI extraction & POLE resolution pipeline (Status: ${status.status})...`);
        }
      } catch (err) {
        console.warn('Job status poll error:', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [runningJobId]);

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
      setStatusMessage(`Ingestion pipeline active (Job ID: ${res.job_id})...`);
    } catch (err) {
      setStatusMessage(`Error: ${err.message}`);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!newCaseId.trim() || !newCaseTitle.trim()) return;

    setIsSubmitting(true);
    setStatusMessage(`Registering case "${newCaseTitle}" and launching extraction pipeline...`);

    const domainKey = newCaseId.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');

    try {
      if (selectedFiles.length > 0) {
        // Upload real files through pipeline/upload
        const jobRes = await uploadCaseDocuments(domainKey, selectedFiles);
        setRunningJobId(jobRes.job_id);
        setStatusMessage(`Ingesting ${selectedFiles.length} case files (Job ID: ${jobRes.job_id})...`);
      } else {
        // Create standard case record
        const newCase = {
          id: domainKey,
          caseId: newCaseId.trim(),
          title: newCaseTitle.trim(),
          entities: 0,
          links: 0,
          tag: 'Active'
        };
        await onAddCase(newCase);
        setStatusMessage(`✓ Case "${newCaseTitle}" registered successfully.`);
        setIsSubmitting(false);
      }

      setNewCaseId('');
      setNewCaseTitle('');
      setSelectedFiles([]);
      setRawTextInput('');
      setShowAddForm(false);
    } catch (err) {
      setStatusMessage(`Error creating case: ${err.message}`);
      setIsSubmitting(false);
    }
  };

  if (openedCase) {
    return (
      <div className="page-container" style={{ padding: '24px', overflowY: 'auto', height: '100vh', boxSizing: 'border-box' }}>
        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: 'var(--ink-muted)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => setOpenedCaseId(null)}
            style={{ background: 'none', border: 'none', color: 'var(--tag-amber)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', padding: 0, fontWeight: 700 }}
          >
            ← Back to Case Files
          </button>
          <span>&rsaquo;</span>
          <b style={{ color: 'var(--ink)', fontWeight: 600 }}>{openedCase.title}</b>
        </div>

        <div className="page-header-row" style={{ marginBottom: '18px' }}>
          <div>
            <div className="page-eyebrow" style={{ color: 'var(--tag-amber)', fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace' }}>
              ● {openedCase.caseId}
            </div>
            <h2 className="page-title" style={{ margin: '4px 0', fontSize: '22px', fontFamily: 'Space Grotesk, sans-serif' }}>{openedCase.title}</h2>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="tactical-btn"
              onClick={() => handleRunPipeline(openedCase.id, openedCase.title)}
              title="Re-run entity ingestion pipeline"
              style={{ background: 'var(--panel-elevated)', border: '1px solid var(--border)' }}
            >
              ⚡ Re-run Pipeline
            </button>
            <button
              className="tactical-btn"
              style={{ background: 'var(--stamp-red)', color: '#FFF', borderColor: 'var(--stamp-red)', fontWeight: 700 }}
              onClick={() => onOpenInBoard(openedCase.id)}
            >
              📌 Open on Case Board
            </button>
          </div>
        </div>

        {statusMessage && (
          <div style={{ padding: '10px 14px', background: 'var(--tag-amber-bg)', border: '1px solid var(--tag-amber)', color: 'var(--ink)', borderRadius: '4px', fontSize: '12px', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {runningJobId && <span style={{ animation: 'spin 1s linear infinite' }}>⚙️</span>}
            <span>{statusMessage}</span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '22px' }}>
          <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '6px', padding: '14px' }}>
            <div style={{ fontSize: '10px', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', fontWeight: 700 }}>Entities Identified</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--ink)', marginTop: '4px', fontFamily: 'Space Grotesk, sans-serif' }}>{entities.length}</div>
          </div>
          <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '6px', padding: '14px' }}>
            <div style={{ fontSize: '10px', color: 'var(--stamp-green)', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', fontWeight: 700 }}>Verified by Officer</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--stamp-green)', marginTop: '4px', fontFamily: 'Space Grotesk, sans-serif' }}>
              {entities.filter((e) => e.verified_by_officer).length}
            </div>
          </div>
          <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '6px', padding: '14px' }}>
            <div style={{ fontSize: '10px', color: 'var(--tag-amber)', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', fontWeight: 700 }}>Needs Corroboration</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--tag-amber)', marginTop: '4px', fontFamily: 'Space Grotesk, sans-serif' }}>
              {entities.filter((e) => !e.verified_by_officer && e.status !== 'REJECTED').length}
            </div>
          </div>
          <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '6px', padding: '14px' }}>
            <div style={{ fontSize: '10px', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', fontWeight: 700 }}>Investigation Status</div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--stamp-blue)', marginTop: '8px', fontFamily: 'IBM Plex Mono, monospace' }}>{openedCase.tag || 'Active'}</div>
          </div>
        </div>

        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-muted)', textTransform: 'uppercase', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.06em', marginBottom: '10px' }}>
          Entities Ingested in this Investigation:
        </div>
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden', marginBottom: '24px' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: 'var(--paper)', borderBottom: '1px solid var(--border)', fontFamily: 'IBM Plex Mono, monospace', fontSize: '10.5px', color: 'var(--ink-soft)', textTransform: 'uppercase' }}>
                  <th style={{ padding: '10px 14px' }}>Name</th>
                  <th style={{ padding: '10px 14px' }}>Type</th>
                  <th style={{ padding: '10px 14px' }}>Aliases</th>
                  <th style={{ padding: '10px 14px' }}>Links</th>
                  <th style={{ padding: '10px 14px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {entities.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '32px 14px', color: 'var(--ink-muted)' }}>No entities extracted for this case yet. Click 'Re-run Pipeline' to process.</td></tr>
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
                          {isConfirmed && <span className="conf-stamp" style={{ fontSize: '9px' }}>✓ Verified</span>}
                          {isRejected && <span className="conf-stamp" style={{ color: 'var(--stamp-red)', borderColor: 'var(--stamp-red)', background: 'var(--stamp-red-bg)', fontSize: '9px' }}>✗ Rejected</span>}
                          {!isConfirmed && !isRejected && <span className="conf-stamp" style={{ color: 'var(--tag-amber)', borderColor: 'var(--tag-amber)', background: 'var(--tag-amber-bg)', fontSize: '9px' }}>Needs review</span>}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-muted)', textTransform: 'uppercase', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.06em', marginBottom: '10px' }}>
          Forensic Benchmark & Ground Truth Audit:
        </div>
        <EvaluationPanel domain={openedCase.id} />
      </div>
    );
  }

  return (
    <div className="page-container" style={{ padding: '24px', overflowY: 'auto', height: '100vh', boxSizing: 'border-box' }}>
      <div className="page-header-row" style={{ marginBottom: '20px' }}>
        <div>
          <div className="page-eyebrow" style={{ color: 'var(--stamp-blue)', fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace' }}>
            📂 INVESTIGATION DIRECTORY & PIPELINE
          </div>
          <h2 className="page-title" style={{ margin: '4px 0', fontSize: '22px', fontFamily: 'Space Grotesk, sans-serif' }}>Case Files & Ingestion Hub</h2>
          <p className="page-subtitle" style={{ margin: 0, color: 'var(--ink-muted)', fontSize: '12.5px' }}>
            Ingest and manage investigative case records. Upload primary source FIRs, transcripts, and wiretaps for automated AI entity extraction and network synthesis.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="🔍 Search case files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-box"
            style={{ width: '260px', padding: '7px 12px', borderRadius: '4px' }}
          />
          <button
            className="tactical-btn"
            onClick={() => setShowAddForm(!showAddForm)}
            style={{ background: 'var(--tag-amber)', color: '#FFF', borderColor: 'var(--tag-amber)', fontWeight: 700 }}
          >
            + Ingest New Case File
          </button>
        </div>
      </div>

      {statusMessage && (
        <div style={{ padding: '10px 14px', background: 'var(--tag-amber-bg)', border: '1px solid var(--tag-amber)', color: 'var(--ink)', borderRadius: '4px', fontSize: '12px', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {runningJobId && <span style={{ animation: 'spin 1s linear infinite' }}>⚙️</span>}
          <span>{statusMessage}</span>
        </div>
      )}

      {showAddForm && (
        <form
          onSubmit={handleAddSubmit}
          style={{
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderLeft: '4px solid var(--tag-amber)',
            borderRadius: '6px',
            padding: '20px',
            marginBottom: '24px',
            boxShadow: 'var(--shadow-node)'
          }}
        >
          <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--ink)', fontFamily: 'Space Grotesk, sans-serif', marginBottom: '4px' }}>
            Register New Investigation & Ingest Evidence
          </div>
          <p style={{ margin: '0 0 14px 0', fontSize: '12px', color: 'var(--ink-muted)' }}>
            Provide case details and upload source documents (.pdf, .docx, .txt) for automated LLM extraction, POLE schema mapping, and entity resolution.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace', color: 'var(--ink-soft)', marginBottom: '4px' }}>
                CASE / FIR NUMBER:
              </label>
              <input
                placeholder="e.g. FIR-11-FINANCIAL"
                value={newCaseId}
                onChange={(e) => setNewCaseId(e.target.value)}
                className="search-box"
                style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: '4px' }}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace', color: 'var(--ink-soft)', marginBottom: '4px' }}>
                INVESTIGATION TITLE:
              </label>
              <input
                placeholder="e.g. 11: International Gold Smuggling Syndicate"
                value={newCaseTitle}
                onChange={(e) => setNewCaseTitle(e.target.value)}
                className="search-box"
                style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: '4px' }}
                required
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace', color: 'var(--ink-soft)', marginBottom: '4px' }}>
              ATTACH SOURCE EVIDENCE DOCUMENTS (.PDF, .DOCX, .TXT):
            </label>
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept=".pdf,.docx,.txt"
              onChange={handleFileChange}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px dashed var(--border-strong)',
                borderRadius: '4px',
                background: 'var(--paper)',
                boxSizing: 'border-box',
                fontSize: '12px'
              }}
            />
            {selectedFiles.length > 0 && (
              <div style={{ fontSize: '11px', color: 'var(--stamp-green)', marginTop: '4px', fontFamily: 'IBM Plex Mono, monospace' }}>
                ✓ {selectedFiles.length} document(s) queued for pipeline processing
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="submit"
              disabled={isSubmitting}
              className="tactical-btn"
              style={{ background: 'var(--stamp-red)', color: '#FFF', borderColor: 'var(--stamp-red)', padding: '8px 16px', fontWeight: 700 }}
            >
              {isSubmitting ? '⚙️ Ingesting & Running Pipeline...' : '🚀 Ingest Case & Run Pipeline'}
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="tactical-btn"
              style={{ background: 'var(--panel-elevated)', border: '1px solid var(--border)' }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
        {filteredCases.map((c) => {
          const isGlobal = c.tag === 'Global' || c.id === 'case-all';

          return (
            <div
              key={c.id}
              onClick={() => handleOpenCase(c.id)}
              style={{
                background: 'var(--panel)',
                border: '1px solid var(--border)',
                borderTop: isGlobal ? '3px solid var(--tag-amber)' : '3px solid var(--stamp-blue)',
                borderRadius: '6px',
                padding: '16px 18px',
                boxShadow: 'var(--shadow-node)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, color: 'var(--ink)' }}>{c.caseId}</span>
                <span style={{
                  fontSize: '9.5px',
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: '3px',
                  background: isGlobal ? 'var(--tag-amber-bg)' : 'var(--stamp-blue-bg)',
                  border: isGlobal ? '1px solid var(--tag-amber)' : '1px solid var(--stamp-blue)',
                  color: isGlobal ? 'var(--tag-amber)' : 'var(--stamp-blue)'
                }}>
                  {c.tag || 'Active'}
                </span>
              </div>

              <div style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'Space Grotesk, sans-serif', color: 'var(--ink)', marginBottom: '10px' }}>
                {c.title}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--ink-muted)', marginBottom: '14px', background: 'var(--paper)', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                <span><b>Entities:</b> {c.entities}</span>
                <span><b>Links:</b> {c.links}</span>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="tactical-btn"
                  style={{ flex: 1, justifyContent: 'center', fontSize: '11px', padding: '6px 10px' }}
                  onClick={(e) => { e.stopPropagation(); handleOpenCase(c.id); }}
                >
                  Inspect Case Details ➔
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
