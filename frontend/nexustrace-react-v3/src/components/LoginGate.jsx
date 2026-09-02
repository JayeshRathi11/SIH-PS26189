import React, { useState } from 'react';
import { loginUser } from '../api/client';

const QUICK_USERS = [
  { name: 'Lead Investigator', user: 'investigator_01', pass: 'Investigate#2026', role: 'INVESTIGATOR', badge: 'INV-8821', color: 'var(--tag-amber)' },
  { name: 'NCRB Administrator', user: 'ncrb_admin', pass: 'Admin#MHA2026', role: 'OFFICER_IN_CHARGE', badge: 'ADM-001', color: 'var(--stamp-red)' },
  { name: 'Judicial Auditor', user: 'judicial_auditor', pass: 'Audit#Secure2026', role: 'AUDITOR', badge: 'AUD-904', color: 'var(--stamp-blue)' },
];

export default function LoginGate({ onAuthenticated, theme, onToggleTheme }) {
  const [username, setUsername] = useState('investigator_01');
  const [password, setPassword] = useState('Investigate#2026');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e?.preventDefault();
    if (!username || !password) return;
    setLoading(true);
    setError('');
    try {
      const userProfile = await loginUser(username, password);
      onAuthenticated(userProfile);
    } catch (err) {
      setError(err.message || 'ACCESS DENIED — credential verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickUser = (qu) => {
    setUsername(qu.user);
    setPassword(qu.pass);
    setError('');
  };

  return (
    <div className="login-gate">
      <div className="login-gate__scanline" aria-hidden="true" />
      <div className="login-gate__grid" aria-hidden="true" />

      <button
        type="button"
        className="login-gate__theme-toggle"
        onClick={onToggleTheme}
        title="Toggle light/dark mode"
      >
        {theme === 'light' ? '🌙' : '☀️'}
      </button>

      <div className="login-gate__panel" style={{ maxWidth: '440px', padding: '30px 28px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
          <div className="mark" style={{ width: '40px', height: '40px', fontSize: '16px' }}>NT</div>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontFamily: 'Space Grotesk, sans-serif', color: 'var(--ink)', letterSpacing: '0.02em' }}>
              NEXUSTRACE
            </h1>
            <div style={{ fontSize: '10.5px', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '2px' }}>
              MHA / NCRB &middot; Criminal Intelligence Network
            </div>
          </div>
        </div>

        <div style={{ height: '1px', background: 'var(--border)', margin: '14px 0 16px' }} />

        <div style={{ fontSize: '11px', color: 'var(--stamp-green)', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="status-dot"></span>
          <span>&gt; SECURE TERMINAL // NODE-07 READY</span>
        </div>

        {error && (
          <div className="login-gate__error" style={{ marginBottom: '16px' }}>
            <span className="login-gate__error-icon">&#9888;</span> {error}
          </div>
        )}

        <form onSubmit={handleLogin} autoComplete="off">
          <div style={{ marginBottom: '14px' }}>
            <label className="login-gate__label" htmlFor="lg-username" style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px' }}>
              [ OFFICER CALL-SIGN / USERNAME ]
            </label>
            <input
              id="lg-username"
              className="login-gate__input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              autoComplete="off"
              required
              style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px' }}
            />
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label className="login-gate__label" htmlFor="lg-password" style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px' }}>
              [ AUTHORIZATION KEY ]
            </label>
            <input
              id="lg-password"
              className="login-gate__input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              autoComplete="off"
              required
              style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px' }}
            />
          </div>

          <button type="submit" className="login-gate__submit" disabled={loading} style={{ fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, padding: '12px' }}>
            {loading ? 'VERIFYING CREDENTIALS…' : 'AUTHENTICATE SESSION'}
          </button>
        </form>

        {/* Quick Personnel Credentials */}
        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px dashed var(--border)' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-muted)', marginBottom: '10px', fontFamily: 'IBM Plex Mono, monospace' }}>
            VERIFIED PERSONNEL &mdash; QUICK ACCESS:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
            {QUICK_USERS.map((qu) => {
              const isSelected = username === qu.user;
              return (
                <button
                  key={qu.user}
                  type="button"
                  onClick={() => handleQuickUser(qu)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: isSelected ? 'var(--tag-amber-bg)' : 'var(--paper)',
                    border: isSelected ? '1px solid var(--tag-amber)' : '1px solid var(--border)',
                    borderRadius: '4px',
                    color: 'var(--ink)',
                    fontSize: '11.5px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600 }}>{qu.name}</span>
                    <code style={{ fontSize: '10px', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace' }}>{qu.user}</code>
                  </div>
                  <span style={{
                    fontSize: '9px',
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontWeight: 700,
                    color: qu.color,
                    border: `1px solid ${qu.color}`,
                    borderRadius: '2px',
                    padding: '1px 6px'
                  }}>
                    {qu.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
