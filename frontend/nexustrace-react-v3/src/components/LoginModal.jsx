import React, { useState } from 'react';
import { loginUser, logoutUser } from '../api/client';

export default function LoginModal({ isOpen, onClose, currentUser, onUserChange }) {
  if (!isOpen) return null;

  const [username, setUsername] = useState(currentUser?.username || 'investigator_01');
  const [password, setPassword] = useState('Investigate#2026');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const quickUsers = [
    { name: 'Lead Investigator', user: 'investigator_01', pass: 'Investigate#2026', role: 'INVESTIGATOR', badge: 'INV-8821', color: 'var(--tag-amber)' },
    { name: 'NCRB Admin', user: 'ncrb_admin', pass: 'Admin#MHA2026', role: 'OFFICER_IN_CHARGE', badge: 'ADM-001', color: 'var(--stamp-red)' },
    { name: 'Judicial Auditor', user: 'judicial_auditor', pass: 'Audit#Secure2026', role: 'AUDITOR', badge: 'AUD-904', color: 'var(--stamp-blue)' }
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
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    onUserChange(null);
    onClose();
  };

  const handleSelectQuickUser = (u) => {
    setUsername(u.user);
    setPassword(u.pass);
    setError('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="tactical-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', padding: '24px 26px', borderTop: '3px solid var(--stamp-red)' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
              <span className="status-dot"></span>
              <span style={{ color: 'var(--stamp-red)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', fontFamily: 'IBM Plex Mono, monospace' }}>
                SECURITY ACCESS CONTROL
              </span>
            </div>
            <h3 style={{ margin: 0, fontSize: '18px', fontFamily: 'Space Grotesk, sans-serif', color: 'var(--ink)' }}>
              Officer Authentication
            </h3>
            {currentUser && (
              <div style={{ marginTop: '3px', fontSize: '11px', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace' }}>
                Active: <strong style={{ color: 'var(--tag-amber)' }}>{currentUser.username}</strong> [{currentUser.role}]
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--ink-muted)',
              fontSize: '18px',
              cursor: 'pointer',
              padding: '2px 6px',
              lineHeight: 1
            }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div style={{
            background: 'var(--stamp-red-bg)',
            border: '1px solid var(--stamp-red)',
            color: 'var(--stamp-red)',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, fontFamily: 'IBM Plex Mono, monospace', marginBottom: '5px', color: 'var(--ink-soft)' }}>
              OFFICER USERNAME / CALL-SIGN
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              style={{
                width: '100%',
                padding: '9px 12px',
                background: 'var(--paper)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                color: 'var(--ink)',
                fontSize: '13px',
                fontFamily: 'IBM Plex Mono, monospace',
                boxSizing: 'border-box'
              }}
              required
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, fontFamily: 'IBM Plex Mono, monospace', marginBottom: '5px', color: 'var(--ink-soft)' }}>
              AUTHORIZATION KEY / PASSPHRASE
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              style={{
                width: '100%',
                padding: '9px 12px',
                background: 'var(--paper)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                color: 'var(--ink)',
                fontSize: '13px',
                fontFamily: 'IBM Plex Mono, monospace',
                boxSizing: 'border-box'
              }}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px',
              background: 'var(--stamp-red)',
              color: '#FFF',
              border: 'none',
              borderRadius: '4px',
              fontWeight: 700,
              fontSize: '12.5px',
              letterSpacing: '0.04em',
              fontFamily: 'IBM Plex Mono, monospace',
              cursor: 'pointer',
              marginBottom: currentUser ? '8px' : '16px',
              boxShadow: '0 2px 8px rgba(185, 28, 28, 0.3)'
            }}
          >
            {loading ? 'AUTHENTICATING…' : 'AUTHENTICATE SESSION'}
          </button>

          {currentUser && (
            <button
              type="button"
              onClick={handleLogout}
              style={{
                width: '100%',
                padding: '8px',
                background: 'transparent',
                color: 'var(--stamp-red)',
                border: '1px solid var(--stamp-red)',
                borderRadius: '4px',
                fontSize: '11px',
                fontFamily: 'IBM Plex Mono, monospace',
                fontWeight: 600,
                cursor: 'pointer',
                marginBottom: '16px'
              }}
            >
              SIGN OUT / SWITCH OFFICER
            </button>
          )}
        </form>

        {/* Quick Officer Persona Cards */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-muted)', marginBottom: '8px', fontFamily: 'IBM Plex Mono, monospace' }}>
            Quick Personnel Credentials:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {quickUsers.map((qu) => {
              const isSelected = username === qu.user;
              return (
                <button
                  key={qu.user}
                  type="button"
                  onClick={() => handleSelectQuickUser(qu)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: isSelected ? 'var(--tag-amber-bg)' : 'var(--panel-elevated)',
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
                    <code style={{ fontSize: '10px', color: 'var(--ink-muted)' }}>{qu.user}</code>
                  </div>
                  <span style={{
                    fontSize: '9px',
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontWeight: 700,
                    color: qu.color,
                    border: `1px solid ${qu.color}`,
                    borderRadius: '2px',
                    padding: '1px 5px'
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
