"use client";

import { ReactNode, useMemo } from "react";

import { useUploadContext } from "../../contexts/upload-context";
import { useStatusWebSocket } from "../../hooks/use-status-websocket";

interface ImportItem {
  importId: string;
  htmlFileName: string;
  noteTitle?: string;
  status: "importing" | "completed" | "failed";
  createdAt: Date;
  completedAt?: Date;
}

interface ActivityLogProps {
  className?: string;
  htmlFiles?: string[]; // List of HTML files from upload
}

export function ActivityLog({
  className,
  htmlFiles = [],
}: ActivityLogProps): ReactNode {
  const { events, connectionStatus, error } = useStatusWebSocket({
    reconnectInterval: 3000,
    maxReconnectAttempts: 5,
  });
  const { fileTitles } = useUploadContext();

  // Process events into import items
  const importItems = useMemo(() => {
    const items = new Map<string, ImportItem>();

    // Sort events by timestamp
    const sortedEvents = [...events].sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return dateA.getTime() - dateB.getTime();
    });

    for (const event of sortedEvents) {
      const importId = event.importId;

      if (!items.has(importId)) {
        // Create new import item
        items.set(importId, {
          importId,
          htmlFileName: "", // Will be filled from upload or events
          noteTitle: event.metadata?.noteTitle as string,
          status: "importing",
          createdAt: new Date(event.createdAt),
        });
      }

      const item = items.get(importId)!;

      // Try to get filename from event metadata
      if (event.metadata?.htmlFileName && !item.htmlFileName) {
        item.htmlFileName = event.metadata.htmlFileName as string;
      }

      // Update note title if available
      if (event.metadata?.noteTitle) {
        item.noteTitle = event.metadata.noteTitle as string;
      }

      // Check for completion events
      if (event.status === "COMPLETED" && event.context === "note_completion") {
        item.status = "completed";
        item.completedAt = new Date(event.createdAt);
      }

      // Check for failure events
      if (event.status === "FAILED") {
        item.status = "failed";
        item.completedAt = new Date(event.createdAt);
      }
    }

    const result = Array.from(items.values());
    return result;
  }, [events, fileTitles]);

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

  if (importItems.length === 0 && htmlFiles.length === 0) {
    return (
      <div className={`text-gray-500 ${className || ""}`}>
        No import activity yet...
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className || ""}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Import Activity
      </h3>

      {/* Show HTML files that are being uploaded but don't have events yet */}
      {htmlFiles.map((htmlFile, index) => {
        const importItem = importItems.find(
          (item) =>
            item.htmlFileName === htmlFile ||
            item.noteTitle === htmlFile.replace(/\.(html|htm)$/, "")
        );

        if (!importItem) {
          const extractedTitle = fileTitles.get(htmlFile);
          const displayName =
            extractedTitle || htmlFile.replace(/\.(html|htm)$/, "");

          return (
            <div
              key={`pending-${index}`}
              className="flex items-center space-x-3 p-3 bg-blue-50 border border-blue-200 rounded"
            >
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <div className="text-blue-800">Importing {displayName}...</div>
            </div>
          );
        }

        return null; // Will be rendered in the importItems loop
      })}

      {/* Show import items with events */}
      {importItems.map((item) => (
        <div
          key={item.importId}
          className="flex items-center space-x-3 p-3 border rounded"
        >
          {/* Status Icon */}
          <div className="flex-shrink-0">
            {item.status === "completed" && (
              <div className="text-green-600 text-lg">✅</div>
            )}
            {item.status === "failed" && (
              <div className="text-red-600 text-lg">❌</div>
            )}
            {item.status === "importing" && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            )}
          </div>

          {/* Status Text */}
          <div className="flex-1">
            {item.status === "completed" && (
              <div className="text-green-800 font-medium">
                {(() => {
                  const displayTitle =
                    item.noteTitle ||
                    fileTitles.get(item.htmlFileName) ||
                    item.htmlFileName ||
                    "Note";
                  return `Added ${displayTitle}`;
                })()}
              </div>
            )}
            {item.status === "failed" && (
              <div className="text-red-800 font-medium">
                {(() => {
                  const displayTitle =
                    item.noteTitle ||
                    fileTitles.get(item.htmlFileName) ||
                    item.htmlFileName ||
                    "Note";
                  return `Failed to import ${displayTitle}`;
                })()}
              </div>
            )}
            {item.status === "importing" && (
              <div className="text-blue-800">
                {(() => {
                  const displayTitle = item.noteTitle
                    ? item.noteTitle
                    : fileTitles.get(item.htmlFileName) ||
                      item.htmlFileName ||
                      "Note";
                  return `Importing ${displayTitle}...`;
                })()}
              </div>
            )}
          </div>

          {/* Timestamp */}
          <div className="text-sm text-gray-500">
            {item.completedAt
              ? item.completedAt.toLocaleTimeString()
              : item.createdAt.toLocaleTimeString()}
          </div>
        </div>
      ))}
    </div>
  );
}
