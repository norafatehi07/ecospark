// src/components/common/ErrorBoundary.jsx
import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    this.setState({ errorInfo: info });
    console.error('[ErrorBoundary]', error, info);
    // Handle Vite's dynamic import failure by reloading the page automatically
    if (error && error.message && (error.message.includes('Failed to fetch dynamically imported module') || error.message.includes('Importing a module script failed'))) {
      window.location.reload();
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: this.props.fullPage !== false ? '100vh' : '200px',
          padding: '32px',
          gap: '16px',
          textAlign: 'center',
          background: 'var(--color-bg)',
        }}>
          <div style={{ fontSize: 48 }}>⚠️</div>
          <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)', fontSize: 'var(--text-2xl)' }}>
            Something went wrong
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', maxWidth: 400 }}>
            {this.props.message || 'This section encountered an error. The rest of the app is unaffected.'}
          </p>
          {this.state.error && (
            <pre style={{
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#EF4444',
              padding: '16px',
              borderRadius: '8px',
              textAlign: 'left',
              fontSize: '12px',
              maxWidth: '800px',
              overflowX: 'auto',
              whiteSpace: 'pre-wrap'
            }}>
              <strong>{this.state.error.toString()}</strong>
              <br/><br/>
              {this.state.errorInfo?.componentStack}
            </pre>
          )}
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: '10px 24px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-primary)',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              fontWeight: 600,
              fontSize: 'var(--text-sm)',
            }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
