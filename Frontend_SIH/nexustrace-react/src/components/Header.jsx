import React, { useState, useEffect } from 'react';

export default function Header({
  activeTab = 'board',
  onTabChange,
  theme,
  onToggleTheme,
  currentUser,
  onOpenAuthModal,
  patternsCount = 0
}) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dateStr = now.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const timeStr = now.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const navTabs = [
    { id: 'board', label: '📌 Case Board' },
    { id: 'cases', label: '📁 Case Files' },
    { id: 'anomalies', label: '🚨 Anomaly Alerts', badge: patternsCount },
    { id: 'dossiers', label: '📄 Court Dossiers' },
    { id: 'xai', label: '🧠 XAI Pathfinder' },
  ];

  return (
    <header className="main-header">
      {/* Brand */}
      <div className="brand">
        <div className="mark">NT</div>
        <div className="brand-text">
          <h1>NexusTrace</h1>
          <div className="tagline">Criminal Intelligence Link-Analysis</div>
        </div>
      </div>

      {/* Center Tab Navigation Bar */}
      <nav className="header-nav-tabs">
        {navTabs.map((tab) => (
          <button
            key={tab.id}
            className={`nav-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            <span>{tab.label}</span>
            {tab.badge > 0 && (
              <span className="badge-count" style={{ marginLeft: '4px' }}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Right User & Utility Actions */}
      <div className="header-actions">
        {/* Surveillance Clock */}
        <div className="header-clock mono" style={{ fontSize: '11px', color: '#D8C9A3' }}>
          {dateStr} · {timeStr}
        </div>

        {/* Officer Profile & RBAC Switcher */}
        <button
          className="tactical-btn"
          onClick={onOpenAuthModal}
          title="Switch Officer Session & RBAC Credentials"
        >
          <span>👤 {currentUser?.username || 'investigator_01'}</span>
          <span style={{ opacity: 0.75, fontSize: '9.5px', fontFamily: 'IBM Plex Mono, monospace' }}>
            [{currentUser?.role || 'INVESTIGATOR'}]
          </span>
        </button>

        {/* Theme Toggle */}
        <button
          className="theme-toggle"
          onClick={onToggleTheme}
          title="Toggle Light/Dark Theme"
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </div>
    </header>
  );
}