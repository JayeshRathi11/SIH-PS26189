import React, { useState, useEffect } from 'react';
import { explainPath } from '../api/client';

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

export default function XaiConsolePage({ entities = [] }) {
  const [sourceName, setSourceName] = useState('Iliyas Khan');
  const [targetName, setTargetName] = useState('Iqbal Ansari');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Verified working cross-domain sample pairs from the intelligence graph
  const sampleSubjects = [
    { source: 'Iliyas Khan', target: 'Iqbal Ansari', desc: 'Narcotics operative to Syndicate Kingpin (2 hops via Devendra)' },
    { source: 'Rohit Chaurasia', target: 'Iqbal Ansari', desc: 'Cyber fraud operative to Kingpin (via IA Digital Ventures)' },
    { source: 'Manoj Tiwari', target: 'Iqbal Ansari', desc: 'Human trafficking desk to Kingpin (via Sunrise Placement)' },
    { source: 'Anil Kamble', target: 'Harjeet Singh', desc: 'Vehicle theft operative to Arms smuggler (via shared vehicle asset)' },
    { source: 'Devendra Solanki', target: 'Rohit Chaurasia', desc: 'Cross-domain linkage: Narcotics to Cyber Fraud' }
  ];

  const handleTracePath = async (e) => {
    e?.preventDefault();
    if (!sourceName.trim() || !targetName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await explainPath(sourceName.trim(), targetName.trim(), 6);
      setResult(data);
    } catch (err) {
      setError(err.message || 'Could not find a connection between these two subjects.');
    } finally {
      setLoading(false);
    }
  };

  const handleSetSample = (s, t) => {
    setSourceName(s);
    setTargetName(t);
  };

  // Run initial trace on mount if default values exist
  useEffect(() => {
    handleTracePath();
  }, []);

  const overallStrength = (pathObj) =>
    pathObj.steps && pathObj.steps.length > 0 && pathObj.steps.every((s) => strengthOf(s) === 'strong')
      ? 'strong'
      : 'weak';

  return (
    <div className="page-container" style={{ padding: '24px', overflowY: 'auto', height: '100vh', boxSizing: 'border-box' }}>
      {/* Header */}
      <div className="page-header-row" style={{ marginBottom: '20px' }}>
        <div>
          <div className="page-eyebrow" style={{ color: 'var(--tag-rose)', fontSize: '11px', fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace' }}>
            🧭 XAI EVIDENTIARY PATHFINDER
          </div>
          <h2 className="page-title" style={{ margin: '4px 0', fontSize: '22px', fontFamily: 'Space Grotesk, sans-serif' }}>
            Syndicate Chain of Connection & Explanations
          </h2>
          <p className="page-subtitle" style={{ margin: 0, color: 'var(--ink-muted)', fontSize: '12px' }}>
            Trace direct and multi-hop operational linkages between subjects across 10 crime verticals with verbatim evidence citations.
          </p>
        </div>
      </div>

      {/* Query Control Card */}
      <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '6px', padding: '18px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <form onSubmit={handleTracePath} style={{ display: 'flex', alignItems: 'flex-end', gap: '14px', flexWrap: 'wrap' }}>
          {/* Source Subject Input & Select */}
          <div style={{ flex: '1 1 240px', minWidth: '220px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, fontFamily: 'IBM Plex Mono, monospace', color: 'var(--ink-soft)', marginBottom: '5px' }}>
              Subject A (Source):
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                className="search-box"
                placeholder="e.g. Iliyas Khan"
                style={{ flex: 1, padding: '8px 10px', fontSize: '12px' }}
                required
              />
              {entities.length > 0 && (
                <select
                  value=""
                  onChange={(e) => e.target.value && setSourceName(e.target.value)}
                  style={{
                    background: 'var(--panel-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    color: 'var(--ink)',
                    fontSize: '11px',
                    padding: '4px',
                    cursor: 'pointer'
                  }}
                  title="Pick from known entities"
                >
                  <option value="">▼ Pick</option>
                  {entities.map((ent) => (
                    <option key={ent.id} value={ent.name}>
                      {ent.name} ({ent.typeLabel || ent.type})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div style={{ fontSize: '20px', color: 'var(--tag-rose)', paddingBottom: '8px', fontWeight: 700 }}>
            ➔
          </div>

          {/* Target Subject Input & Select */}
          <div style={{ flex: '1 1 240px', minWidth: '220px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, fontFamily: 'IBM Plex Mono, monospace', color: 'var(--ink-soft)', marginBottom: '5px' }}>
              Subject B (Target):
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                value={targetName}
                onChange={(e) => setTargetName(e.target.value)}
                className="search-box"
                placeholder="e.g. Iqbal Ansari"
                style={{ flex: 1, padding: '8px 10px', fontSize: '12px' }}
                required
              />
              {entities.length > 0 && (
                <select
                  value=""
                  onChange={(e) => e.target.value && setTargetName(e.target.value)}
                  style={{
                    background: 'var(--panel-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    color: 'var(--ink)',
                    fontSize: '11px',
                    padding: '4px',
                    cursor: 'pointer'
                  }}
                  title="Pick from known entities"
                >
                  <option value="">▼ Pick</option>
                  {entities.map((ent) => (
                    <option key={ent.id} value={ent.name}>
                      {ent.name} ({ent.typeLabel || ent.type})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="tactical-btn"
            style={{
              background: 'var(--stamp-red)',
              color: '#FFF',
              borderColor: 'var(--stamp-red)',
              padding: '9px 18px',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {loading ? 'Analyzing Graph…' : '🧭 Find Connection'}
          </button>
        </form>

        {/* Quick Examples */}
        <div style={{ borderTop: '1px solid var(--border)', marginTop: '16px', paddingTop: '12px' }}>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10.5px', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: '8px', fontWeight: 600 }}>
            Verified Intelligence Chains:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {sampleSubjects.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  handleSetSample(s.source, s.target);
                  explainPath(s.source, s.target, 6).then(setResult).catch((err) => setError(err.message));
                }}
                className="filter-chip"
                style={{
                  textAlign: 'left',
                  background: 'var(--panel-elevated)',
                  border: '1px solid var(--border)',
                  padding: '5px 10px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
                title={s.desc}
              >
                <span style={{ color: 'var(--tag-amber)', fontWeight: 600 }}>{s.source}</span>
                <span style={{ color: 'var(--ink-muted)', margin: '0 4px' }}>➔</span>
                <span style={{ color: 'var(--stamp-red)', fontWeight: 600 }}>{s.target}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Output / Results Card */}
      <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '6px', padding: '20px', minHeight: '300px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        {error && (
          <div style={{ padding: '12px 14px', background: 'var(--stamp-red-bg)', border: '1px solid var(--stamp-red)', color: 'var(--stamp-red)', borderRadius: '4px', fontSize: '12px', marginBottom: '14px' }}>
            ⚠️ {error}
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--tag-amber)', fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px' }}>
            ⟳ Synthesizing multi-hop graph path and generating evidentiary chain...
          </div>
        )}

        {!result && !error && !loading && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink-muted)' }}>
            Select two subjects above to discover how they are linked across crime verticals.
          </div>
        )}

        {result && !loading && result.path_found === false && (
          <div style={{ textAlign: 'center', padding: '50px 20px', background: 'var(--panel-elevated)', borderRadius: '6px', border: '1px dashed var(--border)' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔍</div>
            <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: '14px', marginBottom: '4px' }}>
              No Connection Path Found
            </div>
            <div style={{ color: 'var(--ink-muted)', fontSize: '12px', maxWidth: '480px', margin: '0 auto' }}>
              {result.message || `No direct or indirect chain connects '${result.source}' and '${result.target}' within current intelligence documents.`}
            </div>
          </div>
        )}

        {result && !loading && result.path_found !== false && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Verdict Banner */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', background: 'var(--panel-elevated)', border: '1px solid var(--border)', padding: '12px 16px', borderRadius: '6px' }}>
              <div>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', color: 'var(--ink-soft)' }}>
                  Connection Path: <strong style={{ color: 'var(--tag-amber)' }}>{result.source}</strong> ➔ <strong style={{ color: 'var(--stamp-red)' }}>{result.target}</strong>
                </span>
                <div style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '2px' }}>
                  Distance: {result.shortest_distance_hops} Hop(s) · {result.total_shortest_paths} Optimal Chain(s)
                </div>
              </div>
              {result.paths && result.paths.length > 0 && (
                <span
                  style={{
                    color: overallStrength(result.paths[0]) === 'strong' ? 'var(--stamp-green)' : 'var(--stamp-red)',
                    background: overallStrength(result.paths[0]) === 'strong' ? 'var(--stamp-green-bg)' : 'var(--stamp-red-bg)',
                    border: `1px solid ${overallStrength(result.paths[0]) === 'strong' ? 'var(--stamp-green)' : 'var(--stamp-red)'}`,
                    borderRadius: '4px',
                    padding: '4px 10px',
                    fontWeight: 700,
                    fontSize: '11px',
                    fontFamily: 'IBM Plex Mono, monospace'
                  }}
                >
                  {overallStrength(result.paths[0]) === 'strong' ? '✓ STRONG EVIDENTIARY LINK' : '⚠ WEAK / CORROBORATION NEEDED'}
                </span>
              )}
            </div>

            {/* Plain-language explanation */}
            <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: '6px', padding: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--tag-amber)', marginBottom: '6px', fontFamily: 'IBM Plex Mono, monospace' }}>
                Evidentiary Synthesis
              </div>
              <p style={{ margin: 0, fontSize: '13.5px', lineHeight: '1.6', color: 'var(--ink)' }}>
                {result.summary_conclusion}
              </p>
            </div>

            {/* Visual chains */}
            {result.paths && result.paths.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: 'var(--ink-soft)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Step-by-Step Path Links ({result.paths.length} Chain{result.paths.length > 1 ? 's' : ''}):
                </div>

                {result.paths.map((pathObj, pIdx) => (
                  <div
                    key={pIdx}
                    style={{
                      background: 'var(--panel-elevated)',
                      border: '1px solid var(--border)',
                      borderLeft: `4px solid ${overallStrength(pathObj) === 'strong' ? 'var(--stamp-green)' : 'var(--stamp-red)'}`,
                      borderRadius: '6px',
                      padding: '16px'
                    }}
                  >
                    {/* Visual Node-Edge Flow */}
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                      {pathObj.nodes.map((nodeName, nIdx) => {
                        const step = pathObj.steps && pathObj.steps[nIdx];
                        const isFirst = nIdx === 0;
                        const isLast = nIdx === pathObj.nodes.length - 1;
                        return (
                          <React.Fragment key={nIdx}>
                            <span style={{
                              background: isFirst ? 'var(--tag-amber)' : (isLast ? 'var(--stamp-red)' : 'var(--panel)'),
                              color: isFirst ? 'var(--on-amber)' : (isLast ? '#FFF' : 'var(--ink)'),
                              border: '1px solid var(--border)',
                              padding: '5px 12px',
                              borderRadius: '4px',
                              fontWeight: 700,
                              fontSize: '12px',
                              fontFamily: 'Space Grotesk, sans-serif'
                            }}>
                              {nodeName}
                            </span>
                            {!isLast && step && (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 4px' }}>
                                <span style={{ fontSize: '13px', color: strengthOf(step) === 'strong' ? 'var(--stamp-green)' : 'var(--ink-muted)', fontWeight: 700 }}>
                                  ➔
                                </span>
                                <span style={{ fontSize: '9px', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace', whiteSpace: 'nowrap' }}>
                                  [{prettyRelationship(step.relationship_type)}]
                                </span>
                              </div>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>

                    {/* Verbatim Evidence breakdown */}
                    {pathObj.steps && pathObj.steps.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px dashed var(--border)', paddingTop: '10px' }}>
                        {pathObj.steps.map((st, sIdx) => (
                          <div key={sIdx} style={{ fontSize: '11.5px', color: 'var(--ink-soft)', lineHeight: '1.5' }}>
                            <strong style={{ color: 'var(--ink)' }}>Step {sIdx + 1}:</strong> {st.from_name} is linked to {st.to_name} via <code style={{ color: 'var(--tag-amber)', background: 'var(--panel)', padding: '1px 4px', borderRadius: '2px' }}>{st.relationship_type}</code> in domain <em>{st.domain}</em>.
                            {st.evidence && (
                              <div style={{ fontStyle: 'italic', color: 'var(--ink-muted)', marginTop: '2px', paddingLeft: '14px', borderLeft: '2px solid var(--border)' }}>
                                "{st.evidence}"
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
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
