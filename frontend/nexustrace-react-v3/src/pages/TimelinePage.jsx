import React, { useState, useEffect } from 'react';
import { fetchTimelineEvents, CASE_TO_DOMAIN_MAP, DOMAIN_TITLES } from '../api/client';

export default function TimelinePage({ cases, activeCaseId, onSelectCase, onOpenEntityInBoard }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('ALL');

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetchTimelineEvents(activeCaseId)
      .then((data) => {
        if (isMounted) {
          setEvents(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeCaseId]);

  // Extract available unique event types for filtering
  const eventTypes = ['ALL', ...Array.from(new Set(events.map((e) => e.event_type || 'INTERACTION')))];

  const filteredEvents = events.filter((ev) => {
    const matchesType = eventTypeFilter === 'ALL' || ev.event_type === eventTypeFilter;
    if (!matchesType) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (ev.source && ev.source.toLowerCase().includes(q)) ||
      (ev.target && ev.target.toLowerCase().includes(q)) ||
      (ev.event_type && ev.event_type.toLowerCase().includes(q)) ||
      (ev.evidence && ev.evidence.toLowerCase().includes(q)) ||
      (ev.domain && ev.domain.toLowerCase().includes(q)) ||
      (ev.timestamp && ev.timestamp.toLowerCase().includes(q))
    );
  });

  return (
    <div className="page-container" style={{ padding: '24px', overflowY: 'auto', height: '100vh', boxSizing: 'border-box' }}>
      {/* Header bar */}
      <div className="page-header" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>⏱️</span>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--ink)', fontFamily: 'Space Grotesk, sans-serif' }}>
              Chronological Intelligence Timeline
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--ink-muted)' }}>
              Temporal event sequence reconstruction across wiretaps, surveillance logs, and financial transactions.
            </p>
          </div>
        </div>

        {/* Controls Bar */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '16px', alignItems: 'center' }}>
          {/* Case Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontFamily: 'IBM Plex Mono, monospace', color: 'var(--ink-muted)' }}>CASE:</span>
            <select
              value={activeCaseId}
              onChange={(e) => onSelectCase(e.target.value)}
              className="case-dropdown"
              style={{
                padding: '6px 12px',
                background: 'var(--panel)',
                border: '1px solid var(--border)',
                color: 'var(--ink)',
                borderRadius: '3px',
                fontSize: '12px',
                fontFamily: 'IBM Plex Sans, sans-serif'
              }}
            >
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          {/* Event Type Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontFamily: 'IBM Plex Mono, monospace', color: 'var(--ink-muted)' }}>TYPE:</span>
            <select
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
              style={{
                padding: '6px 12px',
                background: 'var(--panel)',
                border: '1px solid var(--border)',
                color: 'var(--ink)',
                borderRadius: '3px',
                fontSize: '12px',
                fontFamily: 'IBM Plex Mono, monospace'
              }}
            >
              {eventTypes.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
            <input
              type="text"
              placeholder="Search timeline events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '6px 12px',
                background: 'var(--panel)',
                border: '1px solid var(--border)',
                color: 'var(--ink)',
                borderRadius: '3px',
                fontSize: '12px',
                minWidth: '220px',
                fontFamily: 'IBM Plex Sans, sans-serif'
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  padding: '6px 10px',
                  background: 'var(--panel)',
                  border: '1px solid var(--border)',
                  color: 'var(--ink)',
                  cursor: 'pointer',
                  borderRadius: '3px'
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace' }}>
          <span className="status-dot"></span> Synthesizing Chronological Event Sequence...
        </div>
      )}

      {/* Error state */}
      {error && (
        <div style={{ padding: '16px', background: 'rgba(185, 28, 28, 0.1)', border: '1px solid var(--stamp-red)', color: 'var(--stamp-red)', borderRadius: '4px', marginBottom: '20px', fontSize: '13px' }}>
          ⚠️ Failed to load chronological events: {error}
        </div>
      )}

      {/* Event list */}
      {!loading && !error && filteredEvents.length === 0 && (
        <div style={{ padding: '48px 24px', textAlign: 'center', background: 'var(--panel)', border: '1px dashed var(--border)', borderRadius: '4px', color: 'var(--ink-muted)' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>📭</div>
          <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '6px' }}>No timestamped events recorded</div>
          <div style={{ fontSize: '12px' }}>No intelligence interactions matched the current search criteria or domain filter.</div>
        </div>
      )}

      {!loading && !error && filteredEvents.length > 0 && (
        <div className="timeline-stream" style={{ position: 'relative', paddingLeft: '32px', marginTop: '24px' }}>
          {/* Vertical axis line */}
          <div style={{
            position: 'absolute',
            left: '11px',
            top: '8px',
            bottom: '8px',
            width: '2px',
            background: 'var(--border)'
          }} />

          {filteredEvents.map((ev, idx) => (
            <div key={idx} className="timeline-card-wrap" style={{ position: 'relative', marginBottom: '20px' }}>
              {/* Pin indicator */}
              <div style={{
                position: 'absolute',
                left: '-26px',
                top: '14px',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: 'var(--tag-amber)',
                border: '2px solid var(--paper)',
                boxShadow: '0 0 0 2px var(--border)'
              }} />

              <div className="timeline-card" style={{
                background: 'var(--panel)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                padding: '16px',
                boxShadow: 'var(--shadow-paper)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      padding: '2px 8px',
                      background: 'var(--tag-amber)',
                      color: 'var(--on-amber)',
                      fontSize: '10px',
                      fontWeight: 700,
                      fontFamily: 'IBM Plex Mono, monospace',
                      borderRadius: '2px',
                      letterSpacing: '0.5px'
                    }}>
                      {ev.timestamp || 'UNDATED'}
                    </span>

                    <span style={{
                      padding: '2px 8px',
                      background: 'rgba(0,0,0,0.06)',
                      border: '1px solid var(--border-dim)',
                      color: 'var(--ink)',
                      fontSize: '10px',
                      fontFamily: 'IBM Plex Mono, monospace',
                      borderRadius: '2px',
                      textTransform: 'uppercase'
                    }}>
                      {ev.event_type ? ev.event_type.replace(/_/g, ' ') : 'ASSOCIATION'}
                    </span>
                  </div>

                  <span style={{ fontSize: '10px', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace' }}>
                    Domain: {(ev.domain || 'GLOBAL').replace(/_/g, ' ')}
                  </span>
                </div>

                {/* Subjects Chain */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '13px', fontWeight: 600 }}>
                  <span style={{ color: 'var(--ink)', cursor: onOpenEntityInBoard ? 'pointer' : 'default', textDecoration: onOpenEntityInBoard ? 'underline' : 'none' }}
                    onClick={() => onOpenEntityInBoard && onOpenEntityInBoard(ev.source)}>
                    {ev.source || 'Unknown Operative'}
                  </span>
                  <span style={{ color: 'var(--tag-amber)', fontSize: '12px' }}>➔</span>
                  <span style={{ color: 'var(--ink)', cursor: onOpenEntityInBoard ? 'pointer' : 'default', textDecoration: onOpenEntityInBoard ? 'underline' : 'none' }}
                    onClick={() => onOpenEntityInBoard && onOpenEntityInBoard(ev.target)}>
                    {ev.target || 'Target Entity'}
                  </span>
                </div>

                {/* Evidence snippet */}
                {ev.evidence && (
                  <div style={{
                    fontSize: '12px',
                    color: 'var(--ink-muted)',
                    fontStyle: 'italic',
                    background: 'rgba(0,0,0,0.03)',
                    padding: '8px 12px',
                    borderLeft: '3px solid var(--tag-amber)',
                    borderRadius: '0 3px 3px 0',
                    lineHeight: '1.5'
                  }}>
                    "{ev.evidence}"
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
