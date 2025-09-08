"use client";

import { ImportProvider } from "@peas/features";

import { refetchImportStats } from "../actions/get-import-stats";

interface ImportProviderWithWebSocketProps {
  children: React.ReactNode;
}

/**
 * Client component that wraps ImportProvider with WebSocket integration
 * This ensures the WebSocket status updates are connected to stats refresh
 */
export function ImportProviderWithWebSocket({
  children,
}: ImportProviderWithWebSocketProps) {
  return (
    <ImportProvider onStatsRefresh={refetchImportStats}>
      {children}
    </ImportProvider>
  );
}
