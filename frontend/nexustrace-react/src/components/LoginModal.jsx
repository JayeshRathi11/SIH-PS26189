import React, { useState } from 'react';
import { loginUser } from '../api/client';

export default function LoginModal({ isOpen, onClose, currentUser, onUserChange }) {
  if (!isOpen) return null;

  const [username, setUsername] = useState(currentUser?.username || 'investigator_01');
  const [password, setPassword] = useState('Investigate#2026');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectQuickUser = (u) => {
    setUsername(u.user);
    setPassword(u.pass);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: 'rgba(0, 0, 0, 0.55)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'var(--panel)',
        border: '1px solid var(--border)',
        borderTop: '3px solid var(--stamp-red)',
        borderRadius: 'var(--radius-md)',
        width: '100%',
        maxWidth: '440px',
        padding: '24px',
        color: 'var(--ink)',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Secure Terminal Access</h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--ink-soft)' }}>MHA / NCRB Role-Based Authentication</p>
          </div>
          <button
            type="button"
            className="btn icon-btn btn-ghost"
            onClick={onClose}
            title="Close"
            aria-label="Close session switcher"
          >
            ✕
          </button>
        </div>

        {error && (
          <div style={{
            background: 'var(--danger-soft)',
            border: '1px solid var(--stamp-red)',
            color: 'var(--stamp-red)',
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            marginBottom: '16px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--ink-soft)' }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'var(--paper)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--ink)',
                fontSize: '0.9rem',
                boxSizing: 'border-box'
              }}
              required
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--ink-soft)' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'var(--paper)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--ink)',
                fontSize: '0.9rem',
                boxSizing: 'border-box'
              }}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: '10px', fontSize: '0.95rem', marginBottom: '16px' }}
          >
            {loading ? 'Authenticating...' : 'Authenticate Officer Session'}
          </button>
        </form>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
          <p style={{ margin: '0 0 8px', fontSize: '0.75rem', color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Quick Persona Switcher:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {quickUsers.map((qu) => (
              <button
                key={qu.user}
                type="button"
                onClick={() => handleSelectQuickUser(qu)}
                style={{
                  background: username === qu.user ? 'var(--danger-soft)' : 'var(--paper)',
                  border: username === qu.user ? '1px solid var(--stamp-red)' : '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '6px 10px',
                  color: 'var(--ink)',
                  fontSize: '0.8rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <span>{qu.name} (<code>{qu.user}</code>)</span>
                <span className="badge">{qu.role}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
