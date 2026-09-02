import React, { useState, useEffect } from 'react';
import { fetchCaseDocuments, getDossierDownloadUrl } from '../api/client';

export default function DossiersPage({
  cases,
  activeCaseId,
  onSelectCase,
  entities
}) {
  const [selectedEntityId, setSelectedEntityId] = useState('ENT_HUB_IQBAL_ANSARI');
  const [documents, setDocuments] = useState([]);
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState(null);
  const [expandedDocIdx, setExpandedDocIdx] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const loadDocs = async () => {
      setDocLoading(true);
      setDocError(null);
      try {
        const docs = await fetchCaseDocuments(activeCaseId);
        if (isMounted) setDocuments(docs);
      } catch (err) {
        if (isMounted) setDocError(err.message);
      } finally {
        if (isMounted) setDocLoading(false);
      }
    };
    loadDocs();
    return () => { isMounted = false; };
  }, [activeCaseId]);

  const targetEntity = entities.find(e => e.id === selectedEntityId) || {
    id: 'ENT_HUB_IQBAL_ANSARI',
    name: 'Iqbal Ansari',
    role: 'Syndicate Kingpin / Master Controller',
    centrality: 0.9221
  };

  const dossierPdfUrl = getDossierDownloadUrl(selectedEntityId);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header-row">
        <div>
          <div className="page-eyebrow">● EVIDENTIARY AUDIT & COURT BRIEFS</div>
          <h2 className="page-title">Court Evidentiary Dossiers & Documents</h2>
          <p className="page-subtitle">
            Generate formal Section 65B Indian Evidence Act compliant PDF prosecution dossiers and audit primary source FIRs with SHA-256 custody seals.
          </p>
        </div>

        {/* Case Selector */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', fontFamily: 'IBM Plex Mono, monospace', color: 'var(--ink-soft)' }}>
            Domain:
          </span>
          <select
            value={activeCaseId}
            onChange={(e) => onSelectCase(e.target.value)}
            className="search-box"
            style={{ padding: '6px 10px', fontSize: '12px' }}
          >
            {cases.map(c => (
              <option key={c.id} value={c.id}>
                {c.caseId} — {c.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid: Left = PDF Generator, Right = Primary Source Documents Table */}
      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Court Dossier Generator Card */}
        <div className="dossier-card">
          <div className="dossier-seal-badge">
            🏛️ SECTION 65B COMPLIANT
          </div>

          <h3 style={{ margin: '10px 0 4px', fontSize: '17px', fontFamily: 'Space Grotesk, sans-serif' }}>
            Prosecution Brief Generator
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--ink-soft)', lineHeight: '1.45', margin: '0 0 16px' }}>
            Generates a signed, cryptographically hashed PDF intelligence dossier including subject aliases, cross-domain link matrices, and AI evidentiary reasoning.
          </p>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontFamily: 'IBM Plex Mono, monospace', color: 'var(--ink-soft)', marginBottom: '4px' }}>
              Select Accused / Suspect:
            </label>
            <select
              value={selectedEntityId}
              onChange={(e) => setSelectedEntityId(e.target.value)}
              className="search-box"
              style={{ width: '100%', padding: '8px 10px' }}
            >
              <option value="ENT_HUB_IQBAL_ANSARI">★ Iqbal Ansari (Master Syndicate Controller)</option>
              {entities.filter(e => e.id !== 'ENT_HUB_IQBAL_ANSARI').map(e => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.typeLabel || e.type}) — Centrality: {typeof e.centrality === 'number' ? e.centrality.toFixed(2) : e.centrality}
                </option>
              ))}
            </select>
          </div>

          {/* Subject Preview Card */}
          <div style={{ background: 'var(--panel)', border: '1px dashed var(--border)', borderRadius: '3px', padding: '12px', marginBottom: '16px' }}>
            <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--ink)' }}>{targetEntity.name}</div>
            <div style={{ fontSize: '11.5px', color: 'var(--ink-soft)', marginTop: '2px' }}>{targetEntity.role}</div>
            <div style={{ fontSize: '10.5px', color: 'var(--tag-amber)', fontFamily: 'IBM Plex Mono, monospace', marginTop: '6px' }}>
              CENTRALITY INDEX: {typeof targetEntity.centrality === 'number' ? targetEntity.centrality.toFixed(4) : targetEntity.centrality}
            </div>
          </div>

          <a
            href={dossierPdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="tactical-btn export"
            style={{ width: '100%', justifyContent: 'center', padding: '10px 14px', fontSize: '12.5px' }}
          >
            📄 Download Formal Court Dossier (PDF)
          </a>
        </div>

        {/* Primary Documents Index & Hash Table */}
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '3px', padding: '18px' }}>
          <div className="sidebar-section-title" style={{ marginBottom: '12px' }}>
            Primary Evidence Documents & Intercepts ({documents.length})
          </div>

          {docLoading && <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>Loading documents repository...</div>}
          {docError && <div style={{ fontSize: '12px', color: 'var(--stamp-red)' }}>Error: {docError}</div>}

          {!docLoading && !docError && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {documents.length === 0 && (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--ink-muted)' }}>
                  No source documents indexed for this vertical.
                </div>
              )}

              {documents.map((doc, idx) => (
                <div
                  key={idx}
                  className="doc-table-row"
                  onClick={() => setExpandedDocIdx(expandedDocIdx === idx ? null : idx)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px' }}>📄</span>
                      <span style={{ fontWeight: 700, fontSize: '12.5px', color: 'var(--ink)' }}>
                        {doc.doc_id || `DOCUMENT_${idx + 1}`}
                      </span>
                      <span style={{ fontSize: '10px', background: 'var(--paper)', border: '1px solid var(--border)', padding: '1px 5px', borderRadius: '2px', fontFamily: 'IBM Plex Mono, monospace' }}>
                        {doc.doc_type || 'FIR'}
                      </span>
                    </div>

                    {doc.sha256_hash && (
                      <span className="mono" style={{ fontSize: '10px', color: 'var(--tag-amber)', background: 'var(--tag-amber-bg)', padding: '2px 6px', borderRadius: '2px' }}>
                        SHA-256: {doc.sha256_hash.substring(0, 16)}...
                      </span>
                    )}
                  </div>

                  {expandedDocIdx === idx && (
                    <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed var(--border)', fontSize: '11.5px', color: 'var(--ink-soft)', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                      {doc.text}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
