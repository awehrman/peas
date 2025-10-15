"use client";

import { ActivityProvider } from "./activity";
import { ContextErrorBoundary } from "./error-boundary";
import { StatsProvider } from "./stats";
import { ImportUploadProvider } from "./upload";
import { WsProvider } from "./ws";

import { type ReactNode, useCallback } from "react";

import { useWebSocketActivityIntegration } from "../hooks/use-websocket-activity-integration";
import { useWebSocketUploadIntegration } from "../hooks/use-websocket-upload-integration";
import type { ImportStatsState, StatusEvent } from "../types/import-types";

interface ImportProviderProps {
  children: ReactNode;
  onStatsRefresh?: () => Promise<ImportStatsState>;
}

/**
 * Internal component that integrates both upload and activity handlers
 * Must be inside ActivityProvider to use useWebSocketActivityIntegration
 */
function WebSocketIntegrationWrapper({
  children,
  onStatsRefresh,
}: {
  children: ReactNode;
  onStatsRefresh?: () => Promise<ImportStatsState>;
}) {
  const { handleStatusUpdate } = useWebSocketUploadIntegration(onStatsRefresh);
  const { handleActivityStatusUpdate } = useWebSocketActivityIntegration();

  // Combined handler that calls both upload and activity handlers
  const handleCombinedStatusUpdate = useCallback(
    (statusEvent: StatusEvent) => {
      handleStatusUpdate(statusEvent);
      handleActivityStatusUpdate(statusEvent);
    },
    [handleStatusUpdate, handleActivityStatusUpdate]
  );

  return (
    <WsProvider onStatusUpdate={handleCombinedStatusUpdate}>
      {children}
    </WsProvider>
  );
}

/**
 * Unified import provider that wraps all import-related contexts
 * Provides upload, websocket, stats, and activity contexts to children
 * Includes error boundaries for better error handling
 */
export function ImportProvider({
  children,
  onStatsRefresh,
}: ImportProviderProps) {
  return (
    <ContextErrorBoundary
      onError={(error, errorInfo) => {
        console.error("Import context error:", error, errorInfo);
      }}
    >
      <ImportUploadProvider>
        <ContextErrorBoundary>
          <StatsProvider>
            <ContextErrorBoundary>
              <ActivityProvider>
                <ContextErrorBoundary>
                  <WebSocketIntegrationWrapper onStatsRefresh={onStatsRefresh}>
                    {children}
                  </WebSocketIntegrationWrapper>
                </ContextErrorBoundary>
              </ActivityProvider>
            </ContextErrorBoundary>
          </StatsProvider>
        </ContextErrorBoundary>
      </ImportUploadProvider>
    </ContextErrorBoundary>
  );
}
