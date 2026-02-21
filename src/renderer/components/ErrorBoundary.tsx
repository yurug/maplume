import React, { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  /** Name of the section for error messages */
  sectionName?: string;
  /** Called when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component that catches JavaScript errors in child components
 * and displays a fallback UI instead of crashing the whole app.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error for debugging
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="rounded-full bg-danger-100 p-3 dark:bg-danger-900/30">
            <AlertTriangle className="h-6 w-6 text-danger-600 dark:text-danger-400" />
          </div>
          <div className="space-y-1">
            <h3 className="font-serif text-lg font-semibold text-warm-900 dark:text-warm-50">
              Something went wrong
            </h3>
            <p className="text-sm text-warm-500 dark:text-warm-400">
              {this.props.sectionName
                ? `An error occurred in ${this.props.sectionName}.`
                : 'An unexpected error occurred.'}
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <p className="mt-2 max-w-md font-mono text-xs text-danger-600 dark:text-danger-400">
                {this.state.error.message}
              </p>
            )}
          </div>
          <Button variant="secondary" onClick={this.handleRetry}>
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
