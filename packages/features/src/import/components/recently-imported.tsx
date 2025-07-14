"use client";

import { ReactNode } from "react";
import { Item, groupStatusItems, getStatusColor } from "../utils";
import { useStatusWebSocket } from "../hooks/use-status-websocket";

interface Props {
  className?: string;
}

// Helper function to determine indentation level based on context and message
function getIndentLevel(context?: string, message?: string): number {
  const contextLower = context?.toLowerCase() || "";
  const messageLower = message?.toLowerCase() || "";

  // Main operations (no indentation)
  if (contextLower.includes("import") || messageLower.includes("added note")) {
    return 0;
  }

  // Sub-operations (indent level 1)
  if (
    contextLower.includes("ingredient") ||
    contextLower.includes("instruction") ||
    contextLower.includes("image") ||
    contextLower.includes("categorization") ||
    messageLower.includes("ingredient") ||
    messageLower.includes("instruction") ||
    messageLower.includes("image") ||
    messageLower.includes("categoriz")
  ) {
    return 1;
  }

  // Progress updates and detailed messages (indent level 2)
  if (
    messageLower.includes("%") ||
    messageLower.includes("step") ||
    messageLower.includes("processed") ||
    messageLower.includes("finished") ||
    messageLower.includes("uploaded successfully") ||
    messageLower.includes("extracting") ||
    messageLower.includes("compressing") ||
    messageLower.includes("generating")
  ) {
    return 2;
  }

  return 0;
}

// Helper function to determine indentation level for group titles
function getGroupIndentLevel(title: string): number {
  const titleLower = title.toLowerCase();

  // Main operations (no indentation)
  if (
    titleLower.includes("added note") ||
    titleLower.includes("note processing")
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

  // Convert WebSocket events to Item format
  const items: Item[] = events.map((event) => ({
    id: `${event.noteId}-${new Date(event.createdAt).getTime()}`,
    text:
      event.errorMessage ||
      event.message ||
      event.context ||
      `Status ${event.status}`,
    indentLevel: getIndentLevel(event.context, event.message),
  }));

  // Group items by operation type and organize them hierarchically
  const groupedItems = groupStatusItems(items);

  if (groupedItems.length === 0) {
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
        {groupedItems.map((group) => (
          <div key={group.id} className="border-l-2 border-gray-200 pl-4">
            <div
              className={`flex items-center gap-2 text-sm font-medium ${getStatusColor(group.status)}`}
              style={{
                paddingLeft: getGroupIndentLevel(group.title) * 16,
              }}
            >
              <span>{getStatusIndicator(group.status)}</span>
              <span>{group.title}</span>
            </div>

            {group.children.length > 0 && (
              <div className="mt-2 space-y-1">
                {group.children.map((child) => (
                  <div
                    key={child.id}
                    className="text-sm text-gray-600"
                    style={{
                      paddingLeft: (child.indentLevel + 1) * 16,
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
    </div>
  );
}
