"use client";

import { ImportStatusItem } from "./import-status-item";
import { processStatusEvents } from "./status-processor";
import { Props } from "./types";

import { ReactNode, useMemo } from "react";

import { useStatusWebSocket } from "../../hooks/use-status-websocket";

export function ActivityLog({ className }: Props): ReactNode {
  const { events, connectionStatus, error } = useStatusWebSocket({
    reconnectInterval: 3000,
    maxReconnectAttempts: 5,
  });

  // Process events into organized import statuses
  const importStatuses = useMemo(() => {
    return Array.from(processStatusEvents(events).values());
  }, [events]);

  // Handle connection states
  if (connectionStatus === "error" && error) {
    return (
      <div className={`text-red-500 ${className || ""}`}>
        Error connecting to status feed: {error}
      </div>
    );
  }

  if (connectionStatus === "connecting" || connectionStatus === "retrying") {
    return (
      <div className={`text-yellow-500 ${className || ""}`}>
        {connectionStatus === "connecting"
          ? "Connecting to status feed..."
          : "Reconnecting to status feed..."}
      </div>
    );
  }

  if (connectionStatus === "disconnected") {
    return (
      <div className={`text-red-500 ${className || ""}`}>
        Disconnected from status feed
      </div>
    );
  }

  if (importStatuses.length === 0) {
    return (
      <div className={`text-gray-500 ${className || ""}`}>
        No import activity yet...
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className || ""}`}>
      {importStatuses.map((importStatus) => (
        <ImportStatusItem
          key={importStatus.importId}
          importStatus={importStatus}
        />
      ))}
    </div>
  );
}
