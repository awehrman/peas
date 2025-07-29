"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getWebSocketUrl } from "../../utils/websocket-config";

export interface UseStatusWebSocketOptions {
  wsUrl?: string;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

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
  indentLevel?: number; // Explicit indentation level (0 = main, 1+ = nested)
  metadata?: Record<string, unknown>; // Additional metadata like note title
}

interface WebSocketMessage {
  type: "status_update" | "connection_established" | "pong";
  data:
    | StatusEvent
    | { clientId: string; message: string }
    | { timestamp: number };
}

export function useStatusWebSocket(options: UseStatusWebSocketOptions = {}) {
  const {
    wsUrl = getWebSocketUrl(),
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
          console.log("🔌 WebSocket: Received message:", message);

          switch (message.type) {
            case "status_update": {
              const statusEvent = message.data as StatusEvent;
              console.log("📊 WebSocket: Status update received:", statusEvent);
              // Parse createdAt string back to Date object
              const parsedEvent = {
                ...statusEvent,
                createdAt: new Date(statusEvent.createdAt),
              };
              setEvents((prev) => [...prev, parsedEvent].slice(-50)); // Keep last 50 events
              break;
            }

            case "connection_established":
              console.log("🔌 WebSocket: Connection established");
              // Connection established - no action needed
              break;

            case "pong":
              console.log("🏓 WebSocket: Pong received");
              break;

            default:
              console.log("❓ WebSocket: Unknown message type:", message.type);
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
