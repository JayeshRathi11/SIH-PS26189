import React, { useState, useMemo } from 'react';
import { getDossierDownloadUrl } from '../api/client';

export default function EntitiesRegistryPage({
  entities,
  cases,
  activeCaseId,
  onSelectCase,
  onOpenEntityInBoard
}) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('centrality'); // 'centrality' | 'connections' | 'name'
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const entityTypes = [
    { id: 'ALL', label: 'All Types' },
    { id: 'person', label: 'People' },
    { id: 'location', label: 'Locations' },
    { id: 'org', label: 'Organizations' },
    { id: 'vehicle', label: 'Vehicles' },
    { id: 'phone', label: 'Phone Numbers' },
    { id: 'bank', label: 'Financial Accounts' },
  ];

  const filteredEntities = useMemo(() => {
    return entities
      .filter((e) => {
        if (typeFilter !== 'ALL' && e.type !== typeFilter) return false;
        if (search) {
          const q = search.toLowerCase();
          const matchesName = e.name?.toLowerCase().includes(q);
          const matchesRole = e.role?.toLowerCase().includes(q);
          const matchesAlias = e.aliases?.some(a => a.toLowerCase().includes(q));
          if (!matchesName && !matchesRole && !matchesAlias) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'centrality') {
          return (Number(b.centrality) || 0) - (Number(a.centrality) || 0);
        }
        if (sortBy === 'connections') {
          return (b.connections || 0) - (a.connections || 0);
        }
        return (a.name || '').localeCompare(b.name || '');
      });
  }, [entities, typeFilter, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredEntities.length / pageSize));
  const paginatedEntities = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEntities.slice(start, start + pageSize);
  }, [filteredEntities, currentPage, pageSize]);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header-row">
        <div>
          <div className="page-eyebrow">⟟ ENTITIES DIRECTORY</div>
          <h2 className="page-title">Entities Directory</h2>
          <p className="page-subtitle">
            Every person, place, vehicle, and account identified across all cases, in one place.
          </p>
        </div>

        {/* Domain Selector */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', fontFamily: 'IBM Plex Mono, monospace', color: 'var(--ink-soft)' }}>
            Domain:
          </span>
          <select
            value={activeCaseId}
            onChange={(e) => onSelectCase(e.target.value)}
            className="search-box"
            style={{ width: '260px' }}
          >
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.caseId} — {c.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <div className="filters" style={{ margin: 0 }}>
          {entityTypes.map((t) => (
            <span
              key={t.id}
              className={`filter-chip ${typeFilter === t.id ? 'active' : ''}`}
              onClick={() => setTypeFilter(t.id)}
            >
              {t.label}
            </span>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search name, alias, role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-box"
            style={{ width: '220px' }}
          />

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="search-box"
            style={{ width: '160px' }}
          >
            <option value="centrality">Sort: Most Connected</option>
            <option value="connections">Sort: Number of Links</option>
            <option value="name">Sort: Alphabetical</option>
          </select>
        </div>
      </div>

      {/* Summary Stat Counters */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
        <div className="stat-summary-card">
          <div className="stat-summary-title">Total Entities</div>
          <div className="stat-summary-value">{entities.length}</div>
        </div>
        <div className="stat-summary-card">
          <div className="stat-summary-title">Persons of Interest</div>
          <div className="stat-summary-value" style={{ color: 'var(--tag-amber)' }}>
            {entities.filter(e => e.type === 'person').length}
          </div>
        </div>
        <div className="stat-summary-card">
          <div className="stat-summary-title">Locations Identified</div>
          <div className="stat-summary-value" style={{ color: 'var(--stamp-green)' }}>
            {entities.filter(e => e.type === 'location').length}
          </div>
        </div>
        <div className="stat-summary-card">
          <div className="stat-summary-title">Verified by Officer</div>
          <div className="stat-summary-value" style={{ color: 'var(--stamp-blue)' }}>
            {entities.filter(e => e.verified_by_officer).length}
          </div>
        </div>
      </div>

      {/* Entities Table */}
      <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', fontWeight: 600, color: 'var(--ink)' }}>
            ENTITIES ({filteredEntities.length})
          </span>
          <span style={{ fontSize: '11px', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace' }}>
            Section 65B Certified
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: 'var(--paper)', borderBottom: '1px solid var(--border)', fontFamily: 'IBM Plex Mono, monospace', fontSize: '10.5px', color: 'var(--ink-soft)', textTransform: 'uppercase' }}>
                <th style={{ padding: '10px 14px' }}>Name</th>
                <th style={{ padding: '10px 14px' }}>Type</th>
                <th style={{ padding: '10px 14px' }}>Aliases</th>
                <th style={{ padding: '10px 14px' }}>Connections</th>
                <th style={{ padding: '10px 14px' }}>Importance</th>
                <th style={{ padding: '10px 14px' }}>Status</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedEntities.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px 14px', color: 'var(--ink-muted)' }}>
                    No entities match your search.
                  </td>
                </tr>
              ) : (
                paginatedEntities.map((entity) => {
                  const isConfirmed = entity.verified_by_officer || entity.status === 'CONFIRMED';
                  const isRejected = entity.status === 'REJECTED';
                  const centrality = typeof entity.centrality === 'number' ? entity.centrality.toFixed(4) : entity.centrality;
                  const dossierUrl = getDossierDownloadUrl(entity.id);

                  return (
                    <tr
                      key={entity.id}
                      style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.15s ease' }}
                      className="entity-row-hover"
                    >
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: '13px' }}>
                          {entity.name}
                        </div>
                        <div style={{ fontSize: '10.5px', color: 'var(--ink-muted)', marginTop: '2px' }}>
                          {entity.role}
                        </div>
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          fontSize: '10px',
                          fontFamily: 'IBM Plex Mono, monospace',
                          padding: '2px 6px',
                          borderRadius: '2px',
                          background: 'var(--paper)',
                          border: '1px solid var(--border)',
                          textTransform: 'uppercase'
                        }}>
                          {entity.typeLabel || entity.type}
                        </span>
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        {entity.aliases && entity.aliases.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', maxWidth: '240px' }}>
                            {entity.aliases.slice(0, 3).map((al, idx) => (
                              <span key={idx} style={{ background: 'var(--paper)', border: '1px solid var(--border)', padding: '1px 5px', borderRadius: '2px', fontSize: '9.5px', fontFamily: 'IBM Plex Mono, monospace' }}>
                                "{al}"
                              </span>
                            ))}
                            {entity.aliases.length > 3 && (
                              <span style={{ fontSize: '9px', color: 'var(--ink-muted)', alignSelf: 'center' }}>
                                +{entity.aliases.length - 3}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--ink-muted)', fontSize: '11px' }}>—</span>
                        )}
                      </td>

                      <td style={{ padding: '12px 14px', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600 }}>
                        {entity.connections}
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, color: 'var(--tag-amber)' }}>
                            {centrality}
                          </span>
                        </div>
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        {isConfirmed && (
                          <span className="conf-stamp" style={{ fontSize: '8px' }}>
                            ✓ VERIFIED
                          </span>
                        )}
                        {isRejected && (
                          <span className="conf-stamp" style={{ fontSize: '8px', color: 'var(--stamp-red)', borderColor: 'var(--stamp-red)', background: 'var(--stamp-red-bg)' }}>
                            ✗ REJECTED
                          </span>
                        )}
                        {!isConfirmed && !isRejected && (
                          <span style={{ fontSize: '10px', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace' }}>
                            PENDING
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            onClick={() => onOpenEntityInBoard(entity.id)}
                            className="tactical-btn"
                            style={{ padding: '3px 8px', fontSize: '10.5px' }}
                            title="Open on the case board"
                          >
                            📌 Board
                          </button>
                          <a
                            href={dossierUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="tactical-btn export"
                            style={{ padding: '3px 8px', fontSize: '10.5px' }}
                            title="Download court report (PDF)"
                          >
                            📄 PDF
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filteredEntities.length > pageSize && (
          <div style={{
            padding: '12px 18px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--paper)'
          }}>
            <span style={{ fontSize: '11px', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace' }}>
              Showing {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, filteredEntities.length)} of {filteredEntities.length} entities
            </span>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="tactical-btn"
                style={{ padding: '4px 10px', fontSize: '11px', opacity: currentPage === 1 ? 0.5 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
              >
                ◀ Prev
              </button>
              <span style={{ fontSize: '11px', fontFamily: 'IBM Plex Mono, monospace', color: 'var(--ink)' }}>
                Page {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="tactical-btn"
                style={{ padding: '4px 10px', fontSize: '11px', opacity: currentPage === totalPages ? 0.5 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
              >
                Next ▶
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
