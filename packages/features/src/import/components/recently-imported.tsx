"use client";

import { ReactNode } from "react";
import {
  Item,
  groupStatusItems,
  getStatusColor,
  getStatusIcon,
} from "../utils";
import { useStatusWebSocket } from "../hooks/use-status-websocket";

interface Props {
  className?: string;
}

export function RecentlyImported({ className }: Props): ReactNode {
  console.log("🔍 Component: RecentlyImported component rendered");

  const { events, isConnected, connectionStatus, error } = useStatusWebSocket({
    wsUrl: "ws://localhost:8080",
    autoReconnect: true,
    reconnectInterval: 3000,
    maxReconnectAttempts: 5,
  });

  // Convert WebSocket events to Item format
  const items: Item[] = events.map((event) => ({
    id: `${event.noteId}-${event.createdAt.getTime()}`,
    text:
      event.errorMessage ||
      event.message ||
      event.context ||
      `Status ${event.status}`,
    indentLevel:
      event.context?.includes("ingredient") ||
      event.context?.includes("instruction")
        ? 1
        : 0,
  }));

  // Group items by operation type and organize them hierarchically
  const groupedItems = groupStatusItems(items);

  console.log("🔍 Component: Render check", {
    isConnected,
    connectionStatus,
    eventsCount: events.length,
    itemsCount: items.length,
    groupedItemsCount: groupedItems.length,
  });

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
            >
              <span>{getStatusIcon(group.status)}</span>
              <span>{group.title}</span>
            </div>

            {group.children.length > 0 && (
              <div className="mt-2 ml-6 space-y-1">
                {group.children.map((child) => (
                  <div
                    key={child.id}
                    className="text-sm text-gray-600"
                    style={{
                      paddingLeft: child.indentLevel * 8,
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
