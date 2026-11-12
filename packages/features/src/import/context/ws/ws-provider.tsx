"use client";

import { defaultWsState, wsReducer } from "./ws-reducer";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";

import {
  createContext as createSelectorContext,
  useContextSelector,
} from "use-context-selector";

import { getAuthenticatedWebSocketUrl } from "../../../utils/websocket-config";
import type {
  StatusEvent,
  WebSocketMessage,
  WsConnectionState,
  WsContextValue,
} from "../../types/import-types";
import { useQueueTokenProvider } from "../queue-auth";

const WsContext = createSelectorContext<WsContextValue | null>(null);

interface WsProviderProps {
  children: ReactNode;
  initialState?: WsConnectionState;
  autoConnect?: boolean;
  onStatusUpdate?: (statusEvent: StatusEvent) => void;
}

/**
 * WebSocket context provider for managing connection state and lifecycle
 */
export function WsProvider({
  children,
  initialState = defaultWsState,
  autoConnect = true,
  onStatusUpdate,
}: WsProviderProps) {
  const [state, dispatch] = useReducer(wsReducer, initialState);
  const getQueueToken = useQueueTokenProvider();

  const wsRef = useRef<WebSocket | null>(null);
  const connectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const connectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const reconnectAttemptsRef = useRef(0);
  const isManualDisconnectRef = useRef(false);
  const onStatusUpdateRef = useRef(onStatusUpdate);

  useEffect(() => {
    onStatusUpdateRef.current = onStatusUpdate;
  }, [onStatusUpdate]);

  const clearTimers = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
  }, []);

  const scheduleReconnect = useCallback(() => {
    // Avoid duplicate schedules
    if (reconnectTimeoutRef.current) return;
    if (isManualDisconnectRef.current) return;

    dispatch({ type: "WS_RETRY" });
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectTimeoutRef.current = null;
      connect();
    }, 3000);
  }, []);

  const connect = useCallback(async () => {
    if (
      wsRef.current?.readyState === WebSocket.OPEN ||
      wsRef.current?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }

    // Clean up any existing connection before creating a new one
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // ignore cleanup errors
      }
      wsRef.current = null;
    }

    const attempt = ++connectAttemptRef.current;

    try {
      dispatch({ type: "WS_CONNECTING" });

      const url = await getAuthenticatedWebSocketUrl(getQueueToken);

      // A newer connect() or a disconnect() happened while fetching the token
      if (attempt !== connectAttemptRef.current) return;

      wsRef.current = new WebSocket(url);

      connectionTimeoutRef.current = setTimeout(() => {
        dispatch({ type: "WS_ERROR" });
        try {
          wsRef.current?.close();
        } catch {
          // ignore
        }
      }, 5000);

      wsRef.current.onopen = () => {
        clearTimers();
        reconnectAttemptsRef.current = 0;
        isManualDisconnectRef.current = false;
        dispatch({ type: "WS_CONNECTED", timestamp: new Date().toISOString() });
      };

      wsRef.current.onclose = () => {
        clearTimers();
        dispatch({ type: "WS_DISCONNECTED" });
        scheduleReconnect();
      };

      wsRef.current.onerror = () => {
        clearTimers();
        dispatch({ type: "WS_ERROR" });
      };

      wsRef.current.onmessage = (event: MessageEvent) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data as string);

          // Handle different message types with proper typing
          switch (message.type) {
            case "status_update":
              onStatusUpdateRef.current?.(message.data as StatusEvent);
              break;
            case "connection_established":
            case "pong":
              break;
            case "error":
              console.error("WebSocket error:", message.data);
              break;
            default:
              console.warn("Unknown message type:", message.type);
          }
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
          console.warn("Raw message data:", event.data);
        }
      };
    } catch {
      clearTimers();
      dispatch({ type: "WS_ERROR" });
    }
  }, [clearTimers, scheduleReconnect, getQueueToken]);

  const disconnect = useCallback(() => {
    isManualDisconnectRef.current = true;
    connectAttemptRef.current++;
    clearTimers();

    if (wsRef.current) {
      try {
        // Only close if not already closed
        if (
          wsRef.current.readyState === WebSocket.OPEN ||
          wsRef.current.readyState === WebSocket.CONNECTING
        ) {
          wsRef.current.close();
        }
      } catch {
        // ignore cleanup errors
      } finally {
        wsRef.current = null;
      }
    }

    dispatch({ type: "WS_DISCONNECTED" });
  }, [clearTimers]);

  const sendMessage = useCallback(<T extends WebSocketMessage>(message: T) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket is not connected. Cannot send message:", message);
    }
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect]); // Remove connect/disconnect from deps to prevent infinite loops

  const contextValue = useMemo<WsContextValue>(
    () => ({
      state,
      dispatch,
      connect,
      disconnect,
      sendMessage,
    }),
    [state, connect, disconnect, sendMessage]
  );

  return (
    <WsContext.Provider value={contextValue}>{children}</WsContext.Provider>
  );
}

export function useWs(): WsContextValue {
  const context = useContextSelector(WsContext, (v) => v);
  if (!context) throw new Error("useWs must be used within a WsProvider");
  return context;
}
