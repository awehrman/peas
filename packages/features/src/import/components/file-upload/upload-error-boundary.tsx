"use client";

import React, { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class UploadErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Upload error boundary caught an error:", {
      error: error.message,
      errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="p-4 bg-error-50 rounded-md">
            <h3 className="text-sm font-medium text-error-800">Upload Error</h3>
            <p className="mt-1 text-sm text-error-700">
              An unexpected error occurred during upload. Please try again.
            </p>
            <button
              onClick={() =>
                this.setState({ hasError: false, error: undefined })
              }
              className="mt-2 text-sm text-error-600 hover:text-error-500"
            >
              Try Again
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
