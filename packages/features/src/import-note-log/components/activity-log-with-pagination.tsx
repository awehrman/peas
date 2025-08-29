"use client";

import { ActivityLogHeader } from "./activity-log-header";
import { AdaptiveActivityItemsListNew } from "./adaptive-activity-items-list-new";
import { ConnectionStatus } from "./connection-status";
import { PendingUploadsList } from "./pending-uploads-list";

import { ReactNode, useEffect, useMemo, useRef } from "react";

import { usePagination } from "@peas/components";
import { usePerformanceMonitoring } from "@peas/components";
import { useWebSocket as useWebSocketIntegration } from "@peas/components";

import { ImportErrorBoundary } from "../../import/components/error-boundary";
import { useImportState } from "../../import/contexts";
import { useImportItems } from "../hooks/use-import-items";
import { StatusEvent } from "../hooks/use-status-websocket";
import { ActivityLogProps } from "../types";
import {
  createFileMatchingMap,
  mergeActivityItems,
} from "../utils/item-merger";

function ActivityLogContent({
  className,
  htmlFiles = [],
  showPagination = true,
  itemsPerPage = 10,
  showCollapsible = true,
  defaultExpandedFirst = true,
}: ActivityLogProps): ReactNode {
  // Use unified import state context
  const { state, isExpanded, expandItem, toggleItem, connectWebSocket } =
    useImportState();

  // Initialize WebSocket integration
  useWebSocketIntegration({
    url: "ws://localhost:3001", // Default WebSocket URL
    reconnectInterval: 3000,
    maxReconnectAttempts: 5,
  });

  // Initialize performance monitoring
  usePerformanceMonitoring({
    enableMemoryMonitoring: true,
    enableRenderTracking: true,
    reportingInterval: 30000, // Report every 30 seconds
    logToConsole: process.env.NODE_ENV === "development",
  });

  const { events, connection, uploadItems, fileTitles } = state;

  // Use custom hook for import items processing without pagination (we'll handle it ourselves)
  const { paginatedItems: importItems } = useImportItems({
    events,
    enablePagination: false, // We'll handle pagination with the new feature
    itemsPerPage,
  });

  // Memoize the combined items to avoid recalculation on every render
  const allCombinedItems = useMemo(
    () => mergeActivityItems({ uploadItems, importItems }),
    [uploadItems, importItems]
  );

  // Use pagination hook to manage pagination state
  const pagination = usePagination({
    totalItems: allCombinedItems.length,
    defaultLimit: itemsPerPage,
  });

  // Get paginated items based on current page
  const combinedItems = useMemo(() => {
    const startIndex = pagination.startIndex;
    const endIndex = pagination.endIndex;
    return allCombinedItems.slice(startIndex, endIndex);
  }, [allCombinedItems, pagination.startIndex, pagination.endIndex]);

  // Track if we've already expanded the first item to prevent race conditions
  const hasExpandedFirstItem = useRef(false);

  // Expand first item by default (only once)
  useEffect(() => {
    if (
      defaultExpandedFirst &&
      combinedItems.length > 0 &&
      !hasExpandedFirstItem.current
    ) {
      const firstItem = combinedItems[0];
      if (firstItem && !isExpanded(firstItem.importId)) {
        expandItem(firstItem.importId);
        hasExpandedFirstItem.current = true;
      }
    }
  }, [defaultExpandedFirst, combinedItems, expandItem, isExpanded]);

  // Memoize the file matching map for better performance
  const fileMatchingMap = useMemo(
    () => createFileMatchingMap(combinedItems),
    [combinedItems]
  );

  // Pre-filter events by importId to avoid O(n²) complexity in child components
  const eventsByImportId = useMemo(() => {
    const map = new Map<string, StatusEvent[]>();
    events.forEach((event) => {
      if (!map.has(event.importId)) {
        map.set(event.importId, []);
      }
      map.get(event.importId)!.push(event);
    });
    return map;
  }, [events]);

  // Handle connection states
  const connectionStatusComponent = (
    <ConnectionStatus
      connectionStatus={connection.status}
      error={connection.error ?? undefined}
      className={className}
      onRetry={connectWebSocket}
    />
  );

  // Determine what to render based on connection status and items
  const shouldShowConnectionStatus = connection.status !== "connected";
  const hasNoItems = combinedItems.length === 0;

  // If not connected, show connection status
  if (shouldShowConnectionStatus) {
    return connectionStatusComponent;
  }

  // If no items, show nothing
  if (hasNoItems) {
    return null;
  }

  // Main render with items
  return (
    <ImportErrorBoundary>
      <div className={`space-y-3 ${className || ""}`}>
        <ActivityLogHeader />

        <PendingUploadsList
          htmlFiles={htmlFiles}
          fileTitles={fileTitles}
          fileMatchingMap={fileMatchingMap}
        />

        <AdaptiveActivityItemsListNew
          items={combinedItems}
          eventsByImportId={eventsByImportId}
          fileTitles={fileTitles}
          showCollapsible={showCollapsible}
          isExpanded={isExpanded}
          onToggle={toggleItem}
        />

        {/* Simple pagination controls */}
        {showPagination && allCombinedItems.length > itemsPerPage && (
          <div className="mt-6 flex justify-center space-x-2">
            <button
              onClick={pagination.goToPreviousPage}
              disabled={!pagination.hasPreviousPage}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-3 py-1">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={pagination.goToNextPage}
              disabled={!pagination.hasNextPage}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </ImportErrorBoundary>
  );
}

export function ActivityLogWithPagination(props: ActivityLogProps): ReactNode {
  return <ActivityLogContent {...props} />;
}
