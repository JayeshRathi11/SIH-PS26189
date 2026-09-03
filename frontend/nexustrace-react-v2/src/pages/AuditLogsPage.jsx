import React from 'react';

export default function AuditLogsPage({ currentUser }) {
  const auditEntries = [
    { id: 'AUD-8821', time: 'Mon, 31 Aug 2026 19:14:02 UTC', action: 'OFFICER_VERIFICATION', officer: 'investigator_01', target: 'Iqbal Ansari', verdict: 'CONFIRMED', notes: 'Corroborated with Hawala intercept SL-042.' },
    { id: 'AUD-8820', time: 'Mon, 31 Aug 2026 19:08:15 UTC', action: 'DOSSIER_EXPORT_PDF', officer: 'investigator_01', target: 'ENT_HUB_IQBAL_ANSARI', verdict: 'SUCCESS', notes: 'Exported Section 65B Prosecution Brief.' },
    { id: 'AUD-8819', time: 'Mon, 31 Aug 2026 18:45:22 UTC', action: 'PII_REDACTION_PASS', officer: 'SYSTEM_AUTOPILOT', target: '10 Domain FIRs', verdict: 'REDACTED', notes: '48 Aadhaar & PAN instances masked.' },
    { id: 'AUD-8818', time: 'Mon, 31 Aug 2026 18:12:00 UTC', action: 'AUTHENTICATION_LOGIN', officer: 'investigator_01', target: 'PORTAL_ACCESS', verdict: 'AUTHORIZED', notes: 'JWT Token issued (Role: INVESTIGATOR).' },
    { id: 'AUD-8817', time: 'Mon, 31 Aug 2026 17:30:11 UTC', action: 'COMMUNITY_CLUSTERING', officer: 'SYSTEM_ANALYTICS', target: 'Global Master Graph', verdict: 'COMPLETED', notes: 'Louvain partitioning converged (Modular Score: 0.78).' }
  ];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header-row">
        <div>
          <div className="page-eyebrow">● IMMUTABLE SECURITY & DIGITAL CUSTODY</div>
          <h2 className="page-title">Digital Chain of Custody & Audit Ledger</h2>
          <p className="page-subtitle">
            Cryptographic ledger tracking all officer actions, human-in-the-loop decisions, court brief generations, and automated PII redactions.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{
            background: 'var(--stamp-green-bg)',
            border: '1px solid var(--stamp-green)',
            color: 'var(--stamp-green)',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '11px',
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: '3px'
          }}>
            🛡️ AUDIT INTEGRITY: VERIFIED
          </span>
        </div>
      </div>

      {/* Security Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div className="stat-summary-card">
          <div className="stat-summary-title">Active Security Session</div>
          <div className="stat-summary-value" style={{ fontSize: '16px', marginTop: '6px' }}>
            {currentUser?.username || 'investigator_01'} <span style={{ fontSize: '11px', color: 'var(--tag-amber)' }}>({currentUser?.role || 'INVESTIGATOR'})</span>
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
            SHA-256 HMAC / ECDSA
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
            Live Stream
          </span>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: 'var(--paper)', borderBottom: '1px solid var(--border)', fontFamily: 'IBM Plex Mono, monospace', fontSize: '10.5px', color: 'var(--ink-soft)', textTransform: 'uppercase' }}>
              <th style={{ padding: '10px 14px' }}>Log ID</th>
              <th style={{ padding: '10px 14px' }}>Timestamp</th>
              <th style={{ padding: '10px 14px' }}>Action Type</th>
              <th style={{ padding: '10px 14px' }}>Officer / Agent</th>
              <th style={{ padding: '10px 14px' }}>Target Asset</th>
              <th style={{ padding: '10px 14px' }}>Outcome</th>
              <th style={{ padding: '10px 14px' }}>Operational Notes</th>
            </tr>
          </thead>
          <tbody>
            {auditEntries.map((entry) => (
              <tr key={entry.id} style={{ borderBottom: '1px solid var(--border-subtle)' }} className="entity-row-hover">
                <td style={{ padding: '12px 14px', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, color: 'var(--tag-amber)' }}>
                  {entry.id}
                </td>
                <td style={{ padding: '12px 14px', fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: 'var(--ink-muted)' }}>
                  {entry.time}
                </td>
                <td style={{ padding: '12px 14px' }}>
                  <span style={{ background: 'var(--paper)', border: '1px solid var(--border)', padding: '2px 6px', borderRadius: '2px', fontSize: '10px', fontFamily: 'IBM Plex Mono, monospace' }}>
                    {entry.action}
                  </span>
                </td>
                <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--ink)' }}>
                  {entry.officer}
                </td>
                <td style={{ padding: '12px 14px', color: 'var(--ink-soft)' }}>
                  {entry.target}
                </td>
                <td style={{ padding: '12px 14px' }}>
                  <span className="conf-stamp" style={{ fontSize: '8px' }}>
                    {entry.verdict}
                  </span>
                </td>
                <td style={{ padding: '12px 14px', color: 'var(--ink-soft)', fontSize: '11.5px' }}>
                  {entry.notes}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
