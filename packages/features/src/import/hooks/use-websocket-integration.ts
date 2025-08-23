"use client";

import { useImportState } from "../contexts/import-state-context";

interface WebSocketIntegrationConfig {
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  autoConnect?: boolean;
}

export function useWebSocketIntegration(
  _config: WebSocketIntegrationConfig = {}
) {
  const { state } = useImportState();
  const { events, connection } = state;

  // This hook is now simplified since WebSocket integration is handled
  // directly by the unified ImportStateContext. The WebSocket connection
  // and event processing are managed internally by the context.

  return {
    connectionStatus: connection.status,
    error: connection.error,
    events,
  };
}
