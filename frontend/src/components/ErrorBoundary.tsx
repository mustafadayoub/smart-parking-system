import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('UI error:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100">
          <div className="max-w-lg rounded-2xl border border-rose-500/40 bg-slate-900 p-6">
            <h1 className="text-xl font-semibold text-rose-300">Something went wrong</h1>
            <p className="mt-3 text-sm text-slate-300">{this.state.error.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 rounded-xl bg-cyan-500 px-4 py-2 font-medium text-slate-950"
            >
              Reload page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
