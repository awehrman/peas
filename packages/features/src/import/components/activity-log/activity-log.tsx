"use client";

import { CollapsibleImportItem } from "./collapsible-import-item";
import { ConnectionStatus } from "./connection-status";
import { ImportItemComponent } from "./import-item";
import { PaginationControls } from "./pagination-controls";
import { PendingUploadItem } from "./pending-upload-item";
import { ActivityItem, ActivityLogProps, UploadProgress } from "./types";

import { ReactNode, useEffect, useMemo } from "react";

import { useUploadContext } from "../../contexts/upload-context";
import { useCollapsibleState } from "../../hooks/use-collapsible-state";
import { useImportItems } from "../../hooks/use-import-items";
import { useStatusWebSocket } from "../../hooks/use-status-websocket";

export function ActivityLog({
  className,
  htmlFiles = [],
  showPagination = true,
  itemsPerPage = 10,
  showCollapsible = true,
  defaultExpandedFirst = true,
}: ActivityLogProps): ReactNode {
  const { events, connectionStatus, error } = useStatusWebSocket({
    reconnectInterval: 3000,
    maxReconnectAttempts: 5,
  });
  const { fileTitles, uploadItems } = useUploadContext();

  // Use custom hook for import items processing with pagination
  const { allItems: allImportItems, paginatedItems: importItems } =
    useImportItems({
      events,
      enablePagination: showPagination,
      itemsPerPage,
    });

  // Use collapsible state management
  const collapsibleState = useCollapsibleState({
    storageKey: "activity-log-expanded",
    persistState: true,
  });

  // Expand first item by default
  useEffect(() => {
    if (defaultExpandedFirst && importItems.length > 0) {
      const firstItem = importItems[0];
      if (firstItem && !collapsibleState.isExpanded(firstItem.importId)) {
        collapsibleState.expandItem(firstItem.importId);
      }
    }
  }, [defaultExpandedFirst, importItems, collapsibleState]);

  // Memoize the combined items to avoid recalculation on every render
  const combinedItems = useMemo(() => {
    const allItems = new Map<string, ActivityItem>();

    // Add upload items first
    uploadItems.forEach((item) => {
      allItems.set(item.importId, {
        ...item,
        type: "upload",
        // Keep the original upload status for upload items
        status: item.status,
      });
    });

    // Add import items, but preserve upload progress information
    importItems.forEach((item) => {
      const existingItem = allItems.get(item.importId);
      if (existingItem && existingItem.type === "upload") {
        // Merge upload progress with import status
        const uploadProgress: UploadProgress = {
          htmlFileName: existingItem.htmlFileName,
          imageCount: existingItem.imageCount,
          uploadStatus: existingItem.status,
        };

        allItems.set(item.importId, {
          ...item,
          type: "import",
          uploadProgress,
        });
      } else {
        // No existing upload item, but we have an import item
        // This could happen if the WebSocket receives events for an importId
        // that doesn't have a corresponding upload item

        // Try to find the upload item by importId to get the htmlFileName
        const uploadItem = Array.from(uploadItems.entries()).find(
          ([uploadImportId]) => uploadImportId === item.importId
        );

        if (uploadItem) {
          // We found a matching upload item, use its htmlFileName
          const [, uploadData] = uploadItem;

          allItems.set(item.importId, {
            ...item,
            type: "import",
            htmlFileName: uploadData.htmlFileName,
          });
        } else {
          // No matching upload item found

          if (!item.htmlFileName && !item.noteTitle) {
            // Skip items that have no identifying information

            return;
          } else {
            // Use a fallback filename if htmlFileName is empty
            const displayFileName =
              item.htmlFileName ||
              item.noteTitle ||
              `Import ${item.importId.slice(-8)}`;
            allItems.set(item.importId, {
              ...item,
              type: "import",
              htmlFileName: displayFileName,
            });
          }
        }
      }
    });

    // Preserve insertion order (no resorting) so items don't move around on updates
    const result = Array.from(allItems.values());

    return result;
  }, [uploadItems, importItems]);

  // Memoize the file matching map for better performance
  const fileMatchingMap = useMemo(() => {
    const map = new Map<string, ActivityItem>();
    combinedItems.forEach((item) => {
      if (item.htmlFileName) {
        map.set(item.htmlFileName, item);
      }
      if ("noteTitle" in item && item.noteTitle) {
        map.set(item.noteTitle, item);
      }
    });
    return map;
  }, [combinedItems]);

  // Handle connection states
  const connectionStatusComponent = (
    <ConnectionStatus
      connectionStatus={connectionStatus}
      error={error ?? undefined}
      className={className}
    />
  );

  if (connectionStatus !== "connected") {
    return connectionStatusComponent;
  }

  if (combinedItems.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className || ""}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Import activity
      </h3>

      {/* Show HTML files that are being uploaded but don't have events yet */}
      {htmlFiles.map((htmlFile, index) => {
        const importItem =
          fileMatchingMap.get(htmlFile) ||
          fileMatchingMap.get(htmlFile.replace(/\.(html|htm)$/, ""));

        if (!importItem) {
          const extractedTitle = fileTitles.get(htmlFile);
          return (
            <PendingUploadItem
              key={`pending-${index}`}
              htmlFile={htmlFile}
              extractedTitle={extractedTitle}
              index={index}
            />
          );
        }

        return null; // Will be rendered in the combinedItems loop
      })}

      {/* Show all items (upload and import) */}
      {combinedItems.map((item) => {
        if (showCollapsible && "noteTitle" in item && item.type === "import") {
          return (
            <CollapsibleImportItem
              key={item.importId}
              item={item}
              fileTitles={fileTitles}
              events={events}
              isExpanded={collapsibleState.isExpanded(item.importId)}
              onToggle={() => collapsibleState.toggleItem(item.importId)}
            />
          );
        }

        return (
          <ImportItemComponent
            key={item.importId}
            item={item}
            fileTitles={fileTitles}
          />
        );
      })}

      {/* Pagination Controls */}
      {showPagination &&
        uploadItems.size + allImportItems.length > itemsPerPage && (
          <div className="mt-6">
            <PaginationControls
              totalItems={uploadItems.size + allImportItems.length}
            />
          </div>
        )}
    </div>
  );
}
