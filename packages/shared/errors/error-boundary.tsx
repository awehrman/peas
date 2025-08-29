/**
 * Feature error boundary for handling and displaying errors
 */

import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { FeatureError, type FeatureErrorContext } from './feature-error';

export interface ErrorBoundaryState {
  hasError: boolean;
  error?: FeatureError;
  errorInfo?: ErrorInfo;
}

export interface ErrorBoundaryProps {
  children: ReactNode;
  featureName: string;
  fallback?: (error: FeatureError, errorInfo: ErrorInfo) => ReactNode;
  onError?: (error: FeatureError, errorInfo: ErrorInfo) => void;
  context?: Omit<FeatureErrorContext, 'timestamp' | 'operation'>;
}

export class FeatureErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Convert to FeatureError if it's not already
    if (FeatureError.isFeatureError(error)) {
      return {
        hasError: true,
        error: error as FeatureError
      };
    }

    // Convert regular error to FeatureError
    const featureError = new FeatureError(
      error.message,
      'unknown',
      'error-boundary',
      {
        cause: error,
        context: {
          featureName: 'unknown',
          operation: 'error-boundary',
          timestamp: new Date().toISOString()
        }
      }
    );

    return {
      hasError: true,
      error: featureError
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { featureName, onError, context } = this.props;

    // Create FeatureError if it's not already one
    let featureError: FeatureError;
    if (FeatureError.isFeatureError(error)) {
      featureError = error as FeatureError;
    } else {
      featureError = new FeatureError(
        error.message,
        featureName,
        'error-boundary',
        {
          cause: error,
          context: {
            featureName,
            operation: 'error-boundary',
            timestamp: new Date().toISOString(),
            ...context
          }
        }
      );
    }

    this.setState({
      error: featureError,
      errorInfo
    });

    // Call error handler if provided
    if (onError) {
      onError(featureError, errorInfo);
    }

    // Log error for monitoring
    console.error('Feature Error Boundary caught an error:', {
      error: featureError.toJSON(),
      errorInfo: {
        componentStack: errorInfo.componentStack
      }
    });
  }

  resetError = (): void => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback } = this.props;

    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback && errorInfo) {
        return fallback(error, errorInfo);
      }

      // Default error UI
      return (
        <div className="feature-error-boundary">
          <div className="error-container">
            <h2>Something went wrong</h2>
            <p>An error occurred in the {error.featureName} feature.</p>
            <details>
              <summary>Error Details</summary>
              <pre>{error.message}</pre>
              {errorInfo && (
                <pre>{errorInfo.componentStack}</pre>
              )}
            </details>
            <button onClick={this.resetError}>
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return children;
  }
}

export function withFeatureErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  featureName: string,
  options: Omit<ErrorBoundaryProps, 'children' | 'featureName'> = {}
) {
  return function WithFeatureErrorBoundary(props: P) {
    return (
      <FeatureErrorBoundary featureName={featureName} {...options}>
        <WrappedComponent {...props} />
      </FeatureErrorBoundary>
    );
  };
}

export function useFeatureErrorBoundary() {
  return {
    FeatureErrorBoundary,
    withFeatureErrorBoundary
  };
}
