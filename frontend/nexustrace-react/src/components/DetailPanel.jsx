import React, { useState, useEffect } from 'react';
import { fetchCaseDocuments, submitInvestigatorFeedback, explainPath, downloadDossier } from '../api/client';

function formatTimestamp(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function DetailPanel({ entity, isOpen, activeCaseId, onFeedbackUpdated }) {
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState(null);

  // Feedback State
  const [fbVerdict, setFbVerdict] = useState(null);
  const [fbNotes, setFbNotes] = useState('');
  const [fbLoading, setFbLoading] = useState(false);
  const [fbSuccessMsg, setFbSuccessMsg] = useState('');

  // Explainability (XAI) State
  const [xaiResult, setXaiResult] = useState(null);
  const [xaiLoading, setXaiLoading] = useState(false);
  const [xaiError, setXaiError] = useState(null);

  useEffect(() => {
    setSelectedDocId(null);
    setFbVerdict(entity?.verified_by_officer ? 'CONFIRMED' : (entity?.status === 'REJECTED' ? 'REJECTED' : null));
    setFbNotes('');
    setFbSuccessMsg('');
    setXaiResult(null);
    setXaiError(null);
  }, [entity?.id]);

  useEffect(() => {
    if (!activeCaseId) {
      setDocuments([]);
      return;
    }
    let isMounted = true;
    const loadDocs = async () => {
      setDocLoading(true);
      setDocError(null);
      try {
        const docs = await fetchCaseDocuments(activeCaseId);
        if (isMounted) setDocuments(docs);
      } catch(err) {
        if (isMounted) setDocError(err.message);
      } finally {
        if (isMounted) setDocLoading(false);
      }
    };
    loadDocs();
    return () => { isMounted = false; };
  }, [activeCaseId]);

  const handleFeedback = async (verdict) => {
    if (!entity) return;
    setFbLoading(true);
    setFbSuccessMsg('');
    try {
      await submitInvestigatorFeedback({
        target_type: 'ENTITY',
        target_id: entity.id,
        verdict: verdict,
        officer_notes: fbNotes || `Marked as ${verdict} by investigator.`
      });
      setFbVerdict(verdict);
      setFbSuccessMsg(`Verification recorded: ${verdict}`);
      if (onFeedbackUpdated) onFeedbackUpdated(entity.id, verdict);
    } catch (err) {
      alert(`Error submitting feedback: ${err.message}`);
    } finally {
      setFbLoading(false);
    }
  };

  const handleExplainToHub = async () => {
    if (!entity) return;
    setXaiLoading(true);
    setXaiError(null);
    try {
      const res = await explainPath(entity.name || entity.id, 'Iqbal Ansari');
      setXaiResult(res);
    } catch (err) {
      setXaiError(err.message);
    } finally {
      setXaiLoading(false);
    }
  };

  if (!entity) {
    return (
      <aside className={`detail ${isOpen ? '' : 'collapsed'}`}>
        <div className="detail-inner">
          <div className="eyebrow">Selected Entity</div>
          <h3>No entity selected</h3>
          <div className="role">Click a pin on the board to view profile, audit trail &amp; evidence.</div>
        </div>
      </aside>
    );
  }

  return (
    <aside className={`detail ${isOpen ? '' : 'collapsed'}`}>
      <div className="detail-inner" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="eyebrow">Subject Profile</div>
          {fbVerdict === 'CONFIRMED' && (
            <span className="badge badge-success">&#10003; VERIFIED BY OFFICER</span>
          )}
          {fbVerdict === 'REJECTED' && (
            <span className="badge badge-danger">&#10007; REJECTED</span>
          )}
        </div>

        <h3 style={{ margin: '6px 0 2px', fontSize: '1.2rem' }}>{entity.name}</h3>
        <div className="role" style={{ fontSize: '0.8rem', marginBottom: '14px' }}>{entity.fullRole}</div>

        {/* Action Buttons: Export Brief & Explain Path */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button
            type="button"
            className="btn btn-info"
            onClick={async () => {
              try {
                await downloadDossier(entity.id, entity.name);
              } catch (err) {
                alert(err.message || 'Failed to download court dossier.');
              }
            }}
            style={{ flex: 1, padding: '7px 10px', fontSize: '0.75rem', fontWeight: 600 }}
          >
            <span aria-hidden="true">📄</span> Legal Brief (PDF)
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleExplainToHub}
            disabled={xaiLoading}
            style={{ flex: 1, padding: '7px 10px', fontSize: '0.75rem', fontWeight: 600 }}
          >
            {xaiLoading ? 'Tracing...' : (<><span aria-hidden="true">🧠</span> Explain Kingpin Link</>)}
          </button>
        </div>

        {/* Explainability (XAI) Output Card */}
        {xaiResult && (
          <div className="card-raised" style={{ borderColor: 'var(--info)', marginBottom: '16px', fontSize: '0.8rem' }}>
            <div style={{ fontWeight: 700, color: 'var(--info)', marginBottom: '4px' }}>
              <span aria-hidden="true">🧠</span> AI Evidentiary Reasoning Chain ({xaiResult.shortest_distance_hops} Hops)
            </div>
            <p style={{ margin: '0 0 8px', color: 'var(--ink)', lineHeight: '1.4' }}>
              {xaiResult.summary_conclusion}
            </p>
            {xaiResult.paths && xaiResult.paths.length > 0 && (
              <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', padding: '8px', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: 'var(--ink-soft)' }}>
                <b style={{ color: 'var(--ink)' }}>Operational Path:</b> {xaiResult.paths[0].nodes.join(' ➔ ')}
              </div>
            )}
          </div>
        )}
        {xaiError && (
          <div style={{ background: 'var(--danger-soft)', border: '1px solid var(--stamp-red)', color: 'var(--stamp-red)', padding: '8px', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', marginBottom: '14px' }}>
            {xaiError}
          </div>
        )}

        {/* Officer Verification & Human-in-the-Loop Feedback Box */}
        <div className="card-raised" style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px' }}>
            <span aria-hidden="true">👮</span> Human-in-the-Loop Verification
          </div>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
            <button
              type="button"
              className={`btn btn-success${fbVerdict === 'CONFIRMED' ? ' is-active' : ''}`}
              onClick={() => handleFeedback('CONFIRMED')}
              disabled={fbLoading}
              style={{ flex: 1, padding: '6px 4px', fontSize: '0.75rem', fontWeight: 600 }}
            >
              &#10003; Confirm
            </button>
            <button
              type="button"
              className={`btn btn-danger${fbVerdict === 'REJECTED' ? ' is-active' : ''}`}
              onClick={() => handleFeedback('REJECTED')}
              disabled={fbLoading}
              style={{ flex: 1, padding: '6px 4px', fontSize: '0.75rem', fontWeight: 600 }}
            >
              &#10007; Reject
            </button>
            <button
              type="button"
              className={`btn btn-warning${fbVerdict === 'UNCERTAIN' ? ' is-active' : ''}`}
              onClick={() => handleFeedback('UNCERTAIN')}
              disabled={fbLoading}
              style={{ flex: 1, padding: '6px 4px', fontSize: '0.75rem', fontWeight: 600 }}
            >
              ? Flag
            </button>
          </div>
          <input
            type="text"
            placeholder="Officer corroboration notes (optional)..."
            value={fbNotes}
            onChange={(e) => setFbNotes(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 8px',
              background: 'var(--paper)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--ink)',
              fontSize: '0.75rem',
              boxSizing: 'border-box'
            }}
          />
          {fbSuccessMsg && (
            <div style={{ color: 'var(--stamp-green)', fontSize: '0.7rem', marginTop: '6px' }}>{fbSuccessMsg}</div>
          )}
        </div>

        {/* Node Stats */}
        <div className="stat-row">
          <span className="k">Node type</span>
          <span className="v">{entity.typeLabel || entity.type}</span>
        </div>
        <div className="stat-row">
          <span className="k">Direct connections</span>
          <span className="v">{entity.connections}</span>
        </div>
        <div className="stat-row">
          <span className="k">Centrality score</span>
          <span className="v">{typeof entity.centrality === 'number' ? entity.centrality.toFixed(4) : entity.centrality}</span>
        </div>
        <div className="stat-row">
          <span className="k">Cases involved</span>
          <span className="v">{entity.casesInvolved}</span>
        </div>

        {entity.aliases && entity.aliases.length > 0 && (
          <div style={{ marginTop: '10px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--ink-soft)', display: 'block', marginBottom: '4px' }}>Known Aliases:</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {entity.aliases.map((al, idx) => (
                <span key={idx} className="badge">
                  "{al}"
                </span>
              ))}
            </div>
          </div>
        )}

        {entity.timestamp && (
          <div className="stat-row" style={{ marginTop: '10px' }}>
            <span className="k">Recorded on</span>
            <span className="v">{formatTimestamp(entity.timestamp)}</span>
          </div>
        )}

        <div className="evidence" style={{ marginTop: '16px' }}>
          <h4>Why this connection is flagged</h4>
          <p>{entity.evidenceText}</p>
          <div className="src">
            <span>Source: {entity.source || 'Investigative Intercept'}</span>
            <span className="conf-stamp">Digitally Hashed</span>
          </div>
        </div>

        {/* Evidence Documents Accordion */}
        <div className="documents" style={{ marginTop: '16px' }}>
          <h4>Source Evidence (FIR / Intercepts)</h4>
          {docLoading && <div style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>Loading documents...</div>}
          {docError && <div style={{ fontSize: '0.8rem', color: 'var(--stamp-red)' }}>Error loading documents.</div>}
          {!docLoading && !docError && (
            <div className="doc-list">
              {documents.length === 0 && <div className="doc-empty">No documents found for this case.</div>}
              {documents.map((doc, idx) => (
                <div
                  key={idx}
                  className={`doc-item${selectedDocId === idx ? ' selected' : ''}`}
                  onClick={() => setSelectedDocId(selectedDocId === idx ? null : idx)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>
                      {doc.doc_id || `Document ${idx + 1}`} ({doc.doc_type || 'FIR'})
                    </div>
                    {doc.sha256_hash && (
                      <span style={{ fontSize: '0.65rem', color: 'var(--info)', fontFamily: 'monospace' }}>
                        SHA: {doc.sha256_hash.substring(0, 8)}...
                      </span>
                    )}
                  </div>
                  {selectedDocId === idx && (
                    <div style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--ink-soft)', whiteSpace: 'pre-wrap', lineHeight: '1.4', background: 'var(--paper)', border: '1px solid var(--border)', padding: '8px', borderRadius: 'var(--radius-sm)' }}>
                      {doc.text}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="detail-footer">
        <span>DIGITAL CUSTODY: ACTIVE</span>
        <span>NCRB-MHA v2.0</span>
      </div>
    </aside>
  );
}
