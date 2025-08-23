"use client";

import { CollapsibleImportItem } from "./collapsible-import-item";
import { ConnectionStatus } from "./connection-status";
import { ImportItemComponent } from "./import-item";
import { PaginationControls } from "./pagination-controls";
import { PendingUploadItem } from "./pending-upload-item";
import { ActivityLogProps } from "./types";

import { ReactNode, useCallback, useEffect, useMemo, useRef } from "react";

import { useUploadContext } from "../../contexts/upload-context";
import { useCollapsibleState } from "../../hooks/use-collapsible-state";
import { useImportItems } from "../../hooks/use-import-items";
import { useStatusWebSocket } from "../../hooks/use-status-websocket";

import { createFileMatchingMap, mergeActivityItems } from "./utils/item-merger";

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

  // Track if we've already expanded the first item to prevent race conditions
  const hasExpandedFirstItem = useRef(false);

  // Expand first item by default (only once)
  useEffect(() => {
    if (
      defaultExpandedFirst &&
      importItems.length > 0 &&
      !hasExpandedFirstItem.current
    ) {
      const firstItem = importItems[0];
      if (firstItem && !collapsibleState.isExpanded(firstItem.importId)) {
        collapsibleState.expandItem(firstItem.importId);
        hasExpandedFirstItem.current = true;
      }
    }
  }, [
    defaultExpandedFirst,
    importItems,
    collapsibleState.expandItem,
    collapsibleState.isExpanded,
  ]);

  // Memoize the combined items to avoid recalculation on every render
  const combinedItems = useMemo(
    () => mergeActivityItems({ uploadItems, importItems }),
    [uploadItems, importItems]
  );

  // Memoize the file matching map for better performance
  const fileMatchingMap = useMemo(
    () => createFileMatchingMap(combinedItems),
    [combinedItems]
  );

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
          // Create a stable callback for each item to prevent unnecessary re-renders
          const handleToggle = () => collapsibleState.toggleItem(item.importId);

          return (
            <CollapsibleImportItem
              key={item.importId}
              item={item}
              fileTitles={fileTitles}
              events={events}
              isExpanded={collapsibleState.isExpanded(item.importId)}
              onToggle={handleToggle}
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
