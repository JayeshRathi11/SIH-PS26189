import React, { useState, useEffect } from 'react';
import { fetchAuditLogs, verifyAuditChain } from '../api/client';

function formatAuditTimestamp(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

export default function AuditLogsPage({ currentUser }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionFilter, setActionFilter] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);
  const [verifying, setVerifying] = useState(false);

  const loadLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAuditLogs(100, actionFilter || null);
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [actionFilter]);

  const handleVerifyChain = async () => {
    setVerifying(true);
    try {
      const res = await verifyAuditChain();
      setVerificationResult(res);
    } catch (err) {
      setVerificationResult({
        valid: false,
        message: `Verification check failed: ${err.message}`
      });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="page-container" style={{ padding: '24px', overflowY: 'auto', height: '100vh', boxSizing: 'border-box' }}>
      {/* Header */}
      <div className="page-header-row" style={{ marginBottom: '20px' }}>
        <div>
          <div className="page-eyebrow" style={{ color: 'var(--stamp-green)', fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace' }}>
            ● IMMUTABLE SECURITY & DIGITAL CUSTODY
          </div>
          <h2 className="page-title" style={{ margin: '4px 0', fontSize: '22px', fontFamily: 'Space Grotesk, sans-serif' }}>
            Digital Chain of Custody & Audit Ledger
          </h2>
          <p className="page-subtitle" style={{ margin: 0, color: 'var(--ink-muted)', fontSize: '12.5px' }}>
            Cryptographic SHA-256 tamper-evident ledger tracking all investigative operations, case registrations, evidence uploads, court brief exports, and officer decisions.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={handleVerifyChain}
            disabled={verifying}
            className="tactical-btn"
            style={{
              background: 'var(--stamp-green)',
              color: '#FFF',
              border: 'none',
              padding: '8px 14px',
              borderRadius: '4px',
              fontWeight: 700,
              fontSize: '11.5px',
              fontFamily: 'IBM Plex Mono, monospace',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(21, 128, 61, 0.3)'
            }}
          >
            {verifying ? '⚙️ Walking Hash Chain...' : '🛡️ Verify Chain Integrity (O(n))'}
          </button>
        </div>
      </div>

      {/* Verification Result Banner */}
      {verificationResult && (
        <div
          style={{
            padding: '12px 18px',
            marginBottom: '20px',
            borderRadius: '6px',
            border: verificationResult.valid ? '1px solid var(--stamp-green)' : '1px solid var(--stamp-red)',
            background: verificationResult.valid ? 'var(--stamp-green-bg)' : 'var(--stamp-red-bg)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: '13px', color: verificationResult.valid ? 'var(--stamp-green)' : 'var(--stamp-red)', fontFamily: 'Space Grotesk, sans-serif' }}>
              {verificationResult.valid ? '✓ HASH CHAIN VERIFIED — INTACT' : '⚠️ CHAIN INTEGRITY ALERT — DISCREPANCY DETECTED'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--ink)', marginTop: '2px', fontFamily: 'IBM Plex Mono, monospace' }}>
              {verificationResult.message}
            </div>
          </div>
          {verificationResult.chain_head && (
            <div style={{ fontSize: '10px', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace', textAlign: 'right' }}>
              HEAD: {verificationResult.chain_head.substring(0, 16)}...
            </div>
          )}
        </div>
      )}

      {/* Security Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '6px', padding: '14px' }}>
          <div style={{ fontSize: '10px', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', fontWeight: 700 }}>Total Ledger Records</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--ink)', marginTop: '4px', fontFamily: 'Space Grotesk, sans-serif' }}>{logs.length}</div>
        </div>

        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '6px', padding: '14px' }}>
          <div style={{ fontSize: '10px', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', fontWeight: 700 }}>Active Officer Persona</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--tag-amber)', marginTop: '8px', fontFamily: 'IBM Plex Mono, monospace' }}>
            {currentUser?.username || 'investigator_01'}
          </div>
        </div>

        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '6px', padding: '14px' }}>
          <div style={{ fontSize: '10px', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', fontWeight: 700 }}>Legal Benchmark</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--stamp-blue)', marginTop: '8px', fontFamily: 'IBM Plex Mono, monospace' }}>
            Sec 65B Indian Evidence Act
          </div>
        </div>

        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '6px', padding: '14px' }}>
          <div style={{ fontSize: '10px', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', fontWeight: 700 }}>Tamper-Evident Algorithm</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--stamp-green)', marginTop: '8px', fontFamily: 'IBM Plex Mono, monospace' }}>
            SHA-256 Hash Chain
          </div>
        </div>
      </div>

      {/* Audit Table */}
      <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden', boxShadow: 'var(--shadow-node)' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', background: 'var(--panel-elevated)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11.5px', fontWeight: 700, color: 'var(--ink)', textTransform: 'uppercase' }}>
            LIVE CRYPTOGRAPHIC AUDIT TRAIL ({logs.length} ENTRIES)
          </span>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="search-box"
              style={{ padding: '5px 10px', fontSize: '11px', borderRadius: '4px' }}
            >
              <option value="">All Action Types</option>
              <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
              <option value="CASE_CREATE">CASE_CREATE</option>
              <option value="CASE_STATUS_CHANGE">CASE_STATUS_CHANGE</option>
              <option value="CASE_ARCHIVE">CASE_ARCHIVE</option>
              <option value="DOCUMENT_UPLOADED">DOCUMENT_UPLOADED</option>
              <option value="DOSSIER_EXPORTED">DOSSIER_EXPORTED</option>
              <option value="INVESTIGATOR_FEEDBACK_SUBMITTED">INVESTIGATOR_FEEDBACK_SUBMITTED</option>
              <option value="PIPELINE_RUN_TRIGGERED">PIPELINE_RUN_TRIGGERED</option>
            </select>
            <button
              onClick={loadLogs}
              className="tactical-btn"
              style={{ padding: '5px 10px', fontSize: '11px' }}
            >
              ⟳ Refresh
            </button>
          </div>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--ink-muted)', fontSize: '12px' }}>
            Loading tamper-evident ledger...
          </div>
        )}

        {error && (
          <div style={{ padding: '16px', color: 'var(--stamp-red)', background: 'var(--stamp-red-bg)', fontSize: '12px' }}>
            ⚠️ Error loading audit logs: {error}
          </div>
        )}

        {!loading && !error && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: 'var(--paper)', borderBottom: '1px solid var(--border)', fontFamily: 'IBM Plex Mono, monospace', fontSize: '10.5px', color: 'var(--ink-soft)', textTransform: 'uppercase' }}>
                  <th style={{ padding: '10px 14px' }}>Log ID</th>
                  <th style={{ padding: '10px 14px' }}>Timestamp</th>
                  <th style={{ padding: '10px 14px' }}>Action</th>
                  <th style={{ padding: '10px 14px' }}>Officer / Agent</th>
                  <th style={{ padding: '10px 14px' }}>Target Asset</th>
                  <th style={{ padding: '10px 14px' }}>Status</th>
                  <th style={{ padding: '10px 14px' }}>Details</th>
                  <th style={{ padding: '10px 14px' }}>Chain Hash (SHA-256)</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px 14px', color: 'var(--ink-muted)' }}>No audit log entries matching criteria.</td></tr>
                ) : (
                  logs.map((entry) => (
                    <tr key={entry.id} style={{ borderBottom: '1px solid var(--border-subtle)' }} className="entity-row-hover">
                      <td style={{ padding: '10px 14px', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, color: 'var(--tag-amber)', fontSize: '11px' }}>
                        #{entry.id}
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'IBM Plex Mono, monospace', fontSize: '10.5px', color: 'var(--ink-muted)', whiteSpace: 'nowrap' }}>
                        {formatAuditTimestamp(entry.timestamp)}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ background: 'var(--paper)', border: '1px solid var(--border)', padding: '2px 6px', borderRadius: '3px', fontSize: '9.5px', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600, color: 'var(--ink)' }}>
                          {entry.action}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--ink)', fontSize: '11.5px' }}>
                        {entry.username || 'system'}
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--ink-soft)', fontSize: '11px' }}>
                        {entry.resource_id ? `${entry.resource_type || ''}: ${entry.resource_id}` : '—'}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          fontSize: '9px',
                          fontFamily: 'IBM Plex Mono, monospace',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '2px',
                          background: entry.status === 'SUCCESS' ? 'var(--stamp-green-bg)' : 'var(--stamp-red-bg)',
                          border: entry.status === 'SUCCESS' ? '1px solid var(--stamp-green)' : '1px solid var(--stamp-red)',
                          color: entry.status === 'SUCCESS' ? 'var(--stamp-green)' : 'var(--stamp-red)'
                        }}>
                          {entry.status || 'SUCCESS'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--ink-soft)', fontSize: '11px', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {entry.details || '—'}
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: 'var(--ink-muted)' }}>
                        {entry.entry_hash ? (
                          <span title={`Entry: ${entry.entry_hash}\nPrev: ${entry.prev_hash || 'GENESIS'}`}>
                            🔒 {entry.entry_hash.substring(0, 12)}...
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
