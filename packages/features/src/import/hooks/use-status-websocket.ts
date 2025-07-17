import { useEffect, useState, useCallback, useRef } from "react";

interface StatusEvent {
  importId: string; // Temporary ID for frontend grouping
  noteId?: string; // Actual note ID once saved
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  message?: string;
  context?: string;
  errorMessage?: string;
  currentCount?: number;
  totalCount?: number;
  createdAt: string | Date;
}

interface WebSocketMessage {
  type: "status_update" | "connection_established" | "pong";
  data:
    | StatusEvent
    | { clientId: string; message: string }
    | { timestamp: number };
}

interface UseStatusWebSocketOptions {
  wsUrl?: string;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export function useStatusWebSocket(options: UseStatusWebSocketOptions = {}) {
  const {
    wsUrl = "ws://localhost:8080",
    autoReconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
  } = options;

  const [events, setEvents] = useState<StatusEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected" | "error"
  >("disconnected");
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionStatus("connecting");
    setError(null);

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setConnectionStatus("connected");
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          switch (message.type) {
            case "status_update": {
              const statusEvent = message.data as StatusEvent;
              // Parse createdAt string back to Date object
              const parsedEvent = {
                ...statusEvent,
                createdAt: new Date(statusEvent.createdAt),
              };
              setEvents((prev) => [...prev, parsedEvent].slice(-50)); // Keep last 50 events
              break;
            }

            case "connection_established":
              // Connection established - no action needed
              break;

            case "pong":
              break;

            default:
              // Unknown message type - ignore
              break;
          }
        } catch (err) {
          console.error("❌ WebSocket: Failed to parse message:", err);
        }
      };

      ws.onclose = (_event) => {
        setIsConnected(false);
        setConnectionStatus("disconnected");

        if (
          autoReconnect &&
          reconnectAttemptsRef.current < maxReconnectAttempts
        ) {
          reconnectAttemptsRef.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setConnectionStatus("error");
          setError("Failed to reconnect after maximum attempts");
        }
      };

      ws.onerror = () => {
        setConnectionStatus("error");
        setError("WebSocket connection error");
      };
    } catch (err) {
      console.error("❌ WebSocket: Failed to create connection:", err);
      setConnectionStatus("error");
      setError("Failed to create WebSocket connection");
    }
  }, [wsUrl, autoReconnect, reconnectInterval, maxReconnectAttempts]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
    setConnectionStatus("disconnected");
  }, []);

  const sendPing = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "ping" }));
    }
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  // Connect on mount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    events,
    isConnected,
    connectionStatus,
    error,
    connect,
    disconnect,
    sendPing,
    clearEvents,
  };
}
