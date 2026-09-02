import React, { useState, useEffect } from 'react';

export default function NavigationSidebar({
  activeTab,
  onTabChange,
  theme,
  onToggleTheme,
  currentUser,
  onOpenAuthModal,
  patternsCount = 0,
  isCollapsed,
  onToggleCollapse
}) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = now.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  // Security & Audit mirrors the backend's own RBAC rule (backend/routers/auth.py
  // require_role): only OFFICER_IN_CHARGE and AUDITOR can reach /audit/logs.
  // Investigators never see the item at all, not just a blocked page.
  const canSeeAudit = currentUser?.role === 'OFFICER_IN_CHARGE' || currentUser?.role === 'AUDITOR';

  const navItems = [
    { id: 'board', icon: '📌', label: 'Case Board', desc: 'Corkboard & connections' },
    { id: 'timeline', icon: '⏱️', label: 'Timeline', desc: 'Events in order' },
    { id: 'cases', icon: '📁', label: 'Case Files', desc: "Every case & who's in it" },
    { id: 'entities', icon: '👥', label: 'Entities', desc: 'All people, places, accounts' },
    { id: 'anomalies', icon: '🚨', label: 'Anomaly Alerts', desc: 'Repeated patterns across cases', badge: patternsCount },
    { id: 'dossiers', icon: '📄', label: 'Court Reports', desc: 'Printable case summaries' },
    { id: 'xai', icon: '🧭', label: 'Pathfinder', desc: 'How are two people connected?' },
    ...(canSeeAudit ? [{ id: 'audit', icon: '🛡️', label: 'Security & Audit', desc: 'Activity log & sign-offs' }] : []),
  ];

  return (
    <aside className={`nav-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Brand Header & Toggle */}
      <div className="nav-sidebar-brand">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
          <div className="mark">NT</div>
          {!isCollapsed && (
            <div className="brand-text">
              <h1>NexusTrace</h1>
              <div className="tagline">Criminal Intelligence</div>
            </div>
          )}
        </div>

        <button
          onClick={onToggleCollapse}
          className="nav-sidebar-toggle"
          title={isCollapsed ? 'Expand Sidebar (Ctrl+B)' : 'Collapse Sidebar'}
        >
          {isCollapsed ? '☰' : '⟨⟨'}
        </button>
      </div>

      {/* Nav List */}
      <nav className="nav-sidebar-items">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`nav-sidebar-btn ${isActive ? 'active' : ''}`}
              title={isCollapsed ? item.label : undefined}
            >
              <span className="nav-icon">{item.icon}</span>
              {!isCollapsed && (
                <div className="nav-label-wrap">
                  <span className="nav-label">{item.label}</span>
                  <span className="nav-desc">{item.desc}</span>
                </div>
              )}
              {item.badge > 0 && (
                <span className="badge-count" style={{ marginLeft: isCollapsed ? '0' : 'auto' }}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom User Persona & Tools */}
      <div className="nav-sidebar-footer">
        {/* Officer Persona Badge */}
        <button
          onClick={onOpenAuthModal}
          className="nav-sidebar-user-btn"
          title="Switch Officer Session & RBAC Credentials"
        >
          <span style={{ fontSize: '14px' }}>👤</span>
          {!isCollapsed && (
            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', overflow: 'hidden' }}>
              <span style={{ fontWeight: 600, fontSize: '11px', color: 'var(--ink)', whiteSpace: 'nowrap' }}>
                {currentUser?.username || 'investigator_01'}
              </span>
              <span style={{ fontSize: '9px', color: 'var(--tag-amber)', fontFamily: 'IBM Plex Mono, monospace' }}>
                [{currentUser?.role || 'INVESTIGATOR'}]
              </span>
            </div>
          )}
        </button>

        {/* Bottom Bar: Clock & Theme */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
          {!isCollapsed && (
            <div style={{ fontSize: '10px', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="status-dot"></span>
              <span>{timeStr}</span>
            </div>
          )}

          <button
            onClick={onToggleTheme}
            className="theme-toggle"
            style={{ padding: '4px 8px', fontSize: '12px', marginLeft: isCollapsed ? 'auto' : '0' }}
            title="Toggle Light / Dark Theme"
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </div>
    </aside>
  );
}
