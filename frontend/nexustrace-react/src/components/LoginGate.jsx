import React, { useState } from 'react';
import { loginUser } from '../api/client';

const QUICK_USERS = [
  { name: 'Lead Investigator', user: 'investigator_01', pass: 'Investigate#2026', role: 'INVESTIGATOR', badge: 'INV-8821' },
  { name: 'NCRB Administrator', user: 'ncrb_admin', pass: 'Admin#MHA2026', role: 'OFFICER_IN_CHARGE', badge: 'ADM-001' },
  { name: 'Judicial Auditor', user: 'judicial_auditor', pass: 'Audit#Secure2026', role: 'AUDITOR', badge: 'AUD-904' },
];

export default function LoginGate({ onAuthenticated, theme, onToggleTheme }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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

      <div className="login-gate__panel">
        <div className="login-gate__stamp">CLASSIFIED</div>

        <div className="login-gate__header">
          <div className="login-gate__mark">NT</div>
          <div>
            <h1 className="login-gate__title">NEXUSTRACE</h1>
            <div className="login-gate__subtitle mono">
              MHA / NCRB &middot; CRIMINAL INTELLIGENCE NETWORK
            </div>
          </div>
        </div>

        <div className="login-gate__divider" />

        <div className="login-gate__boot mono">
          <span className="login-gate__boot-line">&gt; SECURE ACCESS TERMINAL // NODE-7</span>
          <span className="login-gate__boot-line">&gt; ENCRYPTED CHANNEL ESTABLISHED<span className="login-gate__cursor">_</span></span>
        </div>

        {error && (
          <div className="login-gate__error mono">
            <span className="login-gate__error-icon">&#9888;</span> {error}
          </div>
        )}

        <form onSubmit={handleLogin} autoComplete="off">
          <label className="login-gate__label mono" htmlFor="lg-username">[ OFFICER ID ]</label>
          <input
            id="lg-username"
            className="login-gate__input mono"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username"
            autoComplete="off"
            required
          />

          <label className="login-gate__label mono" htmlFor="lg-password">[ ACCESS KEY ]</label>
          <input
            id="lg-password"
            className="login-gate__input mono"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            autoComplete="off"
            required
          />

          <button type="submit" className="login-gate__submit mono" disabled={loading}>
            {loading ? 'VERIFYING…' : 'AUTHENTICATE SESSION'}
          </button>
        </form>

        <div className="login-gate__quick">
          <p className="login-gate__quick-label mono">VERIFIED PERSONNEL &mdash; QUICK ACCESS</p>
          <div className="login-gate__quick-list">
            {QUICK_USERS.map((qu) => (
              <button
                key={qu.user}
                type="button"
                className="login-gate__quick-card mono"
                onClick={() => handleQuickUser(qu)}
              >
                <span className="login-gate__quick-name">{qu.name}</span>
                <span className="login-gate__quick-meta">
                  <span className="login-gate__quick-badge">{qu.badge}</span>
                  <span className="login-gate__quick-role">{qu.role}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="login-gate__footer mono">
          UNAUTHORIZED ACCESS TO THIS SYSTEM IS A PUNISHABLE OFFENSE &middot; ALL SESSIONS LOGGED
        </div>
      </div>
    </div>
  );
}
