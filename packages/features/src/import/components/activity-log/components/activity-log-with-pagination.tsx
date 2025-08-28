"use client";

import { ActivityLogHeader } from "./activity-log-header";
import { AdaptiveActivityItemsListNew } from "./adaptive-activity-items-list-new";
import { PendingUploadsList } from "./pending-uploads-list";

import { ReactNode, useEffect, useMemo, useRef } from "react";

import { useImportState } from "../../../contexts";
import { PaginationProvider } from "../../../features/pagination";
import { PaginationControls } from "../../../features/pagination";
import { usePaginatedItems } from "../../../features/pagination/hooks/use-paginated-items";
import { useImportItems } from "../../../hooks/use-import-items";
import { usePerformanceMonitoring } from "../../../hooks/use-performance-monitoring";
import { StatusEvent } from "../../../hooks/use-status-websocket";
import { useWebSocketIntegration } from "../../../hooks/use-websocket-integration";
import { ImportErrorBoundary } from "../../error-boundary";
import { ConnectionStatus } from "../connection-status";
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

  // Use the new pagination hook to get paginated items
  const { paginatedItems: combinedItems } = usePaginatedItems(allCombinedItems);

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
          virtualizationThreshold={50}
          defaultItemHeight={80}
        />

        {/* Pagination controls using the new feature */}
        {showPagination && allCombinedItems.length > itemsPerPage && (
          <div className="mt-6">
            <PaginationControls />
          </div>
        )}
      </div>
    </ImportErrorBoundary>
  );
}

export function ActivityLogWithPagination(props: ActivityLogProps): ReactNode {
  // We need to calculate the total items first, so we'll use a wrapper
  return <ActivityLogWrapper {...props} />;
}

function ActivityLogWrapper(props: ActivityLogProps): ReactNode {
  // Use unified import state context to get total items
  const { state } = useImportState();
  const { events, uploadItems } = state;

  // Use custom hook for import items processing to get total count
  const { paginatedItems: importItems } = useImportItems({
    events,
    enablePagination: false, // Don't paginate here, just get the count
    itemsPerPage: props.itemsPerPage || 10,
  });

  // Calculate total items (this is a simplified version of mergeActivityItems)
  const totalItems = uploadItems.size + importItems.length;

  return (
    <PaginationProvider
      totalItems={totalItems}
      defaultLimit={props.itemsPerPage || 10}
      defaultPage={1}
    >
      <ActivityLogContent {...props} />
    </PaginationProvider>
  );
}
