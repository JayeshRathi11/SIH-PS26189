import React, { useState, useEffect } from 'react';
import { fetchCaseDocuments, submitInvestigatorFeedback, explainPath, getDossierDownloadUrl } from '../api/client';

function formatTimestamp(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function DetailPanel({ entity, isOpen, activeCaseId, onFeedbackUpdated, onOpenFullProfile }) {
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState(null);
  const [showDocuments, setShowDocuments] = useState(false);

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
        <div style={{ fontSize: '13px', color: 'var(--ink-muted)', textAlign: 'center', padding: '24px 10px' }}>
          Select any node on the board to view intelligence details.
        </div>
      </div>
    );
  }

  const dossierUrl = getDossierDownloadUrl(entity.id);
  const centralityVal = typeof entity.centrality === 'number' ? entity.centrality.toFixed(4) : entity.centrality;

  // Filter distinct aliases that are not identical to the canonical name
  const filteredAliases = (entity.aliases || []).filter(
    (al) => al.toLowerCase() !== (entity.name || '').toLowerCase()
  );

  return (
    <div className="detail-inner" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Identity Card Header */}
      <div style={{ background: 'var(--panel-elevated)', border: '1px solid var(--border)', borderRadius: '6px', padding: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
          <div>
            <h3 style={{ fontSize: '17px', margin: 0, fontFamily: 'Space Grotesk, sans-serif', color: 'var(--ink)', fontWeight: 700 }}>
              {entity.name}
            </h3>
            <div style={{ fontSize: '11px', color: 'var(--ink-soft)', marginTop: '2px' }}>
              {entity.fullRole || entity.role || entity.typeLabel}
            </div>
          </div>
          <span style={{
            fontSize: '9.5px',
            fontFamily: 'IBM Plex Mono, monospace',
            fontWeight: 700,
            padding: '2px 7px',
            borderRadius: '3px',
            background: 'var(--tag-amber-bg)',
            border: '1px solid var(--tag-amber)',
            color: 'var(--tag-amber)',
            whiteSpace: 'nowrap'
          }}>
            {(entity.type || 'PERSON').toUpperCase()}
          </span>
        </div>

        {/* Distinct Aliases */}
        {filteredAliases.length > 0 && (
          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed var(--border)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '10px', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600 }}>
              ALIASES:
            </span>
            {filteredAliases.map((al, idx) => (
              <span key={idx} style={{ background: 'var(--paper)', border: '1px solid var(--border)', color: 'var(--ink)', padding: '1px 6px', borderRadius: '3px', fontSize: '10px', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600 }}>
                "{al}"
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Primary Action: View Full Profile */}
      <button
        onClick={() => onOpenFullProfile && onOpenFullProfile(entity)}
        className="tactical-btn"
        style={{
          width: '100%',
          justifyContent: 'center',
          background: 'var(--stamp-red)',
          color: '#FFF',
          border: 'none',
          padding: '9px 12px',
          borderRadius: '5px',
          fontWeight: 700,
          fontSize: '12px',
          fontFamily: 'IBM Plex Mono, monospace',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(185, 28, 28, 0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        <span>View Full Profile</span>
        <span>➔</span>
      </button>

      {/* Secondary Actions: Court PDF & Explain Link */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <a
          href={dossierUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="tactical-btn export"
          style={{ justifyContent: 'center', fontSize: '11px', padding: '6px 8px', borderRadius: '4px' }}
          title="Download Section 65B Certified Court Brief (PDF)"
        >
          📄 Court Brief (PDF)
        </a>
        <button
          onClick={handleExplainToHub}
          disabled={xaiLoading}
          className="tactical-btn"
          style={{ justifyContent: 'center', fontSize: '11px', padding: '6px 8px', borderRadius: '4px' }}
          title="Trace link chain to master kingpin"
        >
          {xaiLoading ? 'Tracing...' : '🧠 AI Link Path'}
        </button>
      </div>

      {/* Explainability (XAI) Output Card */}
      {xaiResult && (
        <div style={{ background: 'var(--panel-elevated)', border: '1px solid var(--border)', borderLeft: '4px solid var(--stamp-green)', borderRadius: '4px', padding: '10px 12px', fontSize: '11.5px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', fontWeight: 700 }}>
            <span style={{ color: 'var(--stamp-green)', fontFamily: 'Space Grotesk, sans-serif' }}>🧠 Link Path Result</span>
            <span className="mono" style={{ fontSize: '9px', color: 'var(--ink-muted)' }}>
              ({xaiResult.shortest_distance_hops} Hops)
            </span>
          </div>
          <p style={{ margin: '0 0 6px', color: 'var(--ink)', lineHeight: '1.4', fontSize: '11.5px' }}>
            {xaiResult.summary_conclusion}
          </p>
          {xaiResult.paths && xaiResult.paths.length > 0 && (
            <div style={{ background: 'var(--paper)', border: '1px dashed var(--border)', padding: '4px 8px', borderRadius: '3px', fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: 'var(--ink-soft)' }}>
              {xaiResult.paths[0].nodes.join(' ➔ ')}
            </div>
          )}
        </div>
      )}
      {xaiError && (
        <div style={{ fontSize: '11px', color: 'var(--stamp-red)', padding: '6px 10px', border: '1px solid var(--stamp-red)', borderRadius: '4px', background: 'var(--stamp-red-bg)' }}>
          {xaiError}
        </div>
      )}

      {/* 2x2 Intelligence Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div style={{ background: 'var(--panel-elevated)', border: '1px solid var(--border)', padding: '8px 10px', borderRadius: '4px' }}>
          <div style={{ fontSize: '9px', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', fontWeight: 700 }}>
            Centrality Index
          </div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--tag-amber)', fontFamily: 'Space Grotesk, sans-serif', marginTop: '2px' }}>
            {centralityVal}
          </div>
        </div>

        <div style={{ background: 'var(--panel-elevated)', border: '1px solid var(--border)', padding: '8px 10px', borderRadius: '4px' }}>
          <div style={{ fontSize: '9px', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', fontWeight: 700 }}>
            Direct Links
          </div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--stamp-red)', fontFamily: 'Space Grotesk, sans-serif', marginTop: '2px' }}>
            {entity.connections || 0}
          </div>
        </div>

        <div style={{ background: 'var(--panel-elevated)', border: '1px solid var(--border)', padding: '8px 10px', borderRadius: '4px' }}>
          <div style={{ fontSize: '9px', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', fontWeight: 700 }}>
            Cluster
          </div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--stamp-blue)', fontFamily: 'Space Grotesk, sans-serif', marginTop: '2px' }}>
            #{entity.communityCluster || 0}
          </div>
        </div>

        <div style={{ background: 'var(--panel-elevated)', border: '1px solid var(--border)', padding: '8px 10px', borderRadius: '4px' }}>
          <div style={{ fontSize: '9px', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', fontWeight: 700 }}>
            Crime Domains
          </div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--stamp-green)', fontFamily: 'Space Grotesk, sans-serif', marginTop: '2px' }}>
            {entity.casesInvolved || (entity.domains ? entity.domains.length : 1)}
          </div>
        </div>
      </div>

      {/* Human-in-the-Loop Officer Corroboration */}
      <div style={{ background: 'var(--panel-elevated)', border: '1px solid var(--border)', borderRadius: '6px', padding: '12px' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>👮 Officer Verification</span>
          {fbVerdict === 'CONFIRMED' && (
            <span style={{ color: 'var(--stamp-green)', fontWeight: 700 }}>✓ CONFIRMED</span>
          )}
          {fbVerdict === 'REJECTED' && (
            <span style={{ color: 'var(--stamp-red)', fontWeight: 700 }}>✗ REJECTED</span>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '8px' }}>
          <button
            onClick={() => handleFeedback('CONFIRMED')}
            disabled={fbLoading}
            style={{
              padding: '6px 4px',
              fontSize: '11px',
              fontWeight: 700,
              borderRadius: '4px',
              cursor: 'pointer',
              border: fbVerdict === 'CONFIRMED' ? '1px solid var(--stamp-green)' : '1px solid var(--border)',
              background: fbVerdict === 'CONFIRMED' ? 'var(--stamp-green-bg)' : 'var(--paper)',
              color: fbVerdict === 'CONFIRMED' ? 'var(--stamp-green)' : 'var(--ink)'
            }}
          >
            ✓ Confirm
          </button>
          <button
            onClick={() => handleFeedback('REJECTED')}
            disabled={fbLoading}
            style={{
              padding: '6px 4px',
              fontSize: '11px',
              fontWeight: 700,
              borderRadius: '4px',
              cursor: 'pointer',
              border: fbVerdict === 'REJECTED' ? '1px solid var(--stamp-red)' : '1px solid var(--border)',
              background: fbVerdict === 'REJECTED' ? 'var(--stamp-red-bg)' : 'var(--paper)',
              color: fbVerdict === 'REJECTED' ? 'var(--stamp-red)' : 'var(--ink)'
            }}
          >
            ✗ Reject
          </button>
          <button
            onClick={() => handleFeedback('UNCERTAIN')}
            disabled={fbLoading}
            style={{
              padding: '6px 4px',
              fontSize: '11px',
              fontWeight: 700,
              borderRadius: '4px',
              cursor: 'pointer',
              border: fbVerdict === 'UNCERTAIN' ? '1px solid var(--tag-amber)' : '1px solid var(--border)',
              background: fbVerdict === 'UNCERTAIN' ? 'var(--tag-amber-bg)' : 'var(--paper)',
              color: fbVerdict === 'UNCERTAIN' ? 'var(--tag-amber)' : 'var(--ink)'
            }}
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
          style={{ width: '100%', boxSizing: 'border-box', padding: '6px 8px', fontSize: '11px', borderRadius: '4px' }}
        />
        {fbSuccessMsg && (
          <div style={{ color: 'var(--stamp-green)', fontSize: '9.5px', marginTop: '4px', fontFamily: 'IBM Plex Mono, monospace' }}>
            {fbSuccessMsg}
          </div>
        )}
      </div>

      {/* Reason Flagged Intelligence Excerpt */}
      <div style={{ background: 'var(--panel-elevated)', border: '1px solid var(--border)', borderRadius: '6px', padding: '12px' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--tag-amber)', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '4px' }}>
          Intelligence Summary:
        </div>
        <p style={{ margin: 0, fontSize: '12px', lineHeight: '1.5', color: 'var(--ink)' }}>
          {entity.evidenceText || `Subject identified in Case Network.`}
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed var(--border)', fontSize: '10px', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace' }}>
          <span>MHA / NCRB Ingestion</span>
          <span style={{ color: 'var(--stamp-green)', fontWeight: 600 }}>DIGITALLY SEALED</span>
        </div>
      </div>

      {/* Collapsible Primary Documents Dropdown */}
      <div style={{ border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--paper)', overflow: 'hidden' }}>
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
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--ink)'
          }}
        >
          <span>📄 Attached Evidence Files ({documents.length})</span>
          <span>{showDocuments ? '▲' : '▼'}</span>
        </button>

        {showDocuments && (
          <div style={{ padding: '10px' }}>
            {docLoading && <div style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>Loading documents...</div>}
            {docError && <div style={{ fontSize: '11px', color: 'var(--stamp-red)' }}>Error loading documents.</div>}
            {!docLoading && !docError && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {documents.length === 0 && <div style={{ fontSize: '11px', color: 'var(--ink-muted)', fontStyle: 'italic' }}>No primary documents attached.</div>}
                {documents.map((doc, idx) => (
                  <div
                    key={idx}
                    className={`doc-item ${selectedDocId === idx ? 'selected' : ''}`}
                    onClick={() => setSelectedDocId(selectedDocId === idx ? null : idx)}
                    style={{ padding: '6px 8px', fontSize: '11px', cursor: 'pointer' }}
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
                      <div style={{ marginTop: '6px', fontSize: '10.5px', color: 'var(--ink-soft)', whiteSpace: 'pre-wrap', lineHeight: '1.4', background: 'var(--paper)', padding: '6px', borderRadius: '3px', border: '1px dashed var(--border)' }}>
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
    </div>
  );
}