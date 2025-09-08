"use client";

import { ActivityProvider } from "./activity";
import { ContextErrorBoundary } from "./error-boundary";
import { StatsProvider } from "./stats";
import { ImportUploadProvider } from "./upload";
import { WsProvider } from "./ws";

import { type ReactNode } from "react";

import { useWebSocketUploadIntegration } from "../hooks/use-websocket-upload-integration";

interface ImportProviderProps {
  children: ReactNode;
}

/**
 * Internal component that provides WebSocket integration with upload context
 */
function WebSocketIntegrationWrapper({ children }: { children: ReactNode }) {
  const { handleStatusUpdate } = useWebSocketUploadIntegration();

  return (
    <WsProvider onStatusUpdate={handleStatusUpdate}>
      <ContextErrorBoundary>
        <StatsProvider>
          <ContextErrorBoundary>
            <ActivityProvider>{children}</ActivityProvider>
          </ContextErrorBoundary>
        </StatsProvider>
      </ContextErrorBoundary>
    </WsProvider>
  );
}

/**
 * Unified import provider that wraps all import-related contexts
 * Provides upload, websocket, stats, and activity contexts to children
 * Includes error boundaries for better error handling
 */
export function ImportProvider({ children }: ImportProviderProps) {
  return (
    <ContextErrorBoundary
      onError={(error, errorInfo) => {
        console.error("Import context error:", error, errorInfo);
      }}
    >
      <ImportUploadProvider>
        <ContextErrorBoundary>
          <WebSocketIntegrationWrapper>{children}</WebSocketIntegrationWrapper>
        </ContextErrorBoundary>
      </ImportUploadProvider>
    </ContextErrorBoundary>
  );
}
