"use client";

import { ReactNode, memo } from "react";

interface ConnectionStatusProps {
  connectionStatus: "connecting" | "connected" | "disconnected" | "error" | "retrying";
  error?: string;
  className?: string;
  onRetry?: () => void;
}

export const ConnectionStatus = memo(function ConnectionStatus({
  connectionStatus,
  error,
  className = "",
  onRetry,
}: ConnectionStatusProps): ReactNode {
  if (connectionStatus === "error" && error) {
    return (
      <div className={`text-red-500 ${className}`}>
        Error connecting to status feed: {error}
        {onRetry && (
          <button
            onClick={onRetry}
            className="ml-2 px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  if (connectionStatus === "connecting" || connectionStatus === "retrying") {
    return (
      <div className={`text-yellow-500 ${className}`}>
        {connectionStatus === "connecting"
          ? "Connecting to status feed..."
          : "Reconnecting to status feed..."}
      </div>
    );
  }

  if (connectionStatus === "disconnected") {
    return (
      <div className={`text-red-500 ${className}`}>
        Disconnected from status feed
        {onRetry && (
          <button
            onClick={onRetry}
            className="ml-2 px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  return null;
});
