import React, { useState, useEffect } from 'react';
import { explainPath } from '../api/client';

// A link counts as "strong" when the backend's own confidence score for that
// relationship clears this bar. The backend already computes real per-edge
// confidence in explain_path() — this just decides how to draw it.
const STRONG_THRESHOLD = 0.75;

function strengthOf(step) {
  return (step?.confidence ?? 0.9) >= STRONG_THRESHOLD ? 'strong' : 'weak';
}

function prettyRelationship(relType) {
  if (!relType) return 'Associated with';
  return relType
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// Fixed, hand-curated set of example pairs -- verified live against the real
// deployed graph (not auto-generated from whatever's currently loaded, like
// the old "quick examples" were). These live in the stable seed domains
// (loan fraud / case-amber / the 10 stock crime domains), which the demo
// reset script never touches, so they stay correct across demo runs. Each
// one is chosen to show a different kind of answer Pathfinder can give:
// a direct/strong link, a weak/inferred one, a confirmed non-connection,
// and two independent multi-hop chains through different entity types.
const CURATED_EXAMPLES = [
  { source: 'Naseem Contractor', target: 'Iqbal Deol', desc: 'Direct, 1-hop evidence-backed connection' },
  { source: 'Naseem Contractor', target: 'Punjab', desc: 'Inferred co-location, not a confirmed transaction' },
  { source: 'Purported Financial Consultancy', target: 'Naseem Contractor', desc: 'Correctly shown as unconnected' },
  { source: 'Harjeet Singh', target: 'Devraj Oberoi', desc: 'Cross-domain, no path exists' },
  { source: 'Ranjit Bhullar', target: 'Intermediate Account', desc: '4-hop chain via Iqbal Deol and Naseem Contractor' },
  { source: 'Devraj Oberoi', target: 'Recovered Mule Account Kits', desc: '2-hop, links two separately-filed cases via Priyanka Solanki' },
  { source: 'Grey Honda City', target: 'Dubai Hawala Accounts', desc: '3-hop chain, a vehicle linking to an overseas hawala account' },
];

export default function XaiConsolePage({ entities }) {
  // Previously defaulted to hardcoded names from the old demo dataset
  // ("Rina Das" -> "Iqbal Ansari", etc). Those names won't exist once the
  // dataset is rebuilt, so both the initial pair and the quick-pick
  // examples below are now derived from whatever entities are actually
  // loaded, and simply don't render until there's real data to draw from.
  const [sourceName, setSourceName] = useState('');
  const [targetName, setTargetName] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [userEdited, setUserEdited] = useState(false);

  useEffect(() => {
    if (userEdited || entities.length < 2) return;
    setSourceName((prev) => prev || entities[0]?.name || '');
    setTargetName((prev) => prev || entities[1]?.name || '');
  }, [entities, userEdited]);

  const handleTracePath = async (e) => {
    e?.preventDefault();
    if (!sourceName || !targetName) return;
    setLoading(true);
    setError(null);
    try {
      const data = await explainPath(sourceName, targetName, 6);
      setResult(data);
    } catch (err) {
      setError(err.message || 'Could not find a connection between these two people.');
    } finally {
      setLoading(false);
    }
  };

  // Curated examples run immediately on click -- no second click on
  // "Find the Connection" needed. Uses the clicked pair directly rather than
  // relying on sourceName/targetName state, which wouldn't be updated yet
  // inside this same synchronous handler.
  const handleRunCurated = async (source, target) => {
    setUserEdited(true);
    setSourceName(source);
    setTargetName(target);
    setLoading(true);
    setError(null);
    try {
      const data = await explainPath(source, target, 8);
      setResult(data);
    } catch (err) {
      setError(err.message || 'Could not find a connection between these two people.');
    } finally {
      setLoading(false);
    }
  };

  // Chain strength = weakest link: one weak connection is enough to make the
  // whole chain weak, which is the useful reading for an investigator.
  const overallStrength = (pathObj) =>
    pathObj.steps && pathObj.steps.length > 0 && pathObj.steps.every((s) => strengthOf(s) === 'strong')
      ? 'strong'
      : 'weak';

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header-row">
        <div>
          <div className="page-eyebrow">⟟ PATHFINDER</div>
          <h2 className="page-title">How Are Two People Connected?</h2>
          <p className="page-subtitle">
            Pick two people and see the chain of connections between them, with each link marked as
            strong or weak based on the evidence behind it.
          </p>
        </div>
      </div>

      {/* Query Row */}
      <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '3px', padding: '18px', marginBottom: '20px' }}>
        <form onSubmit={handleTracePath} style={{ display: 'flex', alignItems: 'flex-end', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 220px', minWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontFamily: 'IBM Plex Mono, monospace', color: 'var(--ink-soft)', marginBottom: '4px' }}>
              Person A:
            </label>
            <input
              type="text"
              value={sourceName}
              onChange={(e) => { setUserEdited(true); setSourceName(e.target.value); }}
              className="search-box"
              placeholder="e.g. a person's name from your case"
              required
            />
          </div>

          <div style={{ fontSize: '18px', color: 'var(--ink-muted)', paddingBottom: '9px' }}>→</div>

          <div style={{ flex: '1 1 220px', minWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontFamily: 'IBM Plex Mono, monospace', color: 'var(--ink-soft)', marginBottom: '4px' }}>
              Person B:
            </label>
            <input
              type="text"
              value={targetName}
              onChange={(e) => { setUserEdited(true); setTargetName(e.target.value); }}
              className="search-box"
              placeholder="e.g. another name from your case"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="tactical-btn"
            style={{
              background: 'var(--stamp-red)',
              color: '#FFF',
              borderColor: 'var(--stamp-red)',
              padding: '10px 16px',
              fontSize: '12px'
            }}
          >
            {loading ? 'Searching…' : 'Find the Connection'}
          </button>
        </form>

        {/* Curated examples -- click one to run it immediately, no typing or
            second click needed. Covers a strong link, a weak link, two
            confirmed non-connections, and two independent multi-hop chains. */}
        <div style={{ borderTop: '1px solid var(--border)', marginTop: '16px', paddingTop: '12px' }}>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: '8px' }}>
            Curated examples — click to run:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {CURATED_EXAMPLES.map((ex, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleRunCurated(ex.source, ex.target)}
                disabled={loading}
                className="filter-chip"
                style={{ textAlign: 'left' }}
                title={ex.desc}
              >
                {ex.source} → {ex.target}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Output */}
      <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '3px', padding: '20px', minHeight: '280px' }}>
        {error && (
          <div style={{ padding: '12px', background: 'var(--stamp-red-bg)', border: '1px solid var(--stamp-red)', color: 'var(--stamp-red)', borderRadius: '3px', fontSize: '12px' }}>
            ⚠️ {error}
          </div>
        )}

        {!result && !error && !loading && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink-muted)' }}>
            Enter two people above to see how — or whether — they're connected.
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--tag-amber)', fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px' }}>
            ⟳ Searching the case graph for a connection…
          </div>
        )}

        {result && !loading && result.path_found === false && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink-muted)' }}>
            {result.message || 'No connection found between these two people in the current case data.'}
          </div>
        )}

        {result && !loading && result.path_found !== false && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Verdict Banner */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', background: 'var(--paper)', border: '1px solid var(--border)', padding: '12px 14px', borderRadius: '3px' }}>
              <div>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: 'var(--ink-soft)' }}>
                  Connection between {result.source} and {result.target}:
                </span>
              </div>
              {result.paths && result.paths.length > 0 && (
                <span
                  className="conf-stamp"
                  style={{
                    color: overallStrength(result.paths[0]) === 'strong' ? 'var(--stamp-green)' : 'var(--stamp-red)',
                    borderColor: overallStrength(result.paths[0]) === 'strong' ? 'var(--stamp-green)' : 'var(--stamp-red)'
                  }}
                >
                  {overallStrength(result.paths[0]) === 'strong' ? 'Strongly Connected' : 'Weakly Connected'}
                </span>
              )}
            </div>

            {/* Plain-language explanation */}
            <div className="evidence">
              <h4>In Plain Words</h4>
              <p style={{ fontSize: '13px', lineHeight: '1.6' }}>
                {result.summary_conclusion}
              </p>
              <div className="src">
                <span>Source: Graph analytics engine</span>
                <span className="conf-stamp">Backed by recorded evidence</span>
              </div>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '11px', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="28" height="10" viewBox="0 0 28 10"><line x1="0" y1="5" x2="28" y2="5" stroke="var(--stamp-green)" strokeWidth="3" /></svg>
                Strong connection
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="28" height="10" viewBox="0 0 28 10"><line x1="0" y1="5" x2="28" y2="5" stroke="var(--ink-muted)" strokeWidth="2" strokeDasharray="4 3" /></svg>
                Weak connection
              </div>
            </div>

            {/* Visual chains — one per alternative path found */}
            {result.paths && result.paths.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: 'var(--ink-soft)', textTransform: 'uppercase' }}>
                  {result.paths.length > 1 ? `${result.paths.length} possible chains found:` : 'Connection chain:'}
                </div>

                {result.paths.map((pathObj, pIdx) => (
                  <div
                    key={pIdx}
                    style={{
                      background: 'var(--paper)',
                      border: '1px solid var(--border)',
                      borderLeft: `4px solid ${overallStrength(pathObj) === 'strong' ? 'var(--stamp-green)' : 'var(--stamp-red)'}`,
                      borderRadius: '3px',
                      padding: '16px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0' }}>
                      {pathObj.nodes.map((nodeName, nIdx) => {
                        const step = pathObj.steps && pathObj.steps[nIdx];
                        const isLast = nIdx === pathObj.nodes.length - 1;
                        return (
                          <React.Fragment key={nIdx}>
                            <span style={{
                              background: nIdx === 0 ? 'var(--tag-amber)' : (isLast ? 'var(--stamp-red)' : 'var(--panel)'),
                              color: nIdx === 0 ? 'var(--on-amber)' : (isLast ? '#FFF' : 'var(--ink)'),
                              border: '1px solid var(--border)',
                              padding: '4px 10px',
                              borderRadius: '3px',
                              fontWeight: 700,
                              fontSize: '11.5px',
                              fontFamily: 'Space Grotesk, sans-serif'
                            }}>
                              {nodeName}
                            </span>
                            {!isLast && step && (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '0 8px', minWidth: '80px' }}>
                                <svg width="80" height="12" viewBox="0 0 80 12">
                                  <line
                                    x1="0" y1="6" x2="80" y2="6"
                                    stroke={strengthOf(step) === 'strong' ? 'var(--stamp-green)' : 'var(--ink-muted)'}
                                    strokeWidth={strengthOf(step) === 'strong' ? 3 : 2}
                                    strokeDasharray={strengthOf(step) === 'strong' ? undefined : '4 3'}
                                  />
                                </svg>
                                <span style={{ fontSize: '9.5px', color: 'var(--ink-muted)', textAlign: 'center', marginTop: '2px' }}>
                                  {prettyRelationship(step.relationship_type)}
                                </span>
                              </div>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
