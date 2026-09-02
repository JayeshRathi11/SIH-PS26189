import React, { useState, useEffect } from 'react';

const NavIcons = {
  board: (
    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'linear-gradient(135deg, #F59E0B, #D97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(245, 158, 11, 0.35)', color: '#FFF' }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    </div>
  ),
  timeline: (
    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'linear-gradient(135deg, #06B6D4, #0284C7)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(6, 182, 212, 0.35)', color: '#FFF' }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/>
        <polyline points="12 6 12 12 15 14"/>
      </svg>
    </div>
  ),
  cases: (
    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'linear-gradient(135deg, #EAB308, #B45309)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(234, 179, 8, 0.35)', color: '#FFF' }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
      </svg>
    </div>
  ),
  entities: (
    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'linear-gradient(135deg, #6366F1, #4338CA)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(99, 102, 241, 0.35)', color: '#FFF' }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    </div>
  ),
  anomalies: (
    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'linear-gradient(135deg, #EF4444, #B91C1C)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(239, 68, 68, 0.35)', color: '#FFF' }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    </div>
  ),
  dossiers: (
    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'linear-gradient(135deg, #10B981, #047857)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(16, 185, 129, 0.35)', color: '#FFF' }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    </div>
  ),
  xai: (
    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'linear-gradient(135deg, #F43F5E, #BE123C)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(244, 63, 94, 0.35)', color: '#FFF' }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/>
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="rgba(255,255,255,0.4)"/>
      </svg>
    </div>
  ),
  audit: (
    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(59, 130, 246, 0.35)', color: '#FFF' }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <path d="m9 12 2 2 4-4"/>
      </svg>
    </div>
  ),
  user: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  sun: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  ),
  moon: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  ),
  chevronLeft: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  ),
  menu: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  )
};

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

  const canSeeAudit = currentUser?.role === 'OFFICER_IN_CHARGE' || currentUser?.role === 'AUDITOR';

  const navItems = [
    { id: 'board', icon: NavIcons.board, label: 'Case Board', tag: 'CANVAS' },
    { id: 'timeline', icon: NavIcons.timeline, label: 'Timeline', tag: 'FEED' },
    { id: 'cases', icon: NavIcons.cases, label: 'Case Files', tag: 'ARCHIVE' },
    { id: 'entities', icon: NavIcons.entities, label: 'Entities', tag: 'POLE' },
    { id: 'anomalies', icon: NavIcons.anomalies, label: 'Anomaly Alerts', tag: 'ALERTS', badge: patternsCount },
    { id: 'dossiers', icon: NavIcons.dossiers, label: 'Court Reports', tag: 'BRIEFS' },
    { id: 'xai', icon: NavIcons.xai, label: 'Pathfinder', tag: 'XAI' },
    ...(canSeeAudit ? [{ id: 'audit', icon: NavIcons.audit, label: 'Security & Audit', tag: 'LEDGER' }] : []),
  ];

  return (
    <aside className={`nav-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Brand Header */}
      <div className="nav-sidebar-brand">
        {!isCollapsed ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
              <div className="mark">NT</div>
              <div className="brand-text">
                <h1>NexusTrace</h1>
                <div className="tagline">Criminal Intelligence</div>
              </div>
            </div>
            <button
              onClick={onToggleCollapse}
              className="nav-sidebar-toggle"
              title="Collapse Sidebar"
            >
              {NavIcons.chevronLeft}
            </button>
          </>
        ) : (
          <button
            onClick={onToggleCollapse}
            className="nav-sidebar-toggle collapsed-toggle"
            title="Expand Sidebar"
          >
            {NavIcons.menu}
          </button>
        )}
      </div>

      {/* Navigation List */}
      <nav className="nav-sidebar-items">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`nav-sidebar-btn ${isActive ? 'active' : ''}`}
              title={item.label}
            >
              <div className="nav-icon">{item.icon}</div>
              {!isCollapsed && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1, overflow: 'hidden' }}>
                  <span className="nav-label">{item.label}</span>
                  <span style={{
                    fontSize: '9px',
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    color: isActive ? 'rgba(255,255,255,0.85)' : 'var(--ink-muted)',
                    background: isActive ? 'rgba(0,0,0,0.18)' : 'var(--panel)',
                    padding: '2px 5px',
                    borderRadius: '3px'
                  }}>
                    {item.tag}
                  </span>
                </div>
              )}
              {item.badge > 0 && (
                <span className={`badge-count ${isCollapsed ? 'collapsed-badge' : ''}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Section */}
      <div className="nav-sidebar-footer">
        {/* Officer Persona Profile Button */}
        <button
          onClick={onOpenAuthModal}
          className="nav-sidebar-user-btn"
          title={`Officer: ${currentUser?.username || 'investigator_01'} (${currentUser?.role || 'INVESTIGATOR'}) - Click to switch session`}
        >
          <div style={{
            width: '26px',
            height: '26px',
            borderRadius: '50%',
            background: 'var(--tag-amber-bg)',
            border: '1px solid var(--tag-amber)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--tag-amber)',
            flexShrink: 0
          }}>
            {NavIcons.user}
          </div>
          {!isCollapsed && (
            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', overflow: 'hidden', flex: 1 }}>
              <span style={{ fontWeight: 700, fontSize: '11.5px', color: 'var(--ink)', whiteSpace: 'nowrap' }}>
                {currentUser?.username || 'investigator_01'}
              </span>
              <span style={{ fontSize: '9.5px', color: 'var(--tag-amber)', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600 }}>
                {currentUser?.role || 'INVESTIGATOR'}
              </span>
            </div>
          )}
        </button>

        {/* Bottom Bar: Clock & Theme Toggle */}
        <div className="nav-sidebar-bottom-bar">
          {!isCollapsed && (
            <div style={{ fontSize: '10px', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="status-dot"></span>
              <span>{timeStr}</span>
            </div>
          )}

          <button
            onClick={onToggleTheme}
            className="theme-toggle"
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? NavIcons.moon : NavIcons.sun}
          </button>
        </div>
      </div>
    </aside>
  );
}
