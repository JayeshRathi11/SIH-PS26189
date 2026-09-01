import React, { useState, useEffect } from 'react';
import { downloadDossier } from '../api/client';

export default function Header({
  theme, onToggleTheme,
  leftOpen, rightOpen, onToggleLeft, onToggleRight,
  caseLabel,
  currentUser,
  onOpenAuthModal,
  onLogout,
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

  const handleExportBrief = async () => {
    try {
      await downloadDossier(selectedEntity?.id || 'ENT_HUB_IQBAL_ANSARI', selectedEntity?.name);
    } catch (err) {
      alert(err.message || 'Failed to download court dossier.');
    }
  };

  return (
    <header>
      {/* LEFT: sidebar toggle + brand */}
      <div className="navbar-zone">
        <button
          className="toggle-btn"
          onClick={onToggleLeft}
          title={leftOpen ? 'Collapse case list' : 'Expand case list'}
          aria-label="Toggle case list sidebar"
        >
          {leftOpen ? '⟨⟨' : '⟩⟩'}
        </button>
        <div className="brand">
          <div className="mark">NT</div>
          <div className="brand-text">
            <h1>NexusTrace</h1>
            <div className="tagline">MHA / NCRB Criminal Intelligence</div>
          </div>
        </div>
      </div>

      {/* CENTER: active case, the primary context indicator */}
      <div className="navbar-zone navbar-zone--center">
        <div className="case-id-wrap">
          <span className="status-dot" />
          <span className="case-id" title={caseLabel}>{caseLabel}</span>
        </div>
      </div>

      {/* RIGHT: clock, case actions, session controls, right panel toggle */}
      <div className="navbar-zone">
        <div className="header-clock mono">{dateStr} &middot; {timeStr}</div>

        <div className="header-divider" />

        <button
          type="button"
          className="header-action accent-danger"
          onClick={onOpenPatternsDrawer}
          title="View suspicious pattern &amp; syndicate alerts"
        >
          <span aria-hidden="true">🚨</span> Alerts
          {patternsCount > 0 && <span className="header-badge-count">{patternsCount}</span>}
        </button>

        <button
          type="button"
          className="header-action accent-info"
          onClick={handleExportBrief}
          title="Download formal court evidentiary dossier (PDF)"
        >
          <span aria-hidden="true">📄</span> Export Brief
        </button>

        <div className="header-divider" />

        <button
          className="toggle-btn"
          onClick={onToggleTheme}
          title="Toggle light/dark mode"
          aria-label="Toggle color theme"
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>

        <button
          type="button"
          className="header-action"
          onClick={onOpenAuthModal}
          title="Switch officer session / role"
        >
          <span aria-hidden="true">👤</span> {currentUser?.username}
          <span className="header-badge">{currentUser?.role}</span>
        </button>

        <button
          type="button"
          className="header-action accent-danger"
          onClick={onLogout}
          title="End officer session"
        >
          Log Out
        </button>

        <div className="header-divider" />

        <button
          className="toggle-btn"
          onClick={onToggleRight}
          title={rightOpen ? 'Collapse detail panel' : 'Expand detail panel'}
          aria-label="Toggle detail panel"
        >
          {rightOpen ? '⟩⟩' : '⟨⟨'}
        </button>
      </div>
    </header>
  );
}
