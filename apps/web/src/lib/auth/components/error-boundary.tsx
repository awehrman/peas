"use client";

import React from "react";
import { ErrorBoundary as ReactErrorBoundary } from "react-error-boundary";
import { AlertTriangle } from "lucide-react";
import { Button, Placeholder } from "@peas/ui";
import { useState } from "react";

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="max-w-md w-full">
        <Placeholder
          label={error.message || "Something went wrong"}
          icon={<AlertTriangle />}
          button={
            <div className="flex gap-3">
              <Button onClick={resetErrorBoundary} variant="outline">
                Try again
              </Button>
              <Button
                onClick={() => (window.location.href = "/")}
                variant="outline"
              >
                Go home
              </Button>
            </div>
          }
        />
      </div>
    </div>
  );
}

interface AuthErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
}

export function AuthErrorBoundary({
  children,
  fallback = ErrorFallback,
}: AuthErrorBoundaryProps) {
  return (
    <ReactErrorBoundary
      FallbackComponent={fallback}
      onError={(error, errorInfo) => {
        console.error(
          "🔴 Auth Error Boundary caught an error:",
          error,
          errorInfo
        );
      }}
      onReset={() => {
        // Clear any auth-related state or redirect to login
        window.location.href = "/login";
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
}

// Test component to verify error boundaries work
export function TestErrorBoundary() {
  const [shouldThrow, setShouldThrow] = useState(false);

  if (shouldThrow) {
    throw new Error("Test error for error boundary");
  }

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">Error Boundary Test</h2>
      <button
        onClick={() => setShouldThrow(true)}
        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
      >
        Throw Test Error
      </button>
    </div>
  );
}
