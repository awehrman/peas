"use client";

import { ConnectionStatus } from "./connection-status";
import { ActivityLogProps } from "./types";

import { ReactNode, useEffect, useMemo, useRef } from "react";

import { useImportState } from "../../contexts";
import { useImportItems } from "../../hooks/use-import-items";
import { usePerformanceMonitoring } from "../../hooks/use-performance-monitoring";
import { StatusEvent } from "../../hooks/use-status-websocket";
import { useWebSocketIntegration } from "../../hooks/use-websocket-integration";
import { ImportErrorBoundary } from "../error-boundary";

import { ActivityLogHeader } from "./components/activity-log-header";
import { ActivityPagination } from "./components/activity-pagination";
import { AdaptiveActivityItemsList } from "./components/adaptive-activity-items-list";
import { PendingUploadsList } from "./components/pending-uploads-list";
import { createFileMatchingMap, mergeActivityItems } from "./utils/item-merger";

export function ActivityLog({
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

  // Use custom hook for import items processing with pagination
  const { paginatedItems: importItems } = useImportItems({
    events,
    enablePagination: showPagination,
    itemsPerPage,
  });

  // Memoize the combined items to avoid recalculation on every render
  const combinedItems = useMemo(
    () => mergeActivityItems({ uploadItems, importItems }),
    [uploadItems, importItems]
  );

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

        <AdaptiveActivityItemsList
          items={combinedItems}
          eventsByImportId={eventsByImportId}
          fileTitles={fileTitles}
          showCollapsible={showCollapsible}
          isExpanded={isExpanded}
          onToggle={toggleItem}
          virtualizationThreshold={50}
          defaultItemHeight={80}
        />

        <ActivityPagination
          showPagination={showPagination}
          totalItems={combinedItems.length}
          itemsPerPage={itemsPerPage}
        />
      </div>
    </ImportErrorBoundary>
  );
}
