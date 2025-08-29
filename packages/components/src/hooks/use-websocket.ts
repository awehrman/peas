"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface WebSocketConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  autoConnect?: boolean;
  onMessage?: (data: unknown) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
}

interface WebSocketState {
  status: "connecting" | "connected" | "disconnected" | "reconnecting";
  error: string | null;
  reconnectAttempts: number;
}

export function useWebSocket(config: WebSocketConfig) {
  const {
    url,
    reconnectInterval = 5000,
    maxReconnectAttempts = 5,
    autoConnect = true,
    onMessage,
    onOpen,
    onClose,
    onError,
  } = config;

  const [state, setState] = useState<WebSocketState>({
    status: "disconnected",
    error: null,
    reconnectAttempts: 0,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      setState(prev => ({ ...prev, status: "connecting", error: null }));
      
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setState(prev => ({ 
          ...prev, 
          status: "connected", 
          error: null,
          reconnectAttempts: 0 
        }));
        onOpen?.();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage?.(data);
        } catch {
          onMessage?.(event.data);
        }
      };

      ws.onclose = () => {
        setState(prev => ({ ...prev, status: "disconnected" }));
        onClose?.();
        
        // Attempt to reconnect if not manually closed
        if (state.reconnectAttempts < maxReconnectAttempts) {
          setState(prev => ({ 
            ...prev, 
            status: "reconnecting",
            reconnectAttempts: prev.reconnectAttempts + 1 
          }));
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      ws.onerror = (error) => {
        setState(prev => ({ 
          ...prev, 
          error: "WebSocket connection error",
          status: "disconnected" 
        }));
        onError?.(error);
      };
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : "Failed to connect",
        status: "disconnected" 
      }));
    }
  }, [url, reconnectInterval, maxReconnectAttempts, onMessage, onOpen, onClose, onError, state.reconnectAttempts]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setState(prev => ({ 
      ...prev, 
      status: "disconnected",
      reconnectAttempts: 0 
    }));
  }, []);

  const send = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message = typeof data === "string" ? data : JSON.stringify(data);
      wsRef.current.send(message);
      return true;
    }
    return false;
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    status: state.status,
    error: state.error,
    reconnectAttempts: state.reconnectAttempts,
    connect,
    disconnect,
    send,
    isConnected: state.status === "connected",
  };
}
