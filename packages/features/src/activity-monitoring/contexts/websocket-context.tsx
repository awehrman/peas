"use client";

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  StatusEvent,
  UseStatusWebSocketOptions,
  WebSocketState,
} from "../types";

interface WebSocketMessage {
  type: "status_update" | "connection_established" | "pong" | "error";
  data:
    | StatusEvent
    | { clientId: string; message: string }
    | { timestamp: number }
    | { error: string };
}

interface WebSocketContextValue extends WebSocketState {
  events: StatusEvent[];
  connect: () => void;
  disconnect: () => void;
  sendPing: () => void;
  clearEvents: () => void;
  addEvent: (event: StatusEvent) => void;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

interface WebSocketProviderProps extends UseStatusWebSocketOptions {
  children: ReactNode;
  maxEvents?: number;
}

const DEFAULT_WS_URL =
  process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:4200/ws";
const DEFAULT_OPTIONS: Required<UseStatusWebSocketOptions> = {
  url: DEFAULT_WS_URL,
  reconnectInterval: 3000,
  maxReconnectAttempts: 5,
  onConnect: () => {},
  onDisconnect: () => {},
  onError: () => {},
  onMessage: () => {},
};

export function WebSocketProvider({
  children,
  maxEvents = 1000,
  ...options
}: WebSocketProviderProps) {
  const config = useMemo(() => ({ ...DEFAULT_OPTIONS, ...options }), [options]);

  const [events, setEvents] = useState<StatusEvent[]>([]);
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    connectionStatus: "disconnected",
    error: null,
    reconnectAttempts: 0,
    lastReconnectTime: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Memoized event handlers for better performance
  const handleConnect = useCallback(() => {
    console.log("🔌 WebSocket connected");
    setState((prev) => ({
      ...prev,
      isConnected: true,
      connectionStatus: "connected",
      error: null,
      reconnectAttempts: 0,
    }));
    config.onConnect();

    // Start heartbeat
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    heartbeatIntervalRef.current = setInterval(() => {
      sendPing();
    }, 30000); // Ping every 30 seconds
  }, [config]);

  const handleDisconnect = useCallback(() => {
    console.log("🔌 WebSocket disconnected");
    setState((prev) => ({
      ...prev,
      isConnected: false,
      connectionStatus: "disconnected",
    }));
    config.onDisconnect();

    // Clear heartbeat
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, [config]);

  const handleError = useCallback(
    (error: Event) => {
      console.error("🔌 WebSocket error:", error);
      setState((prev) => ({
        ...prev,
        isConnected: false,
        connectionStatus: "error",
        error: "Connection error occurred",
      }));
      config.onError(error);
    },
    [config]
  );

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);

        switch (message.type) {
          case "status_update":
            const statusEvent = message.data as StatusEvent;
            addEvent(statusEvent);
            config.onMessage(statusEvent);
            break;
          case "connection_established":
            console.log("🔌 WebSocket connection confirmed");
            break;
          case "pong":
            // Heartbeat response - connection is alive
            break;
          case "error":
            const errorData = message.data as { error: string };
            setState((prev) => ({ ...prev, error: errorData.error }));
            break;
          default:
            console.warn("🔌 Unknown message type:", message.type);
        }
      } catch (error) {
        console.error("🔌 Failed to parse WebSocket message:", error);
      }
    },
    [config]
  );

  const addEvent = useCallback(
    (event: StatusEvent) => {
      setEvents((prev) => {
        const newEvents = [event, ...prev];
        // Limit events array size for memory management
        return newEvents.slice(0, maxEvents);
      });
    },
    [maxEvents]
  );

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    // Clear any existing reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setState((prev) => ({ ...prev, connectionStatus: "connecting" }));

    try {
      wsRef.current = new WebSocket(config.url);

      wsRef.current.onopen = handleConnect;
      wsRef.current.onclose = () => {
        handleDisconnect();

        // Auto-reconnect logic
        if (state.reconnectAttempts < config.maxReconnectAttempts) {
          setState((prev) => ({
            ...prev,
            connectionStatus: "disconnected",
            reconnectAttempts: prev.reconnectAttempts + 1,
            lastReconnectTime: Date.now(),
          }));

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, config.reconnectInterval);
        }
      };
      wsRef.current.onerror = handleError;
      wsRef.current.onmessage = handleMessage;
    } catch (error) {
      console.error("🔌 Failed to create WebSocket connection:", error);
      setState((prev) => ({
        ...prev,
        connectionStatus: "error",
        error: "Failed to create connection",
      }));
    }
  }, [
    config,
    state.reconnectAttempts,
    handleConnect,
    handleDisconnect,
    handleError,
    handleMessage,
  ]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setState((prev) => ({
      ...prev,
      isConnected: false,
      connectionStatus: "disconnected",
      reconnectAttempts: 0,
    }));
  }, []);

  const sendPing = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({ type: "ping", data: { timestamp: Date.now() } })
      );
    }
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, []);

  const contextValue = useMemo<WebSocketContextValue>(
    () => ({
      ...state,
      events,
      connect,
      disconnect,
      sendPing,
      clearEvents,
      addEvent,
    }),
    [state, events, connect, disconnect, sendPing, clearEvents, addEvent]
  );

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket(): WebSocketContextValue {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  }
  return context;
}

// Backward compatibility hook
export function useStatusWebSocket() {
  return useWebSocket();
}
