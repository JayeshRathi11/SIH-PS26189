import React, { useState, useEffect } from 'react';
import { fetchEvaluationMetrics } from '../api/client';

export default function EvaluationPanel({ domain }) {
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
        if (isMounted) setMetrics(data);
      } catch (err) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchEvaluation();

    return () => {
      isMounted = false;
    };
  }, [domain]);

  if (!domain) return null;

  return (
    <div className="eval-card">
      <div className="eval-card-header">
        <span>Forensic Benchmark</span>
        {loading && <span style={{ color: 'var(--tag-amber)' }}>Auditing...</span>}
      </div>

      {error && (
        <div style={{ fontSize: '10.5px', color: 'var(--stamp-red)', margin: '4px 0' }}>
          {error}
        </div>
      )}

      {metrics && !loading && (
        metrics.ground_truth_matched === false || metrics.precision == null ? (
          // No ground truth exists for this domain (any case created
          // through "+ Add New Case" -- ground truth only exists for the
          // 10 pre-seeded demo domains, see backend/routers/evaluation.py).
          // Showing a number here would be a fabrication; say so plainly
          // instead of silently falling back to old demo-looking figures.
          <div style={{ fontSize: '11px', color: 'var(--ink-muted)', fontFamily: 'IBM Plex Mono, monospace', padding: '6px 0' }}>
            ⚠️ {metrics.message || 'Not scorable — no ground truth available for this case.'}
          </div>
        ) : (
          <>
            <div className="eval-metrics-grid">
              <div className="eval-stat-box">
                <div className="eval-stat-label">Precision</div>
                <div className="eval-stat-value">{(metrics.precision * 100).toFixed(1)}%</div>
              </div>
              <div className="eval-stat-box">
                <div className="eval-stat-label">Recall</div>
                <div className="eval-stat-value">{(metrics.recall * 100).toFixed(1)}%</div>
              </div>
              <div className="eval-stat-box">
                <div className="eval-stat-label">F1 Score</div>
                <div className="eval-stat-value" style={{ color: 'var(--stamp-red)' }}>
                  {(metrics.f1_score * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '9px', fontFamily: 'IBM Plex Mono, monospace', color: 'var(--ink-muted)' }}>
                GROUND TRUTH ALIGNED
              </span>
              <span className="conf-stamp" style={{ fontSize: '8px', padding: '1px 4px' }}>
                PASS
              </span>
            </div>
          </>
        )
      )}
    </div>
  );
}
