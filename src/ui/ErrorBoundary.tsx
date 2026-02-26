import React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary to catch and display React rendering errors
 * Prevents the entire app from crashing if a component fails
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="mx-auto mt-16 max-w-lg rounded-xl border border-rose-500/40 bg-rose-950/20 p-5 text-sm text-rose-200">
          <h2 className="font-semibold text-rose-100">Something went wrong</h2>
          <p className="mt-2 text-xs text-rose-300">{this.state.error?.message || "Unknown error"}</p>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="mt-3 rounded border border-rose-500 px-3 py-1 text-xs font-semibold text-rose-200 hover:bg-rose-900/20"
          >
            Reload Game
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
