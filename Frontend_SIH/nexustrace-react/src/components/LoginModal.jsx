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
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: '#111827',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '440px',
        padding: '24px',
        color: '#F9FAFB',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Secure Terminal Access</h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#9CA3AF' }}>MHA / NCRB Role-Based Authentication</p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#9CA3AF',
              fontSize: '1.25rem',
              cursor: 'pointer'
            }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid #EF4444',
            color: '#FCA5A5',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '0.85rem',
            marginBottom: '16px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: '#D1D5DB' }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '0.9rem',
                boxSizing: 'border-box'
              }}
              required
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: '#D1D5DB' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '0.9rem',
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
              background: '#DC2626',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '0.95rem',
              cursor: 'pointer',
              marginBottom: '16px'
            }}
          >
            {loading ? 'Authenticating...' : 'Authenticate Officer Session'}
          </button>
        </form>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '14px' }}>
          <p style={{ margin: '0 0 8px', fontSize: '0.75rem', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Quick Persona Switcher:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {quickUsers.map((qu) => (
              <button
                key={qu.user}
                type="button"
                onClick={() => handleSelectQuickUser(qu)}
                style={{
                  background: username === qu.user ? 'rgba(220, 38, 38, 0.2)' : '#1F2937',
                  border: username === qu.user ? '1px solid #DC2626' : '1px solid #374151',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  color: '#E5E7EB',
                  fontSize: '0.8rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <span>{qu.name} (<code>{qu.user}</code>)</span>
                <span style={{ color: '#9CA3AF', fontSize: '0.75rem' }}>{qu.role}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
