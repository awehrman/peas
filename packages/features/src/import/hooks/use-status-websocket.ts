"use client";

import { useStatusWebSocketContext } from "../contexts/websocket-context";

// Re-export the StatusEvent interface for backward compatibility
export type { StatusEvent } from "../contexts/websocket-context";

export interface UseStatusWebSocketOptions {
  wsUrl?: string;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  initialRetryDelay?: number;
  showErrorAfterAttempts?: number;
}

// This hook now uses the shared context instead of creating its own WebSocket connection
export function useStatusWebSocket(
  _options: UseStatusWebSocketOptions = {}
): ReturnType<typeof useStatusWebSocketContext> {
  // Options are ignored since the context handles the WebSocket connection
  // This maintains backward compatibility with existing code
  return useStatusWebSocketContext();
}
