import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = 'An unexpected error occurred.';
      try {
        const parsed = JSON.parse(this.state.error?.message || '');
        if (parsed.error) {
          errorMessage = `Firestore Error: ${parsed.error} (${parsed.operationType} on ${parsed.path})`;
        }
      } catch {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-bg-primary p-6 text-center">
          <h1 className="text-danger text-2xl font-bold mb-4">System Failure</h1>
          <p className="text-secondary-text mb-6">{errorMessage}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-bg-tertiary border border-primary-accent text-primary-accent rounded-sm hover:bg-bg-secondary transition-colors"
          >
            Reboot System
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
