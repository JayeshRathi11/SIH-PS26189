import React, { useState, useEffect } from 'react';
import { getDossierDownloadUrl, fetchCaseDocuments, explainPath } from '../api/client';

export default function EntityJanamKundliModal({ entity, isOpen, onClose, allEntities = [], allThreads = [], onOpenInPathfinder }) {
  if (!isOpen || !entity) return null;

  const [activeTab, setActiveTab] = useState('profile');
  const [documents, setDocuments] = useState([]);
  const [docLoading, setDocLoading] = useState(false);
  const [pathResult, setPathResult] = useState(null);
  const [pathLoading, setPathLoading] = useState(false);

  // Compute direct connections from allThreads
  const connections = allThreads.filter(
    (t) => t[0] === entity.id || t[1] === entity.id
  ).map((t) => {
    const isSource = t[0] === entity.id;
    const partnerId = isSource ? t[1] : t[0];
    const partner = allEntities.find((e) => e.id === partnerId) || { id: partnerId, name: partnerId, type: 'person' };
    return {
      partner,
      direction: isSource ? 'outgoing' : 'incoming',
      relationshipType: t[3] || 'ASSOCIATE_OF',
      domain: t[4] || 'General',
      isStrong: t[2],
      confidence: t[7] || 0.9
    };
  });

  useEffect(() => {
    let isMounted = true;
    const loadDocs = async () => {
      setDocLoading(true);
      try {
        const docs = await fetchCaseDocuments('case-all');
        if (isMounted) {
          // Filter documents mentioning entity name or aliases
          const names = [entity.name, ...(entity.aliases || [])].map((n) => n.toLowerCase());
          const matching = docs.filter((d) => names.some((n) => (d.text || '').toLowerCase().includes(n)));
          setDocuments(matching.length > 0 ? matching : docs.slice(0, 5));
        }
      } catch (err) {
        console.warn('Doc load error:', err);
      } finally {
        if (isMounted) setDocLoading(false);
      }
    };
    loadDocs();
    return () => { isMounted = false; };
  }, [entity.id]);

  const handleTraceToHub = async () => {
    setPathLoading(true);
    try {
      const res = await explainPath(entity.name, 'Iqbal Ansari', 6);
      setPathResult(res);
    } catch (err) {
      console.warn('Path trace error:', err);
    } finally {
      setPathLoading(false);
    }
  };

  const dossierPdfUrl = getDossierDownloadUrl(entity.id);
  const centralityScore = typeof entity.centrality === 'number' ? entity.centrality.toFixed(4) : entity.centrality;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="tactical-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '90vw',
          maxWidth: '860px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          borderRadius: '8px',
          overflow: 'hidden',
          background: 'var(--panel)',
          border: '1px solid var(--border-strong)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
        }}
      >
        {/* Modal Top Banner */}
        <div style={{
          background: 'var(--panel-elevated)',
          borderBottom: '1px solid var(--border)',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '8px',
              background: entity.type === 'person' ? 'var(--tag-amber)' : 'var(--stamp-blue)',
              color: '#FFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '18px',
              fontFamily: 'Space Grotesk, sans-serif'
            }}>
              {(entity.name || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ margin: 0, fontSize: '20px', fontFamily: 'Space Grotesk, sans-serif', color: 'var(--ink)' }}>
                  {entity.name}
                </h2>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  fontFamily: 'IBM Plex Mono, monospace',
                  padding: '2px 8px',
                  borderRadius: '3px',
                  background: 'var(--tag-amber-bg)',
                  border: '1px solid var(--tag-amber)',
                  color: 'var(--tag-amber)'
                }}>
                  {entity.typeLabel || (entity.type || 'PERSON').toUpperCase()}
                </span>
                {entity.verified_by_officer && (
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    fontFamily: 'IBM Plex Mono, monospace',
                    padding: '2px 8px',
                    borderRadius: '3px',
                    background: 'var(--stamp-green-bg)',
                    border: '1px solid var(--stamp-green)',
                    color: 'var(--stamp-green)'
                  }}>
                    ✓ VERIFIED OFFICER RECORD
                  </span>
                )}
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '2px' }}>
                Complete Intelligence Profile & Cross-Domain Record &bull; Subject ID: <code>{entity.id}</code>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--ink-muted)',
              fontSize: '22px',
              cursor: 'pointer',
              padding: '4px 8px',
              lineHeight: 1
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '10px 24px',
          background: 'var(--panel)',
          borderBottom: '1px solid var(--border)'
        }}>
          {[
            { id: 'profile', label: '📋 Summary & Aliases' },
            { id: 'network', label: `👥 Associates & Network (${connections.length})` },
            { id: 'evidence', label: `📄 Primary Intercepts & FIRs (${documents.length})` },
            { id: 'xai', label: '🧭 Kingpin Link Analysis' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '6px 14px',
                fontSize: '11.5px',
                fontFamily: 'IBM Plex Mono, monospace',
                fontWeight: activeTab === tab.id ? 700 : 500,
                background: activeTab === tab.id ? 'var(--paper)' : 'transparent',
                color: activeTab === tab.id ? 'var(--tag-amber)' : 'var(--ink-muted)',
                border: activeTab === tab.id ? '1px solid var(--tag-amber)' : '1px solid transparent',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Body Content */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {/* TAB 1: Profile & Aliases */}
          {activeTab === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Key Metrics Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', padding: '12px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase' }}>Centrality Index</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--tag-amber)', marginTop: '2px', fontFamily: 'Space Grotesk, sans-serif' }}>
                    {centralityScore}
                  </div>
                </div>
                <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', padding: '12px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase' }}>Direct Associates</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--stamp-red)', marginTop: '2px', fontFamily: 'Space Grotesk, sans-serif' }}>
                    {connections.length}
                  </div>
                </div>
                <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', padding: '12px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase' }}>Syndicate Cluster</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--stamp-blue)', marginTop: '2px', fontFamily: 'Space Grotesk, sans-serif' }}>
                    #{entity.communityCluster || 0}
                  </div>
                </div>
                <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', padding: '12px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase' }}>Crime Verticals</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--stamp-green)', marginTop: '2px', fontFamily: 'Space Grotesk, sans-serif' }}>
                    {entity.domains?.length || 1}
                  </div>
                </div>
              </div>

              {/* Known Aliases & Monikers */}
              <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', padding: '16px', borderRadius: '6px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '8px' }}>
                  Known Street Aliases & Code-Names:
                </div>
                {entity.aliases && entity.aliases.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {entity.aliases.map((al, idx) => (
                      <span
                        key={idx}
                        style={{
                          background: 'var(--tag-amber-bg)',
                          border: '1px solid var(--tag-amber)',
                          color: 'var(--tag-amber)',
                          padding: '4px 10px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 600,
                          fontFamily: 'IBM Plex Mono, monospace'
                        }}
                      >
                        "{al}"
                      </span>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: 'var(--ink-muted)', fontSize: '12px', fontStyle: 'italic' }}>No known aliases recorded. Operates under direct identity.</div>
                )}
              </div>

              {/* Operational Crime Verticals */}
              <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', padding: '16px', borderRadius: '6px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '8px' }}>
                  Operational Crime Verticals:
                </div>
                {entity.domains && entity.domains.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {entity.domains.map((dom, idx) => (
                      <span
                        key={idx}
                        style={{
                          background: 'var(--panel)',
                          border: '1px solid var(--border)',
                          color: 'var(--ink)',
                          padding: '4px 10px',
                          borderRadius: '4px',
                          fontSize: '11.5px',
                          fontWeight: 600
                        }}
                      >
                        🚨 {dom.replace(/^\d+_/, '').replace(/_/g, ' ').toUpperCase()}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: 'var(--ink-muted)', fontSize: '12px' }}>General Syndicate Network</div>
                )}
              </div>

              {/* Intelligence Summary Text */}
              <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderLeft: '4px solid var(--tag-amber)', padding: '16px', borderRadius: '6px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--tag-amber)', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '6px' }}>
                  Intelligence Brief & Modus Operandi:
                </div>
                <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.6', color: 'var(--ink)' }}>
                  {entity.evidenceText || `${entity.name} is recorded as an active operative within the syndicate network, coordinating actions across multiple cross-domain channels.`}
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: Associates & Network */}
          {activeTab === 'network' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '11px', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '4px' }}>
                Directly linked co-conspirators, financial conduits, vehicles, and intercepted telephony lines:
              </div>
              {connections.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--ink-muted)' }}>No direct associates logged in current case graph.</div>
              ) : (
                connections.map((c, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'var(--paper)',
                      border: '1px solid var(--border)',
                      borderLeft: `4px solid ${c.isStrong ? 'var(--stamp-green)' : 'var(--tag-amber)'}`,
                      padding: '12px 16px',
                      borderRadius: '6px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{c.partner.name}</span>
                        <span style={{ fontSize: '9.5px', fontFamily: 'IBM Plex Mono, monospace', color: 'var(--ink-muted)', background: 'var(--panel)', padding: '1px 5px', borderRadius: '2px', border: '1px solid var(--border)' }}>
                          {(c.partner.type || 'PERSON').toUpperCase()}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '2px' }}>
                        Relation: <strong style={{ color: 'var(--tag-amber)' }}>{c.relationshipType}</strong> &bull; Domain: <em>{c.domain}</em>
                      </div>
                    </div>
                    <span style={{
                      fontSize: '10px',
                      fontFamily: 'IBM Plex Mono, monospace',
                      fontWeight: 700,
                      color: c.isStrong ? 'var(--stamp-green)' : 'var(--tag-amber)',
                      background: c.isStrong ? 'var(--stamp-green-bg)' : 'var(--tag-amber-bg)',
                      padding: '3px 8px',
                      borderRadius: '3px',
                      border: `1px solid ${c.isStrong ? 'var(--stamp-green)' : 'var(--tag-amber)'}`
                    }}>
                      {c.isStrong ? 'STRONG LINK' : 'EVIDENTIARY LINK'}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: Primary Evidence & FIR Excerpts */}
          {activeTab === 'evidence' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '11px', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '4px' }}>
                Primary FIR documents, wiretap transcripts, and surveillance logs referencing {entity.name}:
              </div>
              {docLoading && <div style={{ textAlign: 'center', padding: '30px', color: 'var(--ink-muted)' }}>Loading documents...</div>}
              {!docLoading && documents.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--ink-muted)' }}>No primary documents mentioning this entity.</div>
              )}
              {!docLoading && documents.map((doc, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'var(--paper)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '12.5px', color: 'var(--ink)' }}>
                      📄 {doc.doc_id || `DOCUMENT_${idx + 1}`} ({doc.doc_type || 'FIR'})
                    </span>
                    {doc.sha256_hash && (
                      <span style={{ fontSize: '9.5px', fontFamily: 'IBM Plex Mono, monospace', color: 'var(--stamp-green)', background: 'var(--stamp-green-bg)', padding: '2px 6px', borderRadius: '2px', border: '1px solid var(--stamp-green)' }}>
                        🔒 SHA-256: {doc.sha256_hash.substring(0, 10)}...
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--ink-soft)', lineHeight: '1.5', whiteSpace: 'pre-wrap', background: 'var(--panel)', padding: '10px', borderRadius: '4px', border: '1px dashed var(--border)' }}>
                    {doc.text}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 4: Kingpin Link Analysis (Pathfinder) */}
          {activeTab === 'xai' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: '6px', padding: '16px' }}>
                <h4 style={{ margin: '0 0 6px', fontSize: '14px', fontFamily: 'Space Grotesk, sans-serif' }}>
                  Trace Operational Chain to Master Kingpin (Iqbal Ansari)
                </h4>
                <p style={{ margin: '0 0 12px', fontSize: '12px', color: 'var(--ink-muted)' }}>
                  Computes multi-hop shortest paths to determine how {entity.name} connects to the central syndicate command node.
                </p>
                <button
                  onClick={handleTraceToHub}
                  disabled={pathLoading}
                  className="tactical-btn"
                  style={{
                    background: 'var(--stamp-red)',
                    color: '#FFF',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  {pathLoading ? 'Computing Network Hops...' : '🧭 Trace Chain to Iqbal Ansari'}
                </button>
              </div>

              {pathResult && (
                <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderLeft: '4px solid var(--stamp-green)', borderRadius: '6px', padding: '16px' }}>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--ink)', marginBottom: '4px' }}>
                    Evidentiary Synthesis:
                  </div>
                  <p style={{ margin: '0 0 10px', fontSize: '12.5px', color: 'var(--ink-soft)', lineHeight: '1.5' }}>
                    {pathResult.summary_conclusion}
                  </p>
                  {pathResult.paths && pathResult.paths.length > 0 && (
                    <div style={{ background: 'var(--panel)', border: '1px dashed var(--border)', padding: '8px 12px', borderRadius: '4px', fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: 'var(--ink)' }}>
                      <b>Path:</b> {pathResult.paths[0].nodes.join(' ➔ ')}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer with Actions */}
        <div style={{
          background: 'var(--panel-elevated)',
          borderTop: '1px solid var(--border)',
          padding: '14px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '11px', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace' }}>
            SECTION 65B INDIAN EVIDENCE ACT COMPLIANT
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <a
              href={dossierPdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                background: 'var(--stamp-red)',
                color: '#FFF',
                borderRadius: '4px',
                textDecoration: 'none',
                fontSize: '12px',
                fontWeight: 700,
                fontFamily: 'IBM Plex Mono, monospace'
              }}
            >
              📄 Download PDF Dossier
            </a>
            <button
              onClick={onClose}
              style={{
                padding: '8px 14px',
                background: 'var(--panel)',
                border: '1px solid var(--border)',
                color: 'var(--ink)',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
