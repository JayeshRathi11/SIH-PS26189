import React, { useState } from 'react';
import { explainPath } from '../api/client';

export default function XaiConsolePage({ entities }) {
  const [sourceName, setSourceName] = useState(entities.length > 1 ? entities[1]?.name || 'Rina Das' : 'Rina Das');
  const [targetName, setTargetName] = useState('Iqbal Ansari');
  const [maxHops, setMaxHops] = useState(4);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleTracePath = async (e) => {
    e?.preventDefault();
    if (!sourceName || !targetName) return;
    setLoading(true);
    setError(null);
    try {
      const data = await explainPath(sourceName, targetName, maxHops);
      setResult(data);
    } catch (err) {
      setError(err.message || 'Failed to compute evidentiary chain.');
    } finally {
      setLoading(false);
    }
  };

  const sampleSubjects = [
    { source: 'Rina Das', target: 'Iqbal Ansari', desc: 'Human Trafficking Courier to Master Controller' },
    { source: 'Rohit Chaurasia', target: 'Iqbal Ansari', desc: 'Cyber Fraud Mule to Kingpin' },
    { source: 'Farhan Qureshi', target: 'Iqbal Ansari', desc: 'Narcotics Distributor to Central Hub' },
    { source: 'Ajay Bhonsle', target: 'Iqbal Ansari', desc: 'Hawala Agent to Syndicate Financier' }
  ];

  const handleSetSample = (s, t) => {
    setSourceName(s);
    setTargetName(t);
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header-row">
        <div>
          <div className="page-eyebrow">● EXPLAINABLE AI (XAI) PATHFINDER</div>
          <h2 className="page-title">Evidentiary Reasoning & Link Pathfinding Console</h2>
          <p className="page-subtitle">
            Trace deterministic intelligence chains between any perimeter operative and the central syndicate hub with hop-by-hop legal corroboration.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Left Query Configuration Card */}
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '3px', padding: '18px' }}>
          <h3 style={{ margin: '0 0 14px', fontSize: '15px', fontFamily: 'Space Grotesk, sans-serif' }}>
            Pathfinding Parameters
          </h3>

          <form onSubmit={handleTracePath}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontFamily: 'IBM Plex Mono, monospace', color: 'var(--ink-soft)', marginBottom: '4px' }}>
                Source Subject / Operative:
              </label>
              <input
                type="text"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                className="search-box"
                placeholder="e.g. Rina Das or Phone Number"
                required
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontFamily: 'IBM Plex Mono, monospace', color: 'var(--ink-soft)', marginBottom: '4px' }}>
                Target Hub / Kingpin:
              </label>
              <input
                type="text"
                value={targetName}
                onChange={(e) => setTargetName(e.target.value)}
                className="search-box"
                placeholder="e.g. Iqbal Ansari"
                required
              />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontFamily: 'IBM Plex Mono, monospace', color: 'var(--ink-soft)', marginBottom: '4px' }}>
                Maximum Exploration Depth (Hops):
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[2, 3, 4, 5].map(hops => (
                  <button
                    key={hops}
                    type="button"
                    className={`filter-chip ${maxHops === hops ? 'active' : ''}`}
                    onClick={() => setMaxHops(hops)}
                    style={{ flex: 1, textAlign: 'center' }}
                  >
                    {hops} Hops
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="tactical-btn"
              style={{
                width: '100%',
                justifyContent: 'center',
                background: 'var(--stamp-red)',
                color: '#FFF',
                borderColor: 'var(--stamp-red)',
                padding: '10px 14px',
                fontSize: '12px'
              }}
            >
              {loading ? 'Executing AI Pathfinding...' : '🧠 Trace Syndicate Reasoning Chain'}
            </button>
          </form>

          {/* Quick Pre-Configured Inquiries */}
          <div style={{ borderTop: '1px solid var(--border)', marginTop: '18px', paddingTop: '14px' }}>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: '8px' }}>
              Standard Operational Inquiries:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {sampleSubjects.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSetSample(s.source, s.target)}
                  style={{
                    background: 'var(--paper)',
                    border: '1px solid var(--border)',
                    borderRadius: '2px',
                    padding: '6px 8px',
                    color: 'var(--ink)',
                    fontSize: '11px',
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{s.source} ➔ {s.target}</div>
                  <div style={{ fontSize: '9.5px', color: 'var(--ink-muted)' }}>{s.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Output Panel */}
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '3px', padding: '20px', minHeight: '380px' }}>
          <div className="sidebar-section-title" style={{ marginBottom: '14px' }}>
            AI Evidentiary Reasoning Output
          </div>

          {error && (
            <div style={{ padding: '12px', background: 'var(--stamp-red-bg)', border: '1px solid var(--stamp-red)', color: 'var(--stamp-red)', borderRadius: '3px', fontSize: '12px' }}>
              ⚠️ {error}
            </div>
          )}

          {!result && !error && !loading && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink-muted)' }}>
              Configure source and target entities on the left and execute pathfinding to inspect the AI reasoning chain.
            </div>
          )}

          {loading && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--tag-amber)', fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px' }}>
              ⏳ Scanning graph topology and constructing Section 65B reasoning tree...
            </div>
          )}

          {result && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Top Banner */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--paper)', border: '1px solid var(--border)', padding: '10px 14px', borderRadius: '3px' }}>
                <div>
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: 'var(--ink-soft)' }}>
                    Shortest Evidentiary Distance:
                  </span>
                  <span style={{ fontWeight: 700, fontSize: '14px', marginLeft: '8px', color: 'var(--stamp-red)' }}>
                    {result.shortest_distance_hops} Hops
                  </span>
                </div>
                <span className="conf-stamp">
                  DETERMINISTIC GRAPH CHAIN
                </span>
              </div>

              {/* Summary Conclusion */}
              <div className="evidence">
                <h4>Evidentiary Summary</h4>
                <p style={{ fontSize: '13px', lineHeight: '1.6' }}>
                  {result.summary_conclusion}
                </p>
                <div className="src">
                  <span>Source: Graph Analytics Engine</span>
                  <span className="conf-stamp">Digitally Corroborated</span>
                </div>
              </div>

              {/* Visual Step-by-Step Path */}
              {result.paths && result.paths.length > 0 && (
                <div>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: 'var(--ink-soft)', marginBottom: '8px', textTransform: 'uppercase' }}>
                    Operational Link Chain ({result.paths.length} alternative paths discovered):
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {result.paths.map((pathObj, pIdx) => (
                      <div
                        key={pIdx}
                        style={{
                          background: 'var(--paper)',
                          border: '1px solid var(--border)',
                          borderLeft: '4px solid var(--stamp-red)',
                          borderRadius: '3px',
                          padding: '12px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                          {pathObj.nodes.map((nodeName, nIdx) => (
                            <React.Fragment key={nIdx}>
                              <span style={{
                                background: nIdx === 0 ? 'var(--tag-amber)' : (nIdx === pathObj.nodes.length - 1 ? 'var(--stamp-red)' : 'var(--panel)'),
                                color: (nIdx === 0 || nIdx === pathObj.nodes.length - 1) ? '#FFF' : 'var(--ink)',
                                border: '1px solid var(--border)',
                                padding: '4px 10px',
                                borderRadius: '3px',
                                fontWeight: 700,
                                fontSize: '11.5px',
                                fontFamily: 'Space Grotesk, sans-serif'
                              }}>
                                {nodeName}
                              </span>
                              {nIdx < pathObj.nodes.length - 1 && (
                                <span style={{ color: 'var(--ink-muted)', fontWeight: 800 }}>➔</span>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
