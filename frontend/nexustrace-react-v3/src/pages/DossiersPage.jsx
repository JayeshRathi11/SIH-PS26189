import React, { useState, useEffect, useMemo } from 'react';
import { fetchCaseDocuments, getDossierDownloadUrl } from '../api/client';

const DOC_TYPE_META = {
  FIR:           { icon: '📋', color: 'var(--stamp-red)',    bg: 'var(--stamp-red-bg)',    label: 'First Information Report' },
  INTERCEPT:     { icon: '📡', color: 'var(--stamp-blue)',   bg: 'var(--stamp-blue-bg)',   label: 'Intercept / Wiretap' },
  SURVEILLANCE:  { icon: '🎥', color: 'var(--stamp-purple)', bg: 'rgba(126,34,206,0.1)',  label: 'Surveillance Record' },
  CONFESSION:    { icon: '🗣️', color: 'var(--tag-amber)',    bg: 'var(--tag-amber-bg)',    label: 'Confession / Statement' },
  FORENSIC:      { icon: '🔬', color: 'var(--stamp-cyan)',   bg: 'rgba(14,116,144,0.1)',  label: 'Forensic Analysis' },
  FINANCIAL:     { icon: '💳', color: 'var(--stamp-green)',  bg: 'var(--stamp-green-bg)',  label: 'Financial Record' },
  DEFAULT:       { icon: '📄', color: 'var(--ink-muted)',    bg: 'var(--panel)',            label: 'Document' },
};

function getDocMeta(docType) {
  if (!docType) return DOC_TYPE_META.DEFAULT;
  const upper = docType.toUpperCase();
  for (const [key, meta] of Object.entries(DOC_TYPE_META)) {
    if (upper.includes(key)) return meta;
  }
  return DOC_TYPE_META.DEFAULT;
}

