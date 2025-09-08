"use client";

import { ActivityProvider } from "./activity";
import { ContextErrorBoundary } from "./error-boundary";
import { StatsProvider } from "./stats";
import { ImportUploadProvider } from "./upload";
import { WsProvider } from "./ws";

import { type ReactNode } from "react";

import { useWebSocketUploadIntegration } from "../hooks/use-websocket-upload-integration";
import type { ImportStatsState, StatusEvent } from "../types/import-types";

interface ImportProviderProps {
  children: ReactNode;
  onStatsRefresh?: () => Promise<ImportStatsState>;
}

/**
 * Internal component that provides WebSocket integration
 */
function WebSocketIntegrationWrapper({
  children,
  onStatsRefresh,
}: {
  children: ReactNode;
  onStatsRefresh?: () => Promise<ImportStatsState>;
}) {
  const { handleStatusUpdate } = useWebSocketUploadIntegration(onStatsRefresh);

  return (
    <WsProvider onStatusUpdate={handleStatusUpdate}>{children}</WsProvider>
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
              <WebSocketIntegrationWrapper onStatsRefresh={onStatsRefresh}>
                <ContextErrorBoundary>
                  <ActivityProvider>{children}</ActivityProvider>
                </ContextErrorBoundary>
              </WebSocketIntegrationWrapper>
            </ContextErrorBoundary>
          </StatsProvider>
        </ContextErrorBoundary>
      </ImportUploadProvider>
    </ContextErrorBoundary>
  );
}
