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
    <div className="evaluation-panel" style={{ padding: '16px', background: 'var(--surface, #1e1e1e)', borderRadius: '8px', border: '1px solid var(--border, #333)', marginTop: '16px' }}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-muted, #888)' }}>Pipeline Evaluation</h3>
      
      {loading && <div style={{ fontSize: '0.85rem', color: '#888' }}>Loading metrics...</div>}
      {error && <div style={{ fontSize: '0.85rem', color: 'red' }}>Error: {error}</div>}
      
      {metrics && !loading && !error && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
            <div style={{ background: 'var(--surface-hover, #2a2a2a)', padding: '8px', borderRadius: '4px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #888)' }}>Precision</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{(metrics.precision * 100).toFixed(1)}%</div>
            </div>
            <div style={{ background: 'var(--surface-hover, #2a2a2a)', padding: '8px', borderRadius: '4px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #888)' }}>Recall</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{(metrics.recall * 100).toFixed(1)}%</div>
            </div>
            <div style={{ background: 'var(--surface-hover, #2a2a2a)', padding: '8px', borderRadius: '4px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #888)' }}>F1 Score</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--accent, #646cff)' }}>{(metrics.f1_score * 100).toFixed(1)}%</div>
            </div>
          </div>
          
          {!metrics.ground_truth_matched && (
            <div style={{ display: 'inline-block', fontSize: '0.7rem', padding: '2px 8px', background: 'rgba(255, 152, 0, 0.1)', color: '#ff9800', borderRadius: '12px', border: '1px solid rgba(255, 152, 0, 0.3)' }}>
              ⚠️ Unverified metrics (fallback mode)
            </div>
          )}
        </>
      )}
    </div>
  );
}
