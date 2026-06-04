import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('App crashed:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: '#f8fafc', padding: '24px', fontFamily: 'Inter, sans-serif'
        }}>
          <div style={{
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px',
            padding: '40px', maxWidth: '600px', width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.08)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px', textAlign: 'center' }}>⚠️</div>
            <h1 style={{ color: '#1e293b', fontSize: '24px', fontWeight: 700, textAlign: 'center', margin: '0 0 8px' }}>
              Something went wrong
            </h1>
            <p style={{ color: '#64748b', textAlign: 'center', marginBottom: '24px' }}>
              The app crashed. Please refresh the page.
            </p>
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px',
              padding: '16px', marginBottom: '24px', fontFamily: 'monospace', fontSize: '13px', color: '#dc2626'
            }}>
              <strong>Error:</strong> {this.state.error?.message || 'Unknown error'}
              {this.state.errorInfo && (
                <details style={{ marginTop: '12px' }}>
                  <summary style={{ cursor: 'pointer', color: '#7f1d1d' }}>Stack trace</summary>
                  <pre style={{ marginTop: '8px', fontSize: '11px', overflow: 'auto', color: '#7f1d1d' }}>
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>
            <button
              onClick={() => window.location.reload()}
              style={{
                width: '100%', padding: '12px', background: '#166534', color: '#fff',
                border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              🔄 Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
