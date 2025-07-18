"use client";

import { ReactNode } from "react";

interface ConnectionStatusProps {
  connectionStatus: string;
  error?: string;
}

export function ConnectionStatus({
  connectionStatus,
  error,
}: ConnectionStatusProps): ReactNode {
  return (
    <div className="text-sm text-gray-500">
      {connectionStatus === "connecting" && "Connecting to status updates..."}
      {connectionStatus === "connected" && "No recent imports"}
      {connectionStatus === "disconnected" &&
        "Disconnected from status updates"}
      {connectionStatus === "error" && `Connection error: ${error}`}
    </div>
  );
}