export default function DossiersPage({ cases, activeCaseId, onSelectCase, entities }) {
  const [selectedEntityId, setSelectedEntityId] = useState('ENT_HUB_IQBAL_ANSARI');
  const [documents, setDocuments] = useState([]);
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState(null);
  const [expandedDocIdx, setExpandedDocIdx] = useState(null);
  const [docFilter, setDocFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

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
    centrality: 0.9221,
    type: 'person',
    connections: 0,
    domains: []
  };

  const dossierPdfUrl = getDossierDownloadUrl(selectedEntityId);

  // Doc type distribution for stats
  const docTypeCounts = useMemo(() => {
    const counts = {};
    documents.forEach(doc => {
      const t = (doc.doc_type || 'Unknown').toUpperCase();
      // Normalize to base types
      let base = 'OTHER';
      if (t.includes('FIR')) base = 'FIR';
      else if (t.includes('INTERCEPT')) base = 'INTERCEPT';
      else if (t.includes('SURVEILLANCE')) base = 'SURVEILLANCE';
      else if (t.includes('CONFESSION')) base = 'CONFESSION';
      else if (t.includes('FORENSIC')) base = 'FORENSIC';
      else if (t.includes('FINANCIAL')) base = 'FINANCIAL';
      counts[base] = (counts[base] || 0) + 1;
    });
    return counts;
  }, [documents]);

  // Unique doc types for filter pills
  const uniqueTypes = useMemo(() => {
    const types = new Set();
    documents.forEach(doc => {
      const t = (doc.doc_type || 'Unknown');
      types.add(t);
    });
    return ['ALL', ...Array.from(types)];
  }, [documents]);

  // Filtered documents
  const filteredDocs = useMemo(() => {
    let filtered = documents;
    if (docFilter !== 'ALL') {
      filtered = filtered.filter(doc => (doc.doc_type || 'Unknown') === docFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(doc =>
        (doc.doc_id || '').toLowerCase().includes(q) ||
        (doc.doc_type || '').toLowerCase().includes(q) ||
        (doc.text || '').toLowerCase().includes(q) ||
        (doc.domain || '').toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [documents, docFilter, searchQuery]);

  // Stats
  const totalDocs = documents.length;
  const topEntities = entities.slice(0, 5).sort((a, b) => (b.centrality || 0) - (a.centrality || 0));

  return (
    <div className="page-container" style={{ padding: '24px', overflowY: 'auto', height: '100vh', boxSizing: 'border-box' }}>
      {/* ═══════ HEADER SECTION ═══════ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ width: '24px', height: '24px', borderRadius: '5px', background: 'linear-gradient(135deg, #10B981, #047857)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: '12px' }}>
              📄
            </span>
            <span style={{ color: 'var(--stamp-green)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', fontFamily: 'IBM Plex Mono, monospace' }}>
              EVIDENTIARY AUDIT & COURT BRIEFS
            </span>
          </div>
          <h2 style={{ margin: '4px 0', fontSize: '22px', fontFamily: 'Space Grotesk, sans-serif', color: 'var(--ink)' }}>
            Court Evidentiary Dossiers & Intelligence Library
          </h2>
          <p style={{ margin: 0, color: 'var(--ink-muted)', fontSize: '12.5px', maxWidth: '600px', lineHeight: '1.5' }}>
            Generate Section 65B-compliant prosecution briefs, audit primary source FIRs, intercepts and surveillance records with SHA-256 custody chain seals.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', fontFamily: 'IBM Plex Mono, monospace', color: 'var(--ink-soft)' }}>Domain:</span>
          <select
            value={activeCaseId}
            onChange={(e) => onSelectCase(e.target.value)}
            className="search-box"
            style={{ padding: '7px 10px', fontSize: '12px', borderRadius: '4px' }}
          >
            {cases.map(c => (
              <option key={c.id} value={c.id}>{c.caseId} — {c.title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ═══════ SUMMARY STATS ROW ═══════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Total Evidence', value: totalDocs, icon: '📋', color: 'var(--tag-amber)', bg: 'var(--tag-amber-bg)' },
          { label: 'FIR Documents', value: docTypeCounts['FIR'] || 0, icon: '📋', color: 'var(--stamp-red)', bg: 'var(--stamp-red-bg)' },
          { label: 'Intercepts', value: docTypeCounts['INTERCEPT'] || 0, icon: '📡', color: 'var(--stamp-blue)', bg: 'var(--stamp-blue-bg)' },
          { label: 'Surveillance', value: docTypeCounts['SURVEILLANCE'] || 0, icon: '🎥', color: 'var(--stamp-purple)', bg: 'rgba(126,34,206,0.1)' },
          { label: 'Entities Tracked', value: entities.length, icon: '👥', color: 'var(--stamp-green)', bg: 'var(--stamp-green-bg)' },
        ].map((stat, i) => (
          <div key={i} style={{
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: stat.color, borderRadius: '6px 6px 0 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.06em' }}>{stat.label}</span>
              <span style={{ fontSize: '14px' }}>{stat.icon}</span>
            </div>
            <span style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'Space Grotesk, sans-serif', color: stat.color }}>{stat.value}</span>
          </div>
        ))}
      </div>

      {/* ═══════ MAIN 2-COLUMN GRID ═══════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: '24px', alignItems: 'start' }}>

        {/* ─────── LEFT COLUMN: PDF GENERATOR + TOP SUBJECTS ─────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Prosecution Brief Generator Card */}
          <div style={{
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '20px',
            boxShadow: 'var(--shadow-node)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Top accent gradient bar */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, var(--stamp-green), var(--tag-amber), var(--stamp-red))' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <span style={{
                    fontFamily: 'IBM Plex Mono, monospace', fontSize: '9.5px', fontWeight: 700,
                    color: 'var(--stamp-green)', border: '1px solid var(--stamp-green)',
                    padding: '2px 8px', borderRadius: '3px', background: 'var(--stamp-green-bg)'
                  }}>
                    🏛️ SECTION 65B COMPLIANT
                  </span>
                  <span style={{
                    fontFamily: 'IBM Plex Mono, monospace', fontSize: '9.5px', fontWeight: 700,
                    color: 'var(--stamp-blue)', border: '1px solid var(--stamp-blue)',
                    padding: '2px 8px', borderRadius: '3px', background: 'var(--stamp-blue-bg)'
                  }}>
                    SHA-256 SEALED
                  </span>
                </div>
                <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontFamily: 'Space Grotesk, sans-serif', color: 'var(--ink)' }}>
                  Prosecution Brief Generator
                </h3>
              </div>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--ink-soft)', lineHeight: '1.5', margin: '0 0 14px' }}>
              Generates a cryptographically signed PDF intelligence dossier including subject aliases, cross-domain link matrices, community cluster analysis, and AI evidentiary reasoning chains.
            </p>

            {/* Entity Selector */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace', color: 'var(--ink-soft)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Select Accused / Suspect:
              </label>
              <select
                value={selectedEntityId}
                onChange={(e) => setSelectedEntityId(e.target.value)}
                className="search-box"
                style={{ width: '100%', padding: '9px 10px', fontSize: '12px', borderRadius: '4px' }}
              >
                <option value="ENT_HUB_IQBAL_ANSARI">★ Iqbal Ansari (Master Syndicate Controller)</option>
                {entities.filter(e => e.id !== 'ENT_HUB_IQBAL_ANSARI').map(e => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.typeLabel || e.type}) — Centrality: {typeof e.centrality === 'number' ? e.centrality.toFixed(2) : e.centrality}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject Intelligence Brief Card */}
            <div style={{
              background: 'var(--panel-elevated)',
              border: '1px solid var(--border)',
              borderLeft: '4px solid var(--tag-amber)',
              borderRadius: '4px',
              padding: '14px',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--ink)', fontFamily: 'Space Grotesk, sans-serif' }}>
                    {targetEntity.name}
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--ink-soft)', marginTop: '2px' }}>
                    {targetEntity.role}
                  </div>
                </div>
                <span style={{
                  fontSize: '9px', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700,
                  color: 'var(--tag-amber)', border: '1px solid var(--tag-amber)',
                  padding: '2px 6px', borderRadius: '3px', background: 'var(--tag-amber-bg)'
                }}>
                  {(targetEntity.type || 'PERSON').toUpperCase()}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px' }}>
                <div style={{ background: 'var(--panel)', borderRadius: '4px', padding: '8px 10px' }}>
                  <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase' }}>Centrality Index</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--tag-amber)', fontFamily: 'Space Grotesk, sans-serif', marginTop: '2px' }}>
                    {typeof targetEntity.centrality === 'number' ? targetEntity.centrality.toFixed(4) : targetEntity.centrality}
                  </div>
                </div>
                <div style={{ background: 'var(--panel)', borderRadius: '4px', padding: '8px 10px' }}>
                  <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase' }}>Connections</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--stamp-red)', fontFamily: 'Space Grotesk, sans-serif', marginTop: '2px' }}>
                    {targetEntity.connections || 0}
                  </div>
                </div>
              </div>

              {targetEntity.domains && targetEntity.domains.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '10px' }}>
                  {targetEntity.domains.map((d, i) => (
                    <span key={i} style={{
                      fontSize: '9px', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600,
                      color: 'var(--stamp-blue)', background: 'var(--stamp-blue-bg)',
                      padding: '2px 6px', borderRadius: '2px', border: '1px solid var(--stamp-blue)'
                    }}>
                      {d.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Download CTA */}
            <a
              href={dossierPdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                padding: '11px 14px',
                background: 'var(--stamp-red)',
                color: '#FFF',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '12.5px',
                fontFamily: 'IBM Plex Mono, monospace',
                textDecoration: 'none',
                boxShadow: '0 3px 10px rgba(185, 28, 28, 0.3)',
                cursor: 'pointer',
                transition: 'transform 0.1s ease, box-shadow 0.1s ease'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download Formal Court Dossier (PDF)
            </a>
          </div>

          {/* Top Intelligence Subjects Card */}
          <div style={{
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '16px',
            boxShadow: 'var(--shadow-node)'
          }}>
            <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '10px' }}>
              TOP INTELLIGENCE SUBJECTS
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {topEntities.map((ent, i) => (
                <button
                  key={ent.id}
                  onClick={() => setSelectedEntityId(ent.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: selectedEntityId === ent.id ? 'var(--tag-amber-bg)' : 'var(--panel-elevated)',
                    border: selectedEntityId === ent.id ? '1px solid var(--tag-amber)' : '1px solid var(--border)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                      width: '22px', height: '22px', borderRadius: '50%', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '10px',
                      color: '#FFF', background: i === 0 ? 'var(--stamp-red)' : i < 3 ? 'var(--tag-amber)' : 'var(--ink-muted)',
                      fontFamily: 'IBM Plex Mono, monospace'
                    }}>
                      {i + 1}
                    </span>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 600, fontSize: '12px', color: 'var(--ink)' }}>{ent.name}</div>
                      <div style={{ fontSize: '10px', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace' }}>
                        {(ent.type || 'person').toUpperCase()} · Hub Score: {typeof ent.centrality === 'number' ? ent.centrality.toFixed(3) : ent.centrality}
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--stamp-red)', fontFamily: 'Space Grotesk, sans-serif' }}>
                    {ent.connections || 0}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ─────── RIGHT COLUMN: EVIDENCE REPOSITORY ─────── */}
        <div style={{
          background: 'var(--panel)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '0',
          boxShadow: 'var(--shadow-node)',
          overflow: 'hidden'
        }}>
          {/* Repository Header */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--panel-elevated)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace' }}>
                PRIMARY EVIDENCE REPOSITORY
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', marginTop: '2px' }}>
                {filteredDocs.length} of {totalDocs} Documents
                {docFilter !== 'ALL' && (
                  <span style={{ fontSize: '11px', color: 'var(--tag-amber)', marginLeft: '6px' }}>
                    (Filtered: {docFilter})
                  </span>
                )}
              </div>
            </div>

            {/* Search Bar */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="🔍 Search evidence..."
                  className="search-box"
                  style={{ padding: '7px 12px', fontSize: '11.5px', minWidth: '200px', borderRadius: '4px' }}
                />
              </div>
            </div>
          </div>

          {/* Doc Type Filter Pills */}
          <div style={{
            padding: '10px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            gap: '6px',
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            {uniqueTypes.map(type => {
              const isActive = docFilter === type;
              const meta = type === 'ALL' ? { color: 'var(--ink)', bg: 'var(--panel)' } : getDocMeta(type);
              return (
                <button
                  key={type}
                  onClick={() => setDocFilter(type)}
                  style={{
                    padding: '4px 10px',
                    fontSize: '10.5px',
                    fontWeight: isActive ? 700 : 500,
                    fontFamily: 'IBM Plex Mono, monospace',
                    background: isActive ? meta.bg : 'transparent',
                    color: isActive ? meta.color : 'var(--ink-muted)',
                    border: isActive ? `1px solid ${meta.color}` : '1px solid var(--border)',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em'
                  }}
                >
                  {type === 'ALL' ? `All (${totalDocs})` : type}
                </button>
              );
            })}
          </div>

          {/* Documents List */}
          <div style={{ padding: '12px 20px', maxHeight: '65vh', overflowY: 'auto' }}>
            {docLoading && (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--ink-muted)', fontSize: '12px' }}>
                <div style={{ fontSize: '20px', marginBottom: '8px' }}>⟳</div>
                Loading evidence repository...
              </div>
            )}

            {docError && (
              <div style={{ padding: '14px', background: 'var(--stamp-red-bg)', border: '1px solid var(--stamp-red)', color: 'var(--stamp-red)', borderRadius: '4px', fontSize: '12px' }}>
                ⚠️ {docError}
              </div>
            )}

            {!docLoading && !docError && filteredDocs.length === 0 && (
              <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--ink-muted)' }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>📭</div>
                <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ink)' }}>No Documents Found</div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>
                  {searchQuery ? 'No evidence matching your search query.' : 'No source documents indexed for this vertical.'}
                </div>
              </div>
            )}

            {!docLoading && !docError && filteredDocs.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredDocs.map((doc, idx) => {
                  const meta = getDocMeta(doc.doc_type);
                  const isExpanded = expandedDocIdx === idx;
                  const globalIdx = documents.indexOf(doc);

                  return (
                    <div
                      key={idx}
                      onClick={() => setExpandedDocIdx(isExpanded ? null : idx)}
                      style={{
                        background: isExpanded ? 'var(--panel-elevated)' : 'var(--paper)',
                        border: isExpanded ? `1px solid ${meta.color}` : '1px solid var(--border)',
                        borderLeft: `4px solid ${meta.color}`,
                        borderRadius: '6px',
                        padding: '12px 16px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {/* Document Row Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '16px' }}>{meta.icon}</span>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontWeight: 700, fontSize: '12.5px', color: 'var(--ink)' }}>
                                {doc.doc_id || `DOC-${String(globalIdx + 1).padStart(3, '0')}`}
                              </span>
                              <span style={{
                                fontSize: '9px', fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace',
                                color: meta.color, background: meta.bg,
                                padding: '2px 6px', borderRadius: '3px',
                                border: `1px solid ${meta.color}`, textTransform: 'uppercase', letterSpacing: '0.04em'
                              }}>
                                {doc.doc_type || 'Document'}
                              </span>
                              {doc.domain && (
                                <span style={{
                                  fontSize: '9px', fontFamily: 'IBM Plex Mono, monospace',
                                  color: 'var(--ink-muted)', background: 'var(--panel)',
                                  padding: '1px 5px', borderRadius: '2px', border: '1px solid var(--border)'
                                }}>
                                  {doc.domain.replace(/_/g, ' ').toUpperCase()}
                                </span>
                              )}
                            </div>
                            {!isExpanded && doc.text && (
                              <div style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '3px', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {doc.text.substring(0, 100)}...
                              </div>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {doc.sha256_hash && (
                            <span style={{
                              fontSize: '9px', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600,
                              color: 'var(--stamp-green)', background: 'var(--stamp-green-bg)',
                              padding: '2px 6px', borderRadius: '3px', border: '1px solid var(--stamp-green)'
                            }}>
                              🔒 SHA-256: {doc.sha256_hash.substring(0, 12)}...
                            </span>
                          )}
                          <span style={{ fontSize: '13px', color: 'var(--ink-muted)', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                            ▾
                          </span>
                        </div>
                      </div>

                      {/* Expanded Document Content */}
                      {isExpanded && (
                        <div style={{
                          marginTop: '12px',
                          paddingTop: '12px',
                          borderTop: '1px dashed var(--border)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                            <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.06em' }}>
                              EXTRACTED INTELLIGENCE CONTENT:
                            </span>
                          </div>
                          <div style={{
                            fontSize: '12px',
                            color: 'var(--ink-soft)',
                            lineHeight: '1.65',
                            whiteSpace: 'pre-wrap',
                            background: 'var(--paper)',
                            border: '1px solid var(--border)',
                            borderRadius: '4px',
                            padding: '14px',
                            maxHeight: '320px',
                            overflowY: 'auto',
                            fontFamily: 'IBM Plex Sans, sans-serif'
                          }}>
                            {doc.text || 'No extracted text available for this document.'}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
