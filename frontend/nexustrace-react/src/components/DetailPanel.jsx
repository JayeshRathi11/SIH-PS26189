import React, { useState, useEffect } from 'react';
import { fetchCaseDocuments, submitInvestigatorFeedback, explainPath, getDossierDownloadUrl, downloadDossier } from '../api/client';

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
          <div className="role">Click a pin on the board to view profile, audit trail & evidence.</div>
        </div>
      </aside>
    );
  }

  const dossierUrl = getDossierDownloadUrl(entity.id);

  return (
    <aside className={`detail ${isOpen ? '' : 'collapsed'}`} style={{ overflowY: 'auto' }}>
      <div className="detail-inner" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="eyebrow">Subject Profile</div>
          {fbVerdict === 'CONFIRMED' && (
            <span style={{ background: 'rgba(34, 197, 94, 0.2)', border: '1px solid #22C55E', color: '#86EFAC', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
              ✓ VERIFIED BY OFFICER
            </span>
          )}
          {fbVerdict === 'REJECTED' && (
            <span style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #EF4444', color: '#FCA5A5', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
              ✗ REJECTED
            </span>
          )}
        </div>

        <h3 style={{ margin: '6px 0 2px', fontSize: '1.2rem', color: '#F8FAFC' }}>{entity.name}</h3>
        <div className="role" style={{ fontSize: '0.8rem', color: '#94A3B8', marginBottom: '14px' }}>{entity.fullRole}</div>

        {/* Action Buttons: Export Brief & Explain Path */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button
            type="button"
            onClick={async () => {
              try {
                await downloadDossier(entity.id, entity.name);
              } catch (err) {
                alert(err.message || 'Failed to download court dossier.');
              }
            }}
            style={{
              flex: 1,
              background: '#2563EB',
              color: '#fff',
              padding: '7px 10px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 600,
              textAlign: 'center',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              cursor: 'pointer',
              border: 'none'
            }}
          >
            📄 Legal Brief (PDF)
          </button>
          <button
            onClick={handleExplainToHub}
            disabled={xaiLoading}
            style={{
              flex: 1,
              background: '#475569',
              color: '#fff',
              border: 'none',
              padding: '7px 10px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}
          >
            {xaiLoading ? 'Tracing...' : '🧠 Explain Kingpin Link'}
          </button>
        </div>

        {/* Explainability (XAI) Output Card */}
        {xaiResult && (
          <div style={{ background: '#1E293B', border: '1px solid #3B82F6', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '0.8rem' }}>
            <div style={{ fontWeight: 700, color: '#93C5FD', marginBottom: '4px' }}>
              🧠 AI Evidentiary Reasoning Chain ({xaiResult.shortest_distance_hops} Hops)
            </div>
            <p style={{ margin: '0 0 8px', color: '#E2E8F0', lineHeight: '1.4' }}>
              {xaiResult.summary_conclusion}
            </p>
            {xaiResult.paths && xaiResult.paths.length > 0 && (
              <div style={{ background: '#0F172A', padding: '8px', borderRadius: '4px', fontSize: '0.75rem', color: '#CBD5E1' }}>
                <b>Operational Path:</b> {xaiResult.paths[0].nodes.join(' ➔ ')}
              </div>
            )}
          </div>
        )}
        {xaiError && (
          <div style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid #EF4444', color: '#FCA5A5', padding: '8px', borderRadius: '6px', fontSize: '0.75rem', marginBottom: '14px' }}>
            {xaiError}
          </div>
        )}

        {/* Officer Verification & Human-in-the-Loop Feedback Box */}
        <div style={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#F1F5F9', marginBottom: '8px' }}>
            👮 Human-in-the-Loop Verification
          </div>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
            <button
              onClick={() => handleFeedback('CONFIRMED')}
              disabled={fbLoading}
              style={{
                flex: 1,
                background: fbVerdict === 'CONFIRMED' ? '#16A34A' : 'rgba(34, 197, 94, 0.15)',
                border: '1px solid #22C55E',
                color: '#fff',
                padding: '6px 4px',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              ✓ Confirm
            </button>
            <button
              onClick={() => handleFeedback('REJECTED')}
              disabled={fbLoading}
              style={{
                flex: 1,
                background: fbVerdict === 'REJECTED' ? '#DC2626' : 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #EF4444',
                color: '#fff',
                padding: '6px 4px',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              ✗ Reject
            </button>
            <button
              onClick={() => handleFeedback('UNCERTAIN')}
              disabled={fbLoading}
              style={{
                flex: 1,
                background: fbVerdict === 'UNCERTAIN' ? '#D97706' : 'rgba(245, 158, 11, 0.15)',
                border: '1px solid #F59E0B',
                color: '#fff',
                padding: '6px 4px',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
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
              background: '#0F172A',
              border: '1px solid #334155',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '0.75rem',
              boxSizing: 'border-box'
            }}
          />
          {fbSuccessMsg && (
            <div style={{ color: '#86EFAC', fontSize: '0.7rem', marginTop: '6px' }}>{fbSuccessMsg}</div>
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
            <span style={{ fontSize: '0.75rem', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>Known Aliases:</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {entity.aliases.map((al, idx) => (
                <span key={idx} style={{ background: '#334155', color: '#E2E8F0', padding: '2px 6px', borderRadius: '3px', fontSize: '0.7rem' }}>
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
          {docLoading && <div style={{fontSize: '0.8rem', color: '#888'}}>Loading documents...</div>}
          {docError && <div style={{fontSize: '0.8rem', color: 'red'}}>Error loading documents.</div>}
          {!docLoading && !docError && (
            <div className="doc-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {documents.length === 0 && <div className="doc-empty">No documents found for this case.</div>}
              {documents.map((doc, idx) => (
                <div
                  key={idx}
                  style={{
                    background: '#1E293B',
                    padding: '10px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    border: selectedDocId === idx ? '1px solid #3B82F6' : '1px solid rgba(255,255,255,0.05)'
                  }}
                  onClick={() => setSelectedDocId(selectedDocId === idx ? null : idx)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#F8FAFC' }}>
                      {doc.doc_id || `Document ${idx + 1}`} ({doc.doc_type || 'FIR'})
                    </div>
                    {doc.sha256_hash && (
                      <span style={{ fontSize: '0.65rem', color: '#0284C7', fontFamily: 'monospace' }}>
                        SHA: {doc.sha256_hash.substring(0, 8)}...
                      </span>
                    )}
                  </div>
                  {selectedDocId === idx && (
                    <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#94A3B8', whiteSpace: 'pre-wrap', lineHeight: '1.4', background: '#0F172A', padding: '8px', borderRadius: '4px' }}>
                      {doc.text}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="detail-footer" style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748B' }}>
        <span>DIGITAL CUSTODY: ACTIVE</span>
        <span>NCRB-MHA v2.0</span>
      </div>
    </aside>
  );
}