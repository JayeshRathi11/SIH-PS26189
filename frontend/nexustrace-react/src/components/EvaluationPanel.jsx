import React, { useState, useEffect } from 'react';

import { fetchEvaluationMetrics } from '../api/client';

export default function EvaluationPanel({ domain }) { // Note: 'domain' prop here is actually the frontend activeCaseId
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!domain) {
      setMetrics(null);
      setError(null);
      return;
    }

    let isMounted = true;

    const fetchEvaluation = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchEvaluationMetrics(domain);

        if (isMounted) {
          setMetrics(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchEvaluation();

    return () => {
      isMounted = false;
    };
  }, [domain]);

  if (!domain) return null;

  return (
    <div className="evaluation-panel card-raised" style={{ marginTop: '16px' }}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>Pipeline Evaluation</h3>

      {loading && <div style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>Loading metrics...</div>}
      {error && <div style={{ fontSize: '0.85rem', color: 'var(--stamp-red)' }}>Error: {error}</div>}

      {metrics && !loading && !error && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
            <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', padding: '7px 10px', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--ink-soft)' }}>Precision</span>
              <span style={{ fontSize: '1rem', fontWeight: 'bold' }}>{(metrics.precision * 100).toFixed(1)}%</span>
            </div>
            <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', padding: '7px 10px', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--ink-soft)' }}>Recall</span>
              <span style={{ fontSize: '1rem', fontWeight: 'bold' }}>{(metrics.recall * 100).toFixed(1)}%</span>
            </div>
            <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', padding: '7px 10px', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--ink-soft)' }}>F1 Score</span>
              <span style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--stamp-red)' }}>{(metrics.f1_score * 100).toFixed(1)}%</span>
            </div>
          </div>

          {!metrics.ground_truth_matched && (
            <div className="badge badge-warning">
              &#9888; Unverified metrics (fallback mode)
            </div>
          )}
        </>
      )}
    </div>
  );
}
