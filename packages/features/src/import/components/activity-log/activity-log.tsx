"use client";

import { ReactNode } from "react";
import { Item, groupStatusItemsByImport } from "../../utils";
import { useStatusWebSocket } from "../../hooks/use-status-websocket";
import { ActivityGroup } from "./activity-group";
import { ConnectionStatus } from "./connection-status";

interface Props {
  className?: string;
}

export function ActivityLog({ className }: Props): ReactNode {
  const { events, connectionStatus, error } = useStatusWebSocket({
    wsUrl: "ws://localhost:8080",
    autoReconnect: true,
    reconnectInterval: 3000,
    maxReconnectAttempts: 5,
  });

  // Convert WebSocket events to Item format, filtering out "Cleaning HTML file..." messages
  const items: Item[] = events
    .filter((event) => {
      const message =
        event.errorMessage ||
        event.message ||
        event.context ||
        `Status ${event.status}`;
      return !message.toLowerCase().includes("cleaning html file");
    })
    .map((event) => ({
      id: `${event.importId}-${new Date(event.createdAt).getTime()}`,
      text:
        event.errorMessage ||
        event.message ||
        event.context ||
        `Status ${event.status}`,
      indentLevel: event.indentLevel ?? 0, // Use explicit indentLevel from WebSocket, default to 0
      importId: event.importId, // Include importId for grouping
      timestamp: new Date(event.createdAt), // Include timestamp for sorting
      metadata: event.metadata, // Include metadata for additional info like note title
      context: event.context, // Include context for operation type
    }));

  // Group items by import ID first, then by operation type within each import
  const importGroups = groupStatusItemsByImport(items);

  if (importGroups.length === 0) {
    return (
      <div className={className}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Activity Log
        </h3>
        <ConnectionStatus
          connectionStatus={connectionStatus}
          error={error || undefined}
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Recently Added
      </h3>
      <div className="space-y-3">
        {importGroups.map((importGroup) => (
          <ActivityGroup
            key={importGroup.importId}
            title={importGroup.title}
            overallStatus={importGroup.overallStatus}
            operations={importGroup.operations}
          />
        ))}
      </div>
    </div>
  );
}
