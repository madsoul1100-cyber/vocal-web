import { Component, type ErrorInfo, type ReactNode } from 'react'

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[vocal-web]', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: '100vh',
            padding: 24,
            background: '#0b0f19',
            color: '#fecaca',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <h1 style={{ fontSize: 20, marginBottom: 12 }}>Something went wrong</h1>
          <pre
            style={{
              background: '#1e293b',
              padding: 16,
              borderRadius: 8,
              overflow: 'auto',
              fontSize: 13,
              color: '#e2e8f0',
            }}
          >
            {this.state.error.message}
          </pre>
          <p style={{ marginTop: 16, color: '#94a3b8', fontSize: 14 }}>
            Check the browser console. Ensure vocal-api is running and{' '}
            <code>VITE_API_BASE_URL</code> is set in vocal-web/.env.local.
          </p>
        </div>
      )
    }
    return this.props.children
  }
}
