"use client";

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { getWebSocketUrl } from "../../utils/websocket-config";

export interface StatusEvent {
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

interface StatusWebSocketContextValue {
  events: StatusEvent[];
  isConnected: boolean;
  connectionStatus:
    | "connecting"
    | "connected"
    | "disconnected"
    | "error"
    | "retrying";
  error: string | null;
  connect: () => void;
  disconnect: () => void;
  sendPing: () => void;
  clearEvents: () => void;
}

const StatusWebSocketContext =
  createContext<StatusWebSocketContextValue | null>(null);

interface StatusWebSocketProviderProps {
  children: ReactNode;
  wsUrl?: string;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  initialRetryDelay?: number;
  showErrorAfterAttempts?: number;
}

export function StatusWebSocketProvider({
  children,
  wsUrl = getWebSocketUrl(),
  autoReconnect = true,
  reconnectInterval = 3000,
  maxReconnectAttempts = 5,
  initialRetryDelay = 1000,
  showErrorAfterAttempts = 3,
}: StatusWebSocketProviderProps) {
  const [events, setEvents] = useState<StatusEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected" | "error" | "retrying"
  >("disconnected");
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const initialRetryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    console.log("🔌 WebSocket: Attempting to connect to:", wsUrl);
    setConnectionStatus("connecting");
    setError(null);

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("🔌 WebSocket: Connection opened successfully");
        setIsConnected(true);
        setConnectionStatus("connected");
        setError(null); // Clear any previous errors
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          // Filter out development server messages (like Vite HMR)
          const data = event.data.toString();
          if (
            data.startsWith("0:") ||
            data.startsWith("1:") ||
            data.includes("$@")
          ) {
            console.log(
              "🔌 WebSocket: Ignoring development server message:",
              data
            );
            return;
          }

          const message: WebSocketMessage = JSON.parse(data);
          console.log("🔌 WebSocket: Received message:", message?.data ?? {});

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
              console.log("🔌 WebSocket: Connection established");
              setError(null); // Clear any previous errors
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

      ws.onclose = (event) => {
        console.log(
          "🔌 WebSocket: Connection closed:",
          event.code,
          event.reason
        );
        setIsConnected(false);
        setConnectionStatus("disconnected");

        if (
          autoReconnect &&
          reconnectAttemptsRef.current < maxReconnectAttempts
        ) {
          reconnectAttemptsRef.current++;

          // Use shorter delay for initial retries, longer for later ones
          const delay =
            reconnectAttemptsRef.current <= showErrorAfterAttempts
              ? initialRetryDelay
              : reconnectInterval;

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setConnectionStatus("error");
          setError("Failed to reconnect after maximum attempts");
        }
      };

      ws.onerror = (error) => {
        console.error("❌ WebSocket: Connection error:", error);

        // Only show error after multiple failed attempts
        if (reconnectAttemptsRef.current >= showErrorAfterAttempts) {
          setConnectionStatus("error");
          setError("WebSocket connection error");
        } else {
          // Set to retrying state for initial attempts
          setConnectionStatus("retrying");
          setError(null);
        }
      };
    } catch (err) {
      console.error("❌ WebSocket: Failed to create connection:", err);
      setConnectionStatus("error");
      setError("Failed to create WebSocket connection");
    }
  }, [
    wsUrl,
    autoReconnect,
    reconnectInterval,
    maxReconnectAttempts,
    initialRetryDelay,
    showErrorAfterAttempts,
  ]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (initialRetryTimeoutRef.current) {
      clearTimeout(initialRetryTimeoutRef.current);
      initialRetryTimeoutRef.current = null;
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

  // Connect on mount with initial delay to avoid immediate errors
  useEffect(() => {
    // Add a small delay before first connection attempt to avoid React dev mode issues
    initialRetryTimeoutRef.current = setTimeout(() => {
      connect();
    }, 500);

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  const contextValue: StatusWebSocketContextValue = {
    events,
    isConnected,
    connectionStatus,
    error,
    connect,
    disconnect,
    sendPing,
    clearEvents,
  };

  return (
    <StatusWebSocketContext.Provider value={contextValue}>
      {children}
    </StatusWebSocketContext.Provider>
  );
}

export function useStatusWebSocketContext(): StatusWebSocketContextValue {
  const context = useContext(StatusWebSocketContext);
  if (!context) {
    throw new Error(
      "useStatusWebSocketContext must be used within a StatusWebSocketProvider"
    );
  }
  return context;
}
