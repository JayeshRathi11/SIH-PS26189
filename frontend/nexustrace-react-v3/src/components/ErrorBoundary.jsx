import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[NexusTrace UI Exception Caught]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.hash = '#board';
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--paper)',
          color: 'var(--ink)',
          padding: '24px',
          fontFamily: 'IBM Plex Sans, sans-serif'
        }}>
          <div style={{
            maxWidth: '620px',
            width: '100%',
            background: 'var(--panel)',
            border: '2px solid var(--border)',
            boxShadow: 'var(--shadow-paper)',
            padding: '32px',
            borderRadius: '4px',
            position: 'relative'
          }}>
            <div style={{
              display: 'inline-block',
              padding: '3px 8px',
              background: 'var(--stamp-red)',
              color: '#fff',
              fontSize: '11px',
              fontFamily: 'IBM Plex Mono, monospace',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '16px'
            }}>
              Forensic Exception Intercept
            </div>

            <h2 style={{
              fontSize: '20px',
              fontWeight: 700,
              color: 'var(--ink)',
              margin: '0 0 10px 0',
              fontFamily: 'Space Grotesk, sans-serif'
            }}>
              Investigative View Render Interrupted
            </h2>

            <p style={{ fontSize: '13px', color: 'var(--ink-muted)', lineHeight: '1.6', marginBottom: '20px' }}>
              An unhandled runtime error occurred during interface synthesis. Evidence state remains securely preserved in the forensic ledger.
            </p>

            {this.state.error && (
              <pre style={{
                background: 'rgba(0,0,0,0.06)',
                border: '1px solid var(--border-dim)',
                padding: '12px',
                fontSize: '11px',
                fontFamily: 'IBM Plex Mono, monospace',
                color: 'var(--stamp-red)',
                overflowX: 'auto',
                marginBottom: '20px',
                whiteSpace: 'pre-wrap',
                borderRadius: '3px'
              }}>
                {this.state.error.toString()}
              </pre>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={this.handleReset}
                style={{
                  padding: '8px 18px',
                  background: 'var(--tag-amber)',
                  color: 'var(--on-amber)',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: 'pointer',
                  borderRadius: '3px',
                  fontFamily: 'IBM Plex Mono, monospace'
                }}
              >
                ↻ Re-initialize Dossier Board
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
