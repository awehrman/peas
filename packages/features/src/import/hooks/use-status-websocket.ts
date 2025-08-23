"use client";

// StatusEvent interface for backward compatibility
export interface StatusEvent {
  importId: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  context?: string;
  message?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  currentCount?: number;
  totalCount?: number;
}

export interface UseStatusWebSocketOptions {
  wsUrl?: string;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  initialRetryDelay?: number;
  showErrorAfterAttempts?: number;
}

// This hook now uses the unified import state context
export function useStatusWebSocket(
  _options: UseStatusWebSocketOptions = {}
) {
  // This hook is now deprecated in favor of useImportState
  // It returns a mock implementation for backward compatibility
  console.warn(
    "useStatusWebSocket is deprecated. Use useImportState instead for unified state management."
  );
  
  return {
    events: [],
    connectionStatus: "disconnected" as const,
    error: null,
  };
}
