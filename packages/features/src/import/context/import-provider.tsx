"use client";

import { ActivityProvider } from "./activity";
import { ContextErrorBoundary } from "./error-boundary";
import { StatsProvider } from "./stats";
import { ImportUploadProvider } from "./upload";
import { WsProvider } from "./ws";

import { type ReactNode } from "react";

interface ImportProviderProps {
  children: ReactNode;
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
          <WsProvider>
            <ContextErrorBoundary>
              <StatsProvider>
                <ContextErrorBoundary>
                  <ActivityProvider>{children}</ActivityProvider>
                </ContextErrorBoundary>
              </StatsProvider>
            </ContextErrorBoundary>
          </WsProvider>
        </ContextErrorBoundary>
      </ImportUploadProvider>
    </ContextErrorBoundary>
  );
}
