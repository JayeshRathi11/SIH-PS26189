import React, { useState, useEffect } from 'react';
import { fetchCaseDocuments, submitInvestigatorFeedback, explainPath, getDossierDownloadUrl } from '../api/client';

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
  const [showDocuments, setShowDocuments] = useState(false); // Collapsible Documents Toggle

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
      setFbSuccessMsg(`Status recorded: ${verdict}`);
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
      <div className="detail-inner">
        <div className="eyebrow">Subject Dossier</div>
        <h3>No Entity Selected</h3>
        <div className="role">Click any pin node on the corkboard to inspect its intelligence profile, evidentiary chain, and legal documents.</div>
      </div>
    );
  }

  const dossierUrl = getDossierDownloadUrl(entity.id);

  return (
    <div className="detail-inner">
      {/* Eyebrow & Status Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="eyebrow">Subject Dossier</div>
        {fbVerdict === 'CONFIRMED' && (
          <span className="conf-stamp" style={{ fontSize: '8px' }}>
            ✓ VERIFIED BY OFFICER
          </span>
        )}
        {fbVerdict === 'REJECTED' && (
          <span className="conf-stamp" style={{ fontSize: '8px', color: 'var(--stamp-red)', borderColor: 'var(--stamp-red)', background: 'var(--stamp-red-bg)' }}>
            ✗ REJECTED
          </span>
        )}
      </div>

      {/* Identity Header */}
      <div>
        <h3 style={{ fontSize: '16px', margin: '2px 0 2px' }}>{entity.name}</h3>
        <div className="role">{entity.fullRole || entity.role}</div>
      </div>

      {/* Quick Tactical Action Buttons */}
      <div style={{ display: 'flex', gap: '6px' }}>
        <a
          href={dossierUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="tactical-btn export"
          style={{ flex: 1, justifyContent: 'center', fontSize: '10.5px', padding: '5px 8px' }}
          title="Download Formal Court Evidentiary Dossier (PDF)"
        >
          📄 Court Brief (PDF)
        </a>
        <button
          onClick={handleExplainToHub}
          disabled={xaiLoading}
          className="tactical-btn"
          style={{ flex: 1, justifyContent: 'center', fontSize: '10.5px', padding: '5px 8px' }}
          title="Explain Evidentiary Link Chain to Master Syndicate Hub"
        >
          {xaiLoading ? 'Tracing...' : '🧠 Explain Link'}
        </button>
      </div>

      {/* Explainability (XAI) Output Card */}
      {xaiResult && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--border-strong)', borderLeft: '4px solid var(--tag-amber)', borderRadius: '2px', padding: '10px', fontSize: '11.5px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', fontWeight: 700, fontFamily: 'Space Grotesk, sans-serif' }}>
            <span>🧠 AI Reasoning Chain</span>
            <span
              className="mono"
              style={{
                fontSize: '9.5px',
                color: (xaiResult.paths && xaiResult.paths[0] && xaiResult.paths[0].steps && xaiResult.paths[0].steps.every((s) => (s?.confidence ?? 0.9) >= 0.75))
                  ? 'var(--stamp-green)'
                  : 'var(--tag-amber)'
              }}
            >
              {(xaiResult.paths && xaiResult.paths[0] && xaiResult.paths[0].steps && xaiResult.paths[0].steps.every((s) => (s?.confidence ?? 0.9) >= 0.75))
                ? 'Strong Connection'
                : 'Weak Connection'}
            </span>
          </div>
          <p style={{ margin: '0 0 6px', color: 'var(--ink)', lineHeight: '1.4', fontSize: '11px' }}>
            {xaiResult.summary_conclusion}
          </p>
          {xaiResult.paths && xaiResult.paths.length > 0 && (
            <div style={{ background: 'var(--panel)', border: '1px dashed var(--border)', padding: '5px 7px', borderRadius: '2px', fontFamily: 'IBM Plex Mono, monospace', fontSize: '9.5px', color: 'var(--ink-soft)' }}>
              <b>Chain:</b> {xaiResult.paths[0].nodes.join(' ➔ ')}
            </div>
          )}
        </div>
      )}
      {xaiError && (
        <div style={{ fontSize: '10.5px', color: 'var(--stamp-red)', padding: '5px 8px', border: '1px solid var(--stamp-red)', borderRadius: '2px', background: 'var(--stamp-red-bg)' }}>
          {xaiError}
        </div>
      )}

      {/* Human-in-the-Loop Officer Verification */}
      <div className="officer-verify-box">
        <div className="officer-verify-title">
          👮 Officer Corroboration
        </div>
        <div className="officer-btn-group">
          <button
            onClick={() => handleFeedback('CONFIRMED')}
            disabled={fbLoading}
            className={`officer-btn confirm ${fbVerdict === 'CONFIRMED' ? 'active' : ''}`}
          >
            ✓ Confirm
          </button>
          <button
            onClick={() => handleFeedback('REJECTED')}
            disabled={fbLoading}
            className={`officer-btn reject ${fbVerdict === 'REJECTED' ? 'active' : ''}`}
          >
            ✗ Reject
          </button>
          <button
            onClick={() => handleFeedback('UNCERTAIN')}
            disabled={fbLoading}
            className={`officer-btn flag ${fbVerdict === 'UNCERTAIN' ? 'active' : ''}`}
          >
            ? Flag
          </button>
        </div>
        <input
          type="text"
          placeholder="Corroboration notes (optional)..."
          value={fbNotes}
          onChange={(e) => setFbNotes(e.target.value)}
          className="officer-input"
        />
        {fbSuccessMsg && (
          <div style={{ color: 'var(--stamp-green)', fontSize: '9.5px', marginTop: '4px', fontFamily: 'IBM Plex Mono, monospace' }}>
            {fbSuccessMsg}
          </div>
        )}
      </div>

      {/* Intelligence Metric Rows */}
      <div>
        <div className="stat-row">
          <span className="k">POLE Node Type</span>
          <span className="v">{entity.typeLabel || entity.type}</span>
        </div>
        <div className="stat-row">
          <span className="k">Direct Connections</span>
          <span className="v">{entity.connections}</span>
        </div>
        <div className="stat-row">
          <span className="k">Centrality Index</span>
          <span className="v">
            {typeof entity.centrality === 'number' ? entity.centrality.toFixed(4) : entity.centrality}
          </span>
        </div>
        <div className="stat-row">
          <span className="k">Crime Domains</span>
          <span className="v">{entity.casesInvolved}</span>
        </div>

        {entity.aliases && entity.aliases.length > 0 && (
          <div style={{ marginTop: '8px' }}>
            <span style={{ fontSize: '10.5px', color: 'var(--ink-soft)', display: 'block', marginBottom: '3px' }}>
              Aliases:
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
              {entity.aliases.slice(0, 6).map((al, idx) => (
                <span key={idx} style={{ background: 'var(--paper)', border: '1px solid var(--border)', color: 'var(--ink)', padding: '1px 5px', borderRadius: '2px', fontSize: '9px', fontFamily: 'IBM Plex Mono, monospace' }}>
                  "{al}"
                </span>
              ))}
              {entity.aliases.length > 6 && (
                <span style={{ fontSize: '9px', color: 'var(--ink-muted)', alignSelf: 'center' }}>
                  +{entity.aliases.length - 6} more
                </span>
              )}
            </div>
          </div>
        )}

        {entity.timestamp && (
          <div className="stat-row" style={{ marginTop: '6px' }}>
            <span className="k">Recorded Timestamp</span>
            <span className="v">{formatTimestamp(entity.timestamp)}</span>
          </div>
        )}
      </div>

      {/* Evidence Dossier Card with Tape Strips */}
      <div className="evidence">
        <h4>Why Flagged</h4>
        <p>{entity.evidenceText}</p>
        <div className="src">
          <span>Source: {entity.source || 'Intercept Ingestion'}</span>
          <span className="conf-stamp">DIGITALLY HASHED</span>
        </div>
      </div>

      {/* Optional Collapsible Primary Documents Dropdown */}
      <div style={{ border: '1px solid var(--border)', borderRadius: '3px', background: 'var(--paper)', overflow: 'hidden' }}>
        <button
          type="button"
          onClick={() => setShowDocuments(!showDocuments)}
          style={{
            width: '100%',
            padding: '8px 10px',
            background: 'var(--panel)',
            border: 'none',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '10.5px',
            fontWeight: 600,
            color: 'var(--ink)'
          }}
        >
          <span>📄 Primary Evidence Documents ({documents.length})</span>
          <span>{showDocuments ? '▲ Hide' : '▼ Show'}</span>
        </button>

        {showDocuments && (
          <div style={{ padding: '10px' }}>
            {docLoading && <div style={{ fontSize: '10.5px', color: 'var(--ink-muted)' }}>Loading documents...</div>}
            {docError && <div style={{ fontSize: '10.5px', color: 'var(--stamp-red)' }}>Error loading documents.</div>}
            {!docLoading && !docError && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {documents.length === 0 && <div style={{ fontSize: '11px', color: 'var(--ink-muted)', fontStyle: 'italic' }}>No primary documents attached.</div>}
                {documents.map((doc, idx) => (
                  <div
                    key={idx}
                    className={`doc-item ${selectedDocId === idx ? 'selected' : ''}`}
                    onClick={() => setSelectedDocId(selectedDocId === idx ? null : idx)}
                    style={{ padding: '6px 8px', fontSize: '10.5px' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 600, color: 'var(--ink)' }}>
                        📄 {doc.doc_id || `Doc ${idx + 1}`} ({doc.doc_type || 'FIR'})
                      </div>
                      {doc.sha256_hash && (
                        <span className="mono" style={{ fontSize: '8.5px', color: 'var(--tag-amber)' }}>
                          SHA: {doc.sha256_hash.substring(0, 6)}...
                        </span>
                      )}
                    </div>
                    {selectedDocId === idx && (
                      <div style={{ marginTop: '6px', fontSize: '10px', color: 'var(--ink-soft)', whiteSpace: 'pre-wrap', lineHeight: '1.4', background: 'var(--paper)', padding: '6px', borderRadius: '2px', border: '1px dashed var(--border)' }}>
                        {doc.text}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="detail-footer">
        <span>DIGITAL CUSTODY: ACTIVE</span>
        <span>NCRB-MHA v2.0</span>
      </div>
    </div>
  );
}