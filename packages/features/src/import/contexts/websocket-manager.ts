import type { ConnectionState, ImportAction, StatusEvent } from "./types";
import {
  DEFAULT_WS_URL,
  WS_CONNECTION_TIMEOUT_MS,
  WS_HEARTBEAT_INTERVAL_MS,
  WS_INITIAL_CONNECTION_DELAY_MS,
  WS_INITIAL_RETRY_DELAY_MS,
  WS_MAX_RECONNECT_ATTEMPTS,
  WS_MAX_RETRY_DELAY_MS,
  WS_RATE_LIMIT_MS,
} from "./types";

import React, { useCallback, useEffect, useRef } from "react";

interface WebSocketManagerProps {
  dispatch: React.Dispatch<ImportAction>;
  state: { connection: ConnectionState; events: StatusEvent[] };
}

export function useWebSocketManager({
  dispatch,
  state,
}: WebSocketManagerProps) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  const isConnectingRef = useRef(false);
  const lastReconnectAttemptRef = useRef(0);
  const currentEventsRef = useRef<StatusEvent[]>([]);
  const reconnectAttemptsRef = useRef(0);
  const connectWebSocketRef = useRef<(() => void) | null>(null);

  // Update events ref when state changes
  useEffect(() => {
    currentEventsRef.current = state.events;
  }, [state.events]);

  const connectWebSocket = useCallback(() => {
    if (
      wsRef.current?.readyState === WebSocket.OPEN ||
      isConnectingRef.current
    ) {
      return;
    }

    // Rate limiting: Don't reconnect more than once every rate limit period
    const now = Date.now();
    if (now - lastReconnectAttemptRef.current < WS_RATE_LIMIT_MS) {
      console.log("🔌 WebSocket: Rate limiting reconnection attempts");
      return;
    }

    isConnectingRef.current = true;
    lastReconnectAttemptRef.current = now;

    // Clear any existing reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    dispatch({
      type: "CONNECTION_STATUS_CHANGED",
      payload: {
        status: "connecting",
        reconnectAttempts: reconnectAttemptsRef.current,
      },
    });

    try {
      console.log(`🔌 WebSocket: Attempting connection to ${DEFAULT_WS_URL}`);

      // Create WebSocket with a connection timeout
      wsRef.current = new WebSocket(DEFAULT_WS_URL);

      // Set a connection timeout
      const connectionTimeout = setTimeout(() => {
        if (wsRef.current?.readyState === WebSocket.CONNECTING) {
          console.log("🔌 WebSocket: Connection timeout, closing and retrying");
          wsRef.current.close();
        }
      }, WS_CONNECTION_TIMEOUT_MS);

      wsRef.current.onopen = () => {
        console.log("🔌 WebSocket connected");
        clearTimeout(connectionTimeout);
        isConnectingRef.current = false;
        reconnectAttemptsRef.current = 0;
        dispatch({
          type: "CONNECTION_STATUS_CHANGED",
          payload: { status: "connected", reconnectAttempts: 0 },
        });

        // Start heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
        heartbeatIntervalRef.current = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(
              JSON.stringify({ type: "ping", data: { timestamp: Date.now() } })
            );
          }
        }, WS_HEARTBEAT_INTERVAL_MS);
      };

      wsRef.current.onclose = (event) => {
        console.log(
          `🔌 WebSocket disconnected (code: ${event.code}, reason: ${event.reason})`
        );
        clearTimeout(connectionTimeout);
        isConnectingRef.current = false;
        dispatch({
          type: "CONNECTION_STATUS_CHANGED",
          payload: {
            status: "disconnected",
            reconnectAttempts: reconnectAttemptsRef.current,
          },
        });

        // Clear heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }

        // Auto-reconnect logic with exponential backoff
        if (reconnectAttemptsRef.current < WS_MAX_RECONNECT_ATTEMPTS) {
          const backoffDelay = Math.min(
            WS_INITIAL_RETRY_DELAY_MS *
              Math.pow(2, reconnectAttemptsRef.current),
            WS_MAX_RETRY_DELAY_MS
          );

          reconnectAttemptsRef.current += 1;
          dispatch({
            type: "CONNECTION_STATUS_CHANGED",
            payload: {
              status: "retrying",
              reconnectAttempts: reconnectAttemptsRef.current,
            },
          });

          console.log(
            `🔌 WebSocket: Retrying in ${backoffDelay}ms (attempt ${reconnectAttemptsRef.current}/5)`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            if (connectWebSocketRef.current) {
              connectWebSocketRef.current();
            }
          }, backoffDelay);
        } else {
          console.log(
            "🔌 WebSocket: Max reconnection attempts reached, giving up"
          );
        }
      };

      wsRef.current.onerror = (error) => {
        // Don't log the first connection error as it's expected when server isn't ready
        if (reconnectAttemptsRef.current > 0) {
          console.error("🔌 WebSocket error:", error);
        }
        clearTimeout(connectionTimeout);
        isConnectingRef.current = false;
        dispatch({
          type: "CONNECTION_STATUS_CHANGED",
          payload: {
            status: "error",
            error: "Connection error occurred",
            reconnectAttempts: reconnectAttemptsRef.current,
          },
        });
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          switch (message.type) {
            case "status_update": {
              // Handle status events
              const statusEvent = message.data as StatusEvent;

              if (
                statusEvent.status === "COMPLETED" ||
                statusEvent.status === "FAILED"
              ) {
                console.log(
                  `📥 [FRONTEND] Received ${statusEvent.status}: ${statusEvent.importId} - ${statusEvent.context || "no-context"}`
                );
              }
              // Check for duplicate completion events
              const isDuplicateCompletion = currentEventsRef.current.some(
                (existingEvent) =>
                  existingEvent.importId === statusEvent.importId &&
                  existingEvent.status === statusEvent.status &&
                  existingEvent.context === statusEvent.context
              );

              if (isDuplicateCompletion) {
                console.log(
                  `🔄 [FRONTEND] Skipping duplicate completion event: ${statusEvent.importId} - ${statusEvent.context}`
                );
                return;
              }

              // Optimize event processing by avoiding unnecessary array operations
              const currentEvents = currentEventsRef.current;
              const newEventCount = currentEvents.length + 1;

              // If we're under the limit, just add the event
              if (newEventCount <= 1000) {
                const updatedEvents = [statusEvent, ...currentEvents];
                currentEventsRef.current = updatedEvents;
                dispatch({
                  type: "EVENTS_UPDATED",
                  payload: updatedEvents,
                });
                return;
              }

              // If we're over the limit, preserve completion events and trim
              const completionEvents = currentEvents.filter(
                (event) =>
                  event.status === "COMPLETED" || event.status === "FAILED"
              );

              // Add the new event and trim to 1000
              const updatedEvents = [statusEvent, ...currentEvents].slice(
                0,
                1000
              );

              // Ensure completion events are preserved
              const preservedCompletionEvents = completionEvents.filter(
                (event) =>
                  !updatedEvents.some(
                    (updatedEvent) =>
                      updatedEvent.importId === event.importId &&
                      updatedEvent.status === event.status &&
                      updatedEvent.context === event.context
                  )
              );

              const finalEvents = [
                ...preservedCompletionEvents,
                ...updatedEvents,
              ].slice(0, 1000);

              currentEventsRef.current = finalEvents;
              dispatch({
                type: "EVENTS_UPDATED",
                payload: finalEvents,
              });
              break;
            }
            case "status_update_batch": {
              const batchData = message.data as {
                events: StatusEvent[];
                batchId: string;
                timestamp: Date;
              };

              // Convert batch events to StatusEvent format
              const convertedEvents: StatusEvent[] = batchData.events.map(
                (event) => event as StatusEvent
              );

              // Log completion events from batch
              convertedEvents.forEach((event) => {
                if (event.status === "COMPLETED" || event.status === "FAILED") {
                  console.log(
                    `📥 [FRONTEND] Received ${event.status} from batch: ${event.importId} - ${event.context || "no-context"}`
                  );
                }
              });
              // Process batched events in chronological order (oldest first)
              const batchedEvents = [...convertedEvents];

              // Log batch processing for debugging
              if (
                batchData.events.some(
                  (e) => e.status === "COMPLETED" || e.status === "FAILED"
                )
              ) {
                console.log(
                  `📦 [FRONTEND] Processing batch ${batchData.batchId} with ${batchData.events.length} events`
                );
              }
              const updatedEventsFromBatch = [
                ...currentEventsRef.current,
                ...batchedEvents,
              ];

              // Warn if we're approaching the limit
              if (updatedEventsFromBatch.length > 950) {
                console.warn(
                  `⚠️ [FRONTEND] Event buffer approaching limit: ${updatedEventsFromBatch.length}/1000 events`
                );
              }

              const trimmedEventsFromBatch = updatedEventsFromBatch.slice(
                0,
                1000
              );
              currentEventsRef.current = trimmedEventsFromBatch;
              dispatch({
                type: "EVENTS_UPDATED",
                payload: trimmedEventsFromBatch,
              });
              break;
            }
            case "connection_established":
              console.log("🔌 WebSocket connection confirmed");
              break;
            case "pong":
              // Heartbeat response - connection is alive
              break;
            case "error": {
              const errorData = message.data as { error: string };
              dispatch({
                type: "CONNECTION_STATUS_CHANGED",
                payload: {
                  status: "error",
                  error: errorData.error,
                  reconnectAttempts: state.connection.reconnectAttempts,
                },
              });
              break;
            }
            default:
              console.warn("🔌 Unknown message type:", message.type);
          }
        } catch (error) {
          console.error("🔌 Failed to parse WebSocket message:", error);
        }
      };
    } catch (error) {
      console.error("🔌 Failed to create WebSocket connection:", error);
      isConnectingRef.current = false;
      dispatch({
        type: "CONNECTION_STATUS_CHANGED",
        payload: {
          status: "error",
          error: "Failed to create connection",
          reconnectAttempts: reconnectAttemptsRef.current,
        },
      });
    }
  }, [dispatch, state.connection.reconnectAttempts]);

  // Update the ref whenever the function is created
  useEffect(() => {
    connectWebSocketRef.current = connectWebSocket;
  }, [connectWebSocket]);

  const disconnectWebSocket = useCallback(() => {
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

    isConnectingRef.current = false;
    lastReconnectAttemptRef.current = 0;
    reconnectAttemptsRef.current = 0;

    dispatch({
      type: "CONNECTION_STATUS_CHANGED",
      payload: { status: "disconnected", reconnectAttempts: 0 },
    });
  }, [dispatch]);

  // Auto-connect WebSocket on mount with initial delay
  useEffect(() => {
    // Set initial status to indicate we're waiting for server
    dispatch({
      type: "CONNECTION_STATUS_CHANGED",
      payload: { status: "connecting", reconnectAttempts: 0 },
    });

    // Add initial delay to allow the backend server to start up
    const initialDelay = setTimeout(() => {
      connectWebSocket();
    }, WS_INITIAL_CONNECTION_DELAY_MS);

    return () => {
      clearTimeout(initialDelay);
      disconnectWebSocket();
    };
  }, []); // Empty dependency array to run only once on mount

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

  return {
    connectWebSocket,
    disconnectWebSocket,
  };
}
