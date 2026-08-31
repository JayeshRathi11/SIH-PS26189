import React, { useState, useEffect } from 'react';
import { getDossierDownloadUrl, downloadDossier } from '../api/client';

export default function Header({
  theme, onToggleTheme,
  leftOpen, rightOpen, onToggleLeft, onToggleRight,
  caseLabel,
  currentUser,
  onOpenAuthModal,
  onOpenPatternsDrawer,
  patternsCount = 0,
  selectedEntity
}) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dateStr = now.toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  });
  const timeStr = now.toLocaleTimeString(undefined, {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  const dossierUrl = getDossierDownloadUrl(selectedEntity?.id || 'ENT_HUB_IQBAL_ANSARI');

  return (
    <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', background: '#0F172A', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#F8FAFC' }}>
      <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button className="toggle-btn" onClick={onToggleLeft} title="Toggle left sidebar" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>
          {leftOpen ? '⟨⟨' : '⟩⟩'}
        </button>
        <div className="mark" style={{ background: '#DC2626', color: '#fff', fontWeight: 800, padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>NT</div>
        <div className="brand-text">
          <h1 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, letterSpacing: '0.02em' }}>NexusTrace</h1>
          <div className="tagline" style={{ fontSize: '0.7rem', color: '#94A3B8' }}>MHA / NCRB Criminal Intelligence</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div className="header-clock mono" style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
          {dateStr} · {timeStr}
        </div>
        
        {/* Suspicious Patterns Alert Button */}
        <button
          onClick={onOpenPatternsDrawer}
          style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid #EF4444',
            color: '#FCA5A5',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
          title="View Advanced Anomaly & Syndicate Pattern Alerts"
        >
          <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#EF4444' }}></span>
          <span>🚨 Pattern Alerts</span>
          {patternsCount > 0 && (
            <span style={{ background: '#DC2626', color: '#fff', borderRadius: '10px', padding: '1px 6px', fontSize: '0.7rem' }}>
              {patternsCount}
            </span>
          )}
        </button>

        {/* Legal Brief Export Direct Download */}
        <button
          type="button"
          onClick={async () => {
            try {
              await downloadDossier(selectedEntity?.id || 'ENT_HUB_IQBAL_ANSARI', selectedEntity?.name);
            } catch (err) {
              alert(err.message || 'Failed to download court dossier.');
            }
          }}
          style={{
            background: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid #3B82F6',
            color: '#93C5FD',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: 600,
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer'
          }}
          title="Download Formal Court Evidentiary Dossier (PDF)"
        >
          📄 Export Brief (PDF)
        </button>
      </div>

      <div className="case-id-wrap" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Active User Badge & Session Switcher */}
        <button
          onClick={onOpenAuthModal}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#E2E8F0',
            padding: '4px 8px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
          title="Click to Switch Officer Session / Role"
        >
          <span>👤 {currentUser?.username || 'investigator_01'}</span>
          <span style={{ background: '#334155', padding: '1px 4px', borderRadius: '3px', fontSize: '0.65rem', color: '#CBD5E1' }}>
            {currentUser?.role || 'INVESTIGATOR'}
          </span>
        </button>

        <button className="theme-toggle" onClick={onToggleTheme} title="Toggle light/dark mode" style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>
          {theme === 'light' ? '🌙' : '☀️'}
        </button>

        <div className="case-id" style={{ fontSize: '0.8rem', background: '#1E293B', padding: '4px 8px', borderRadius: '4px', color: '#F1F5F9', border: '1px solid rgba(255,255,255,0.1)' }}>
          {caseLabel}
        </div>

        <button className="toggle-btn" onClick={onToggleRight} title="Toggle right panel" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>
          {rightOpen ? '⟩⟩' : '⟨⟨'}
        </button>
      </div>
    </header>
  );
}