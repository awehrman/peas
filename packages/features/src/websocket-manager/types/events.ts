// Event-related type definitions

export interface StatusEvent {
  importId: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  context?: string;
  message?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface WebSocketMessage {
  type: "status_update" | "connection_established" | "ping" | "pong";
  data?: StatusEvent;
}

export interface WebSocketConfig {
  wsUrl?: string;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  initialRetryDelay?: number;
  showErrorAfterAttempts?: number;
}

export interface WebSocketState {
  isConnected: boolean;
  connectionStatus:
    | "connecting"
    | "connected"
    | "disconnected"
    | "error"
    | "retrying";
  error: string | null;
  events: StatusEvent[];
  reconnectAttempts: number;
}

export type WebSocketEventHandler = (event: StatusEvent) => void;
export type ConnectionStatusHandler = (
  status: WebSocketState["connectionStatus"]
) => void;
export type ErrorHandler = (error: string) => void;
