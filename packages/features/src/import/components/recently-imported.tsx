"use client";

import { ReactNode } from "react";
import { Item, groupStatusItemsByImport, getStatusColor } from "../utils";
import { useStatusWebSocket } from "../hooks/use-status-websocket";

interface Props {
  className?: string;
}

// Helper function to determine indentation level for group titles
function getGroupIndentLevel(title: string): number {
  const titleLower = title.toLowerCase();

  // Main operations (no indentation)
  if (
    titleLower.includes("added note") ||
    titleLower.includes("note processing") ||
    titleLower.includes("cleaning")
  ) {
    return 0;
  }

  // Sub-operations (indent level 1)
  if (
    titleLower.includes("ingredient") ||
    titleLower.includes("instruction") ||
    titleLower.includes("image") ||
    titleLower.includes("categorization") ||
    titleLower.includes("categorized as")
  ) {
    return 1;
  }

  return 0;
}

// Helper function to get status indicators
function getStatusIndicator(status: string): string {
  switch (status) {
    case "processing":
      return "⏳";
    case "completed":
      return "✅";
    case "error":
      return "❌";
    default:
      return "⏸️";
  }
}

export function RecentlyImported({ className }: Props): ReactNode {
  const { events, connectionStatus, error } = useStatusWebSocket({
    wsUrl: "ws://localhost:8080",
    autoReconnect: true,
    reconnectInterval: 3000,
    maxReconnectAttempts: 5,
  });

  console.log("🔄 RecentlyImported: Raw WebSocket events:", events);

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
    }));

  console.log("📝 RecentlyImported: Converted items:", items);

  // Group items by import ID first, then by operation type within each import
  const importGroups = groupStatusItemsByImport(items);

  console.log("📊 RecentlyImported: Import groups:", importGroups);

  if (importGroups.length === 0) {
    return (
      <div className={className}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Recently Imported
        </h3>
        <div className="text-sm text-gray-500">
          {connectionStatus === "connecting" &&
            "Connecting to status updates..."}
          {connectionStatus === "connected" && "No recent imports"}
          {connectionStatus === "disconnected" &&
            "Disconnected from status updates"}
          {connectionStatus === "error" && `Connection error: ${error}`}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Recently Imported
      </h3>
      <div className="space-y-3">
        {importGroups.map((importGroup) => (
          <div
            key={importGroup.importId}
            className="border-l-2 border-gray-200 pl-4"
          >
            {/* Import Group Header */}
            <div
              className={`flex items-center gap-2 text-sm font-medium ${getStatusColor(importGroup.overallStatus)}`}
            >
              <span>{getStatusIndicator(importGroup.overallStatus)}</span>
              <span>Importing file {importGroup.importId.slice(0, 8)}...</span>
            </div>

            {/* Operations within this import */}
            {importGroup.operations.length > 0 && (
              <div className="mt-2 space-y-2 pl-2.5">
                {importGroup.operations.map((operation) => (
                  <div
                    key={operation.id}
                    className="ml-4 border-l border-gray-100 pl-3"
                  >
                    <div
                      className={`flex items-center gap-2 text-sm font-medium ${getStatusColor(operation.status)}`}
                      style={{
                        paddingLeft:
                          getGroupIndentLevel(operation.title) * 16 + 10,
                      }}
                    >
                      <span>{getStatusIndicator(operation.status)}</span>
                      <span>{operation.title}</span>
                    </div>

                    {operation.children.length > 0 && (
                      <div className="mt-1 space-y-1">
                        {operation.children.map((child) => (
                          <div
                            key={child.id}
                            className="text-sm text-gray-600"
                            style={{
                              paddingLeft: (child.indentLevel + 1) * 16 + 10,
                            }}
                          >
                            {child.text}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
