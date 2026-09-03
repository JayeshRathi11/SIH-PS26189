import React, { useState } from 'react';
import { loginUser, logoutUser } from '../api/client';

export default function LoginModal({ isOpen, onClose, currentUser, onUserChange, onLogout }) {
  if (!isOpen) return null;

  const [username, setUsername] = useState(currentUser?.username || 'investigator_01');
  const [password, setPassword] = useState('Investigate#2026');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const quickUsers = [
    { name: 'Lead Investigator', user: 'investigator_01', pass: 'Investigate#2026', role: 'INVESTIGATOR' },
    { name: 'NCRB Administrator', user: 'ncrb_admin', pass: 'Admin#MHA2026', role: 'OFFICER_IN_CHARGE' },
    { name: 'Judicial Compliance Auditor', user: 'judicial_auditor', pass: 'Audit#Secure2026', role: 'AUDITOR' }
  ];

  const handleLogin = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setError('');
    try {
      const userProfile = await loginUser(username, password);
      onUserChange(userProfile);
      onClose();
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectQuickUser = (u) => {
    setUsername(u.user);
    setPassword(u.pass);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    setError('');
    try {
      await logoutUser();
    } catch (err) {
      // logoutUser() already clears the local token even if the server call
      // fails (e.g. offline) -- proceed with the client-side sign-out either way.
    } finally {
      setLoggingOut(false);
      if (onLogout) onLogout();
      else onUserChange(null);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="tactical-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <div className="eyebrow" style={{ color: 'var(--stamp-red)', fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'IBM Plex Mono, monospace' }}>
              ● CLASSIFIED ACCESS CONTROL
            </div>
            <h3 style={{ margin: '2px 0 0', fontSize: '18px', fontFamily: 'Space Grotesk, sans-serif', color: 'var(--ink)' }}>
              Officer Terminal Authorization
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--ink-soft)' }}>
              MHA / NCRB Role-Based Access Control (RBAC)
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--ink-muted)',
              fontSize: '18px',
              cursor: 'pointer',
              padding: '2px 6px'
            }}
          >
            ✕
          </button>
        </div>

        {currentUser && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--paper)',
            border: '1px solid var(--border)',
            borderRadius: '3px',
            padding: '9px 12px',
            marginBottom: '14px'
          }}>
            <div style={{ fontSize: '11.5px', color: 'var(--ink)' }}>
              Signed in as <b>{currentUser.username}</b>{' '}
              <span style={{ color: 'var(--tag-amber)', fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px' }}>
                [{currentUser.role}]
              </span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              style={{
                background: 'transparent',
                border: '1px solid var(--stamp-red)',
                color: 'var(--stamp-red)',
                borderRadius: '2px',
                padding: '5px 10px',
                fontSize: '10.5px',
                fontFamily: 'IBM Plex Mono, monospace',
                fontWeight: 700,
                cursor: loggingOut ? 'not-allowed' : 'pointer'
              }}
            >
              {loggingOut ? 'Signing out…' : '⏻ Log Out'}
            </button>
          </div>
        )}

        {error && (
          <div style={{
            background: 'var(--stamp-red-bg)',
            border: '1px solid var(--stamp-red)',
            color: 'var(--stamp-red)',
            padding: '8px 10px',
            borderRadius: '2px',
            fontSize: '11.5px',
            marginBottom: '14px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '11px', marginBottom: '4px', color: 'var(--ink-soft)', fontFamily: 'IBM Plex Mono, monospace' }}>
              Officer Call-Sign / Username:
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                background: 'var(--panel)',
                border: '1px solid var(--border)',
                borderRadius: '2px',
                color: 'var(--ink)',
                fontSize: '12px',
                fontFamily: 'IBM Plex Mono, monospace'
              }}
              required
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '11px', marginBottom: '4px', color: 'var(--ink-soft)', fontFamily: 'IBM Plex Mono, monospace' }}>
              Passphrase / Authorization Key:
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                background: 'var(--panel)',
                border: '1px solid var(--border)',
                borderRadius: '2px',
                color: 'var(--ink)',
                fontSize: '12px',
                fontFamily: 'IBM Plex Mono, monospace'
              }}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '9px',
              background: 'var(--stamp-red)',
              color: '#FFF',
              border: 'none',
              borderRadius: '2px',
              fontWeight: 600,
              fontSize: '12px',
              fontFamily: 'IBM Plex Mono, monospace',
              cursor: 'pointer',
              marginBottom: '16px',
              letterSpacing: '0.04em'
            }}
          >
            {loading ? 'Verifying Security Token...' : 'Authenticate Officer Session'}
          </button>
        </form>

        {/* Quick Role Persona Switcher */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
          <p style={{ margin: '0 0 8px', fontSize: '10px', color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: 'IBM Plex Mono, monospace' }}>
            Quick Security Personas:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {quickUsers.map((qu) => (
              <button
                key={qu.user}
                type="button"
                onClick={() => handleSelectQuickUser(qu)}
                style={{
                  background: username === qu.user ? 'var(--tag-amber-bg)' : 'var(--panel)',
                  border: username === qu.user ? '1px solid var(--tag-amber)' : '1px solid var(--border)',
                  borderRadius: '2px',
                  padding: '6px 9px',
                  color: 'var(--ink)',
                  fontSize: '11px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <span>{qu.name} (<code>{qu.user}</code>)</span>
                <span style={{ color: 'var(--ink-muted)', fontSize: '10px', fontFamily: 'IBM Plex Mono, monospace' }}>
                  {qu.role}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
