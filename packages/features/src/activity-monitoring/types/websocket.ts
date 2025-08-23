export interface StatusEvent {
  importId: string;
  step: string;
  status: "pending" | "processing" | "completed" | "failed";
  message: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface WebSocketState {
  isConnected: boolean;
  connectionStatus: "connecting" | "connected" | "disconnected" | "error";
  error: string | null;
  reconnectAttempts: number;
  lastReconnectTime: number | null;
}

export interface UseStatusWebSocketOptions {
  url?: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  onMessage?: (event: StatusEvent) => void;
}
