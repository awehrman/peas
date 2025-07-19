/**
 * WebSocket URL configuration utility
 * Provides a centralized way to configure WebSocket URLs across the frontend
 */

export function getWebSocketUrl(): string {
  // Check for environment variable in Next.js
  if (process.env.NEXT_PUBLIC_WEBSOCKET_URL) {
    return process.env.NEXT_PUBLIC_WEBSOCKET_URL;
  }

  // Construct from host and port if available
  const host = process.env.NEXT_PUBLIC_WEBSOCKET_HOST || "localhost";
  const port = process.env.NEXT_PUBLIC_WEBSOCKET_PORT || "8080";
  const protocol = process.env.NODE_ENV === "production" ? "wss" : "ws";

  return `${protocol}://${host}:${port}`;
}

/**
 * WebSocket configuration options
 */
export interface WebSocketConfig {
  /** WebSocket URL */
  wsUrl: string;
  /** Whether to auto-reconnect */
  autoReconnect?: boolean;
  /** Reconnection interval in milliseconds */
  reconnectInterval?: number;
  /** Maximum number of reconnection attempts */
  maxReconnectAttempts?: number;
}

/**
 * Get default WebSocket configuration
 */
export function getDefaultWebSocketConfig(): WebSocketConfig {
  return {
    wsUrl: getWebSocketUrl(),
    autoReconnect: true,
    reconnectInterval: 3000,
    maxReconnectAttempts: 5,
  };
}
