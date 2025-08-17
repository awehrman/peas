"use client";

import { ReactNode, memo } from "react";

interface ConnectionStatusProps {
  connectionStatus: "connecting" | "connected" | "disconnected" | "error" | "retrying";
  error?: string;
  className?: string;
}

export const ConnectionStatus = memo(function ConnectionStatus({
  connectionStatus,
  error,
  className = "",
}: ConnectionStatusProps): ReactNode {
  if (connectionStatus === "error" && error) {
    return (
      <div className={`text-red-500 ${className}`}>
        Error connecting to status feed: {error}
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
      </div>
    );
  }

  return null;
});
