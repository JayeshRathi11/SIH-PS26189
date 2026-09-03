import React, { useState, useEffect, useMemo } from 'react';
import { fetchAuditLogs, verifyAuditChain } from '../api/client';

const PAGE_SIZE = 10;

function formatTimestamp(iso) {
  if (!iso) return '—';
  // The backend stores/returns timestamps in UTC (datetime.utcnow()); the
  // audit ledger is an India MHA/NCRB system, so display in IST (UTC+5:30,
  // no DST) rather than the browser's local zone or raw UTC.
  const d = new Date(iso.endsWith('Z') || iso.includes('+') ? iso : `${iso}Z`);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
  }) + ' IST';
}

function shortHash(h) {
  if (!h) return '—';
  return h.length > 10 ? `${h.slice(0, 8)}…` : h;
}

export default function AuditLogsPage({ currentUser }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [forbidden, setForbidden] = useState(false);
  const [page, setPage] = useState(0);
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifying, setVerifying] = useState(false);

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const result = await verifyAuditChain();
      setVerifyResult(result);
    } catch (err) {
      setVerifyResult({ valid: false, message: err.message || 'Verification request failed.' });
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      setForbidden(false);
      try {
        // Pull a generous window of entries once, and page through it
        // client-side -- the ledger's own endpoint only takes a flat
        // `limit`, not skip/offset, so 10-at-a-time navigation happens here.
        const data = await fetchAuditLogs(0, 500);
        if (isMounted) {
          setEntries(Array.isArray(data) ? data : []);
          setPage(0);
        }
      } catch (err) {
        if (!isMounted) return;
        if (err.message && err.message.includes('403')) {
          setForbidden(true);
        } else {
          setError(err.message || 'Failed to load audit log.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, []);

  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const pageEntries = useMemo(
    () => entries.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [entries, page]
  );

  const goPrev = () => setPage((p) => Math.max(0, p - 1));
  const goNext = () => setPage((p) => Math.min(totalPages - 1, p + 1));

  // Tampering-caught detection: purely derived from entries already on
  // screen, no backend change. For each resource that received more than
  // one INVESTIGATOR_FEEDBACK_SUBMITTED verdict, walk them oldest-to-newest
  // (entries arrive newest-first from the API) -- any entry submitted by a
  // DIFFERENT username than the one immediately before it on that same
  // resource is a corrective override: one officer's verdict was reversed
  // by another. That's the "tampering found" moment made visible.
  const parseVerdict = (details) => {
    const m = /Verdict:\s*([A-Z]+)/i.exec(details || '');
    return m ? m[1].toUpperCase() : null;
  };

  const overrides = useMemo(() => {
    const feedbackEntries = entries.filter(
      (e) => e.action === 'INVESTIGATOR_FEEDBACK_SUBMITTED' && e.resource_id
    );
    const byResource = {};
    feedbackEntries.forEach((e) => {
      (byResource[e.resource_id] = byResource[e.resource_id] || []).push(e);
    });
    const map = {}; // entry.id -> override info
    const list = [];
    Object.values(byResource).forEach((group) => {
      const chrono = [...group].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      for (let i = 1; i < chrono.length; i++) {
        const prev = chrono[i - 1];
        const cur = chrono[i];
        if (prev.username && cur.username && prev.username !== cur.username) {
          const info = {
            prevUsername: prev.username,
            prevVerdict: parseVerdict(prev.details),
            newUsername: cur.username,
            newVerdict: parseVerdict(cur.details),
            resource: cur.resource_id,
            timestamp: cur.timestamp,
          };
          map[cur.id] = info;
          list.push(info);
        }
      }
    });
    return { map, list };
  }, [entries]);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header-row">
        <div>
          <div className="page-eyebrow">● IMMUTABLE SECURITY & DIGITAL CUSTODY</div>
          <h2 className="page-title">Digital Chain of Custody & Audit Ledger</h2>
          <p className="page-subtitle">
            Live cryptographic ledger of every officer action, human-in-the-loop decision, court brief
            generation, and automated PII redaction — pulled directly from the SHA-256 hash-chained
            audit_logs table.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={handleVerify}
            disabled={verifying}
            className="tactical-btn"
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '11px',
              fontWeight: 700,
              padding: '6px 12px',
              cursor: verifying ? 'default' : 'pointer'
            }}
          >
            {verifying ? 'VERIFYING CHAIN…' : '🛡️ VERIFY CHAIN INTEGRITY'}
          </button>
        </div>
      </div>

      {verifyResult && (
        <div style={{
          margin: '0 0 16px',
          padding: '10px 14px',
          borderRadius: '3px',
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: '12px',
          background: verifyResult.valid ? 'var(--stamp-green-bg)' : 'var(--stamp-red-bg)',
          border: `1px solid ${verifyResult.valid ? 'var(--stamp-green)' : 'var(--stamp-red)'}`,
          color: verifyResult.valid ? 'var(--stamp-green)' : 'var(--stamp-red)'
        }}>
          {verifyResult.valid
            ? `✓ CHAIN VALID — all ${verifyResult.total_entries ?? 0} entries recomputed and matched. No tampering detected.`
            : `⚠️ CHAIN INTEGRITY FAILURE — ${verifyResult.message || 'a stored hash did not match its recomputed value.'}${verifyResult.broken_at ? ` (first break at entry ${verifyResult.broken_at})` : ''}`}
        </div>
      )}

      {overrides.list.length > 0 && (
        <div style={{
          margin: '0 0 16px',
          padding: '12px 14px',
          borderRadius: '3px',
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: '12px',
          background: 'var(--tag-amber-bg)',
          border: '1px solid var(--tag-amber)',
          color: 'var(--tag-amber)'
        }}>
          <div style={{ fontWeight: 700, marginBottom: overrides.list.length ? '6px' : 0 }}>
            🚩 {overrides.list.length} CORRECTIVE OVERRIDE{overrides.list.length > 1 ? 'S' : ''} DETECTED — a verdict was reversed by a different officer
          </div>
          {overrides.list.map((o, i) => (
            <div key={i} style={{ fontSize: '11px', opacity: 0.9 }}>
              {o.newUsername} reversed {o.prevUsername}'s {o.prevVerdict || 'earlier'} verdict on {o.resource} → now {o.newVerdict || 'updated'} ({formatTimestamp(o.timestamp)})
            </div>
          ))}
        </div>
      )}

      {/* Security Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div className="stat-summary-card">
          <div className="stat-summary-title">Active Security Session</div>
          <div className="stat-summary-value" style={{ fontSize: '16px', marginTop: '6px' }}>
            {currentUser?.username || '—'} <span style={{ fontSize: '11px', color: 'var(--tag-amber)' }}>({currentUser?.role || '—'})</span>
          </div>
        </div>
        <div className="stat-summary-card">
          <div className="stat-summary-title">Compliance Standard</div>
          <div className="stat-summary-value" style={{ fontSize: '16px', marginTop: '6px', color: 'var(--stamp-blue)' }}>
            MHA-NCRB / Indian Evidence Act
          </div>
        </div>
        <div className="stat-summary-card">
          <div className="stat-summary-title">Ledger Signature Algorithm</div>
          <div className="stat-summary-value" style={{ fontSize: '14px', fontFamily: 'IBM Plex Mono, monospace', marginTop: '6px' }}>
            SHA-256 Hash Chain
          </div>
        </div>
      </div>

      {/* Audit Table */}
      <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', fontWeight: 600, color: 'var(--ink)' }}>
            CHRONOLOGICAL AUDIT LOG ENTRIES
          </span>
          <span style={{ fontSize: '11px', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace' }}>
            {loading ? 'Loading…' : `${entries.length} entries`}
          </span>
        </div>

        {loading && (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--tag-amber)', fontFamily: 'IBM Plex Mono, monospace', fontSize: '12.5px' }}>
            ⟳ Reading the audit ledger…
          </div>
        )}

        {!loading && forbidden && (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--ink-muted)' }}>
            <div style={{ fontSize: '13px', marginBottom: '6px' }}>
              This ledger is restricted to the <b>Officer-in-Charge</b> and <b>Auditor</b> roles.
            </div>
            <div style={{ fontSize: '11.5px' }}>
              Signed in as {currentUser?.username || 'this account'} ({currentUser?.role || 'unknown role'}) — access denied by the API (HTTP 403), not just hidden by the UI.
            </div>
          </div>
        )}

        {!loading && !forbidden && error && (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--stamp-red)', fontSize: '12.5px' }}>
            ⚠️ {error}
          </div>
        )}

        {!loading && !forbidden && !error && entries.length === 0 && (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--ink-muted)', fontSize: '12.5px' }}>
            No audit entries recorded yet. Every login, pipeline run, officer verification, and dossier export will appear here as it happens.
          </div>
        )}

        {!loading && !forbidden && !error && entries.length > 0 && (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: 'var(--paper)', borderBottom: '1px solid var(--border)', fontFamily: 'IBM Plex Mono, monospace', fontSize: '10.5px', color: 'var(--ink-soft)', textTransform: 'uppercase' }}>
                    <th style={{ padding: '10px 14px' }}>Log ID</th>
                    <th style={{ padding: '10px 14px' }}>Timestamp</th>
                    <th style={{ padding: '10px 14px' }}>Action Type</th>
                    <th style={{ padding: '10px 14px' }}>Officer / Agent</th>
                    <th style={{ padding: '10px 14px' }}>IP Address</th>
                    <th style={{ padding: '10px 14px' }}>Target Asset</th>
                    <th style={{ padding: '10px 14px' }}>Details</th>
                    <th style={{ padding: '10px 14px' }}>Outcome</th>
                    <th style={{ padding: '10px 14px' }}>Content Hash</th>
                    <th style={{ padding: '10px 14px' }}>Prev Hash</th>
                    <th style={{ padding: '10px 14px' }}>Entry Hash</th>
                  </tr>
                </thead>
                <tbody>
                  {pageEntries.map((entry) => {
                    const overrideInfo = overrides.map[entry.id];
                    return (
                    <tr
                      key={entry.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        background: overrideInfo ? 'var(--tag-amber-bg)' : undefined,
                      }}
                      className="entity-row-hover"
                    >
                      <td style={{ padding: '12px 14px', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, color: 'var(--tag-amber)' }}>
                        AUD-{entry.id}
                      </td>
                      <td style={{ padding: '12px 14px', fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: 'var(--ink-muted)', whiteSpace: 'nowrap' }}>
                        {formatTimestamp(entry.timestamp)}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ background: 'var(--paper)', border: '1px solid var(--border)', padding: '2px 6px', borderRadius: '2px', fontSize: '10px', fontFamily: 'IBM Plex Mono, monospace', whiteSpace: 'nowrap' }}>
                          {entry.action}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap' }}>
                        {entry.username || '—'}
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--ink-soft)', fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', whiteSpace: 'nowrap' }}>
                        {entry.ip_address || '—'}
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--ink-soft)', whiteSpace: 'nowrap' }}>
                        {entry.resource_type ? `${entry.resource_type}${entry.resource_id ? ` · ${entry.resource_id}` : ''}` : (entry.resource_id || '—')}
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--ink-soft)', fontSize: '11px', maxWidth: '260px' }} title={entry.details || ''}>
                        {entry.details || '—'}
                        {overrideInfo && (
                          <div style={{ marginTop: '4px', fontWeight: 700, color: 'var(--tag-amber)', fontSize: '10px' }}>
                            🚩 OVERRIDES {overrideInfo.prevUsername}'s {overrideInfo.prevVerdict || 'earlier'} verdict
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span className="conf-stamp" style={{ fontSize: '8px' }}>
                          {entry.status || 'RECORDED'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--ink-soft)', fontSize: '10.5px', fontFamily: 'IBM Plex Mono, monospace' }} title={entry.content_hash || ''}>
                        {shortHash(entry.content_hash)}
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--ink-soft)', fontSize: '10.5px', fontFamily: 'IBM Plex Mono, monospace' }} title={entry.prev_hash || ''}>
                        {shortHash(entry.prev_hash)}
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--ink-soft)', fontSize: '10.5px', fontFamily: 'IBM Plex Mono, monospace' }} title={entry.entry_hash || ''}>
                        {shortHash(entry.entry_hash)}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: '11px', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace' }}>
                Page {page + 1} of {totalPages} — showing {pageEntries.length} of {entries.length} entries
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="tactical-btn"
                  onClick={goPrev}
                  disabled={page === 0}
                  style={{ opacity: page === 0 ? 0.5 : 1, cursor: page === 0 ? 'not-allowed' : 'pointer' }}
                >
                  &#8592; Prev
                </button>
                <button
                  className="tactical-btn"
                  onClick={goNext}
                  disabled={page >= totalPages - 1}
                  style={{ opacity: page >= totalPages - 1 ? 0.5 : 1, cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer' }}
                >
                  Next &#8594;
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
