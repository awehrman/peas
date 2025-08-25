"use client";

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from "react";

import { StatusEvent } from "../hooks/use-status-websocket";

// WebSocket configuration
const DEFAULT_WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080";

// Consolidated state interfaces
export interface UploadItem {
  importId: string;
  htmlFileName: string;
  imageCount: number;
  status: "uploading" | "uploaded" | "failed" | "cancelled";
  createdAt: Date;
  batchProgress?: {
    currentBatch: number;
    totalBatches: number;
    currentFile: number;
    totalFiles: number;
  };
  abortController?: AbortController;
}

export interface ImportItem {
  importId: string;
  htmlFileName: string;
  noteTitle?: string;
  status: "importing" | "completed" | "failed";
  createdAt: Date;
  completedAt?: Date;
  type?: "import";
}

export interface ConnectionState {
  status: "connecting" | "connected" | "disconnected" | "error" | "retrying";
  error?: string;
  reconnectAttempts: number;
}

export interface ImportStatusTracker {
  importId: string;
  status: "importing" | "completed" | "failed";
  createdAt: Date;
  completedAt?: Date;
  lastEventAt: Date;
  eventCount: number;
  completionPercentage: number;
  metadata: {
    noteTitle?: string;
    htmlFileName?: string;
    noteId?: string;
  };
  // Track completion of different processing stages
  stages: {
    noteCreated: boolean;
    ingredientsProcessed: boolean;
    instructionsProcessed: boolean;
    imagesAdded: boolean;
    categoriesAdded: boolean;
    tagsAdded: boolean;
  };
}

export interface ImportState {
  // Upload state
  uploadingHtmlFiles: string[];
  fileTitles: Map<string, string>;
  uploadItems: Map<string, UploadItem>;

  // WebSocket state
  connection: ConnectionState;
  events: StatusEvent[];

  // Import items state
  importItems: Map<string, ImportItem>;

  // NEW: Persistent import status tracking
  importStatusTracker: Map<string, ImportStatusTracker>;

  // UI state
  expandedItems: Set<string>;

  // Pagination state
  currentPage: number;
  itemsPerPage: number;
}

// Action types for state management
export type ImportAction =
  | { type: "UPLOAD_FILES_ADDED"; payload: string[] }
  | { type: "UPLOAD_FILES_REMOVED"; payload: string[] }
  | { type: "UPLOAD_FILES_CLEARED" }
  | { type: "FILE_TITLES_SET"; payload: Map<string, string> }
  | { type: "FILE_TITLES_CLEARED" }
  | { type: "UPLOAD_ITEM_ADDED"; payload: UploadItem }
  | {
      type: "UPLOAD_ITEM_UPDATED";
      payload: { importId: string; updates: Partial<UploadItem> };
    }
  | { type: "UPLOAD_ITEM_REMOVED"; payload: string }
  | { type: "UPLOAD_ITEMS_CLEARED" }
  | { type: "CONNECTION_STATUS_CHANGED"; payload: ConnectionState }
  | { type: "EVENTS_UPDATED"; payload: StatusEvent[] }
  | { type: "IMPORT_ITEMS_UPDATED"; payload: Map<string, ImportItem> }
  | {
      type: "IMPORT_STATUS_UPDATED";
      payload: { importId: string; tracker: ImportStatusTracker };
    }
  | { type: "ITEM_EXPANDED"; payload: string }
  | { type: "ITEM_COLLAPSED"; payload: string }
  | { type: "ITEM_TOGGLED"; payload: string }
  | { type: "ALL_ITEMS_EXPANDED"; payload: string[] }
  | { type: "ALL_ITEMS_COLLAPSED" }
  | { type: "EXPANDED_ITEMS_SET"; payload: string[] }
  | { type: "PAGE_CHANGED"; payload: number }
  | { type: "ITEMS_PER_PAGE_CHANGED"; payload: number };

// Initial state
const initialState: ImportState = {
  uploadingHtmlFiles: [],
  fileTitles: new Map(),
  uploadItems: new Map(),
  connection: {
    status: "disconnected",
    reconnectAttempts: 0,
  },
  events: [],
  importItems: new Map(),
  expandedItems: new Set(),
  currentPage: 1,
  itemsPerPage: 10,
  importStatusTracker: new Map(),
};

// State reducer with optimized updates
function importStateReducer(
  state: ImportState,
  action: ImportAction
): ImportState {
  switch (action.type) {
    // Upload file management
    case "UPLOAD_FILES_ADDED":
      return {
        ...state,
        uploadingHtmlFiles: [...state.uploadingHtmlFiles, ...action.payload],
      };

    case "UPLOAD_FILES_REMOVED":
      return {
        ...state,
        uploadingHtmlFiles: state.uploadingHtmlFiles.filter(
          (file) => !action.payload.includes(file)
        ),
      };

    case "UPLOAD_FILES_CLEARED":
      return {
        ...state,
        uploadingHtmlFiles: [],
      };

    // File titles management
    case "FILE_TITLES_SET":
      return {
        ...state,
        fileTitles: new Map(action.payload),
      };

    case "FILE_TITLES_CLEARED":
      return {
        ...state,
        fileTitles: new Map(),
      };

    // Upload items management
    case "UPLOAD_ITEM_ADDED": {
      const { payload: item } = action;
      // Avoid unnecessary updates if item already exists
      if (state.uploadItems.has(item.importId)) {
        return state;
      }
      const newUploadItems = new Map(state.uploadItems);
      newUploadItems.set(item.importId, item);
      return {
        ...state,
        uploadItems: newUploadItems,
      };
    }

    case "UPLOAD_ITEM_UPDATED": {
      const { importId, updates } = action.payload;
      const existing = state.uploadItems.get(importId);
      if (!existing) return state;

      // Check if updates would actually change the item
      const hasChanges = Object.keys(updates).some(
        (key) =>
          existing[key as keyof UploadItem] !== updates[key as keyof UploadItem]
      );

      if (!hasChanges) return state;

      const newUploadItems = new Map(state.uploadItems);
      newUploadItems.set(importId, { ...existing, ...updates });
      return {
        ...state,
        uploadItems: newUploadItems,
      };
    }

    case "UPLOAD_ITEM_REMOVED": {
      const newUploadItems = new Map(state.uploadItems);
      newUploadItems.delete(action.payload);
      return {
        ...state,
        uploadItems: newUploadItems,
      };
    }

    case "UPLOAD_ITEMS_CLEARED":
      return {
        ...state,
        uploadItems: new Map(),
      };

    // Connection management
    case "CONNECTION_STATUS_CHANGED":
      return {
        ...state,
        connection: action.payload,
      };

    // Events management with deduplication
    case "EVENTS_UPDATED": {
      const newEvents = action.payload;

      // Deduplicate events based on importId, status, and timestamp
      const seenEvents = new Set<string>();
      const deduplicatedEvents = newEvents.filter((event) => {
        const eventKey = `${event.importId}_${event.status}_${event.createdAt}`;
        if (seenEvents.has(eventKey)) {
          return false;
        }
        seenEvents.add(eventKey);
        return true;
      });

      return {
        ...state,
        events: deduplicatedEvents,
      };
    }

    // Import items management
    case "IMPORT_ITEMS_UPDATED":
      return {
        ...state,
        importItems: action.payload,
      };

    // Import status tracking management
    case "IMPORT_STATUS_UPDATED": {
      const { importId, tracker } = action.payload;
      const newTracker = new Map(state.importStatusTracker);
      newTracker.set(importId, tracker);
      return {
        ...state,
        importStatusTracker: newTracker,
      };
    }

    // Collapsible state management
    case "ITEM_EXPANDED": {
      const newExpandedItems = new Set(state.expandedItems);
      newExpandedItems.add(action.payload);
      return {
        ...state,
        expandedItems: newExpandedItems,
      };
    }

    case "ITEM_COLLAPSED": {
      const newExpandedItems = new Set(state.expandedItems);
      newExpandedItems.delete(action.payload);
      return {
        ...state,
        expandedItems: newExpandedItems,
      };
    }

    case "ITEM_TOGGLED": {
      const newExpandedItems = new Set(state.expandedItems);
      if (newExpandedItems.has(action.payload)) {
        newExpandedItems.delete(action.payload);
      } else {
        newExpandedItems.add(action.payload);
      }
      return {
        ...state,
        expandedItems: newExpandedItems,
      };
    }

    case "ALL_ITEMS_EXPANDED":
      return {
        ...state,
        expandedItems: new Set(action.payload),
      };

    case "ALL_ITEMS_COLLAPSED":
      return {
        ...state,
        expandedItems: new Set(),
      };

    case "EXPANDED_ITEMS_SET":
      return {
        ...state,
        expandedItems: new Set(action.payload),
      };

    // Pagination management
    case "PAGE_CHANGED":
      return {
        ...state,
        currentPage: action.payload,
      };

    case "ITEMS_PER_PAGE_CHANGED":
      return {
        ...state,
        itemsPerPage: action.payload,
        currentPage: 1, // Reset to first page when changing page size
      };

    default:
      return state;
  }
}

// Context interface
export interface ImportStateContextType {
  state: ImportState;
  dispatch: React.Dispatch<ImportAction>;

  // Upload actions
  addUploadingHtmlFiles: (files: string[]) => void;
  removeUploadingHtmlFiles: (files: string[]) => void;
  clearUploadingHtmlFiles: () => void;
  setFileTitles: (titles: Map<string, string>) => void;
  clearFileTitles: () => void;
  addUploadItem: (item: UploadItem) => void;
  updateUploadItem: (importId: string, updates: Partial<UploadItem>) => void;
  removeUploadItem: (importId: string) => void;
  clearUploadItems: () => void;
  generateImportId: () => string;
  cancelUpload: (importId: string) => void;
  cancelAllUploads: () => void;

  // Connection actions
  setConnectionStatus: (status: ConnectionState) => void;
  connectWebSocket: () => void;
  disconnectWebSocket: () => void;

  // Events actions
  updateEvents: (events: StatusEvent[]) => void;

  // Import items actions
  updateImportItems: (items: Map<string, ImportItem>) => void;

  // Collapsible actions
  isExpanded: (itemId: string) => boolean;
  toggleItem: (itemId: string) => void;
  expandItem: (itemId: string) => void;
  collapseItem: (itemId: string) => void;
  expandAll: (itemIds: string[]) => void;
  collapseAll: () => void;
  setExpandedItems: (itemIds: string[]) => void;

  // Pagination actions
  setCurrentPage: (page: number) => void;
  setItemsPerPage: (count: number) => void;
}

const ImportStateContext = createContext<ImportStateContextType | undefined>(
  undefined
);

interface ImportStateProviderProps {
  children: ReactNode;
  storageKey?: string;
  persistCollapsibleState?: boolean;
}

export function ImportStateProvider({
  children,
  storageKey = "import-state",
  persistCollapsibleState = true,
}: ImportStateProviderProps): ReactNode {
  const [state, dispatch] = useReducer(importStateReducer, initialState);

  // WebSocket connection management
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectingRef = useRef(false);
  const lastReconnectAttemptRef = useRef(0);
  const currentEventsRef = useRef<StatusEvent[]>([]);
  const reconnectAttemptsRef = useRef(0);
  const connectWebSocketRef = useRef<(() => void) | null>(null);

  // Update events ref when state changes
  useEffect(() => {
    currentEventsRef.current = state.events;
  }, [state.events]);

  // Load initial collapsible state from localStorage
  useEffect(() => {
    if (!persistCollapsibleState) return;

    try {
      const stored = localStorage.getItem(`${storageKey}-expanded`);
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        dispatch({ type: "EXPANDED_ITEMS_SET", payload: parsed });
      }
    } catch (error) {
      console.warn(
        "Failed to load collapsible state from localStorage:",
        error
      );
    }
  }, [storageKey, persistCollapsibleState]);

  // Debounce localStorage saves for collapsible state
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!persistCollapsibleState) return;

    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce the save operation
    saveTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(
          `${storageKey}-expanded`,
          JSON.stringify(Array.from(state.expandedItems))
        );
      } catch (error) {
        console.warn(
          "Failed to save collapsible state to localStorage:",
          error
        );
      }
    }, 300); // 300ms debounce

    // Cleanup timeout on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state.expandedItems, storageKey, persistCollapsibleState]);

  // WebSocket connection management
  const connectWebSocket = useCallback(() => {
    if (
      wsRef.current?.readyState === WebSocket.OPEN ||
      isConnectingRef.current
    ) {
      return;
    }

    // Rate limiting: Don't reconnect more than once every 5 seconds
    const now = Date.now();
    if (now - lastReconnectAttemptRef.current < 5000) {
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
      }, 10000); // 10 second timeout

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
        }, 30000); // Ping every 30 seconds
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
        if (reconnectAttemptsRef.current < 5) {
          const backoffDelay = Math.min(
            3000 * Math.pow(2, reconnectAttemptsRef.current),
            30000
          ); // Max 30 seconds

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
            case "status_update":
              // Handle both optimized and full format events
              let statusEvent: StatusEvent;
              if ('i' in message.data) {
                // Optimized format - convert back to full format
                const opt = message.data as any;
                statusEvent = {
                  importId: opt.i,
                  status: opt.s,
                  message: opt.m,
                  context: opt.c,
                  currentCount: opt.cc,
                  totalCount: opt.tc,
                  createdAt: new Date(opt.t).toISOString(),
                  metadata: opt.md,
                };
              } else {
                // Full format
                statusEvent = message.data as StatusEvent;
              }
              
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
                existingEvent => 
                  existingEvent.importId === statusEvent.importId &&
                  existingEvent.status === statusEvent.status &&
                  existingEvent.context === statusEvent.context
              );
              
              if (isDuplicateCompletion) {
                console.log(`🔄 [FRONTEND] Skipping duplicate completion event: ${statusEvent.importId} - ${statusEvent.context}`);
                return;
              }
              
              const updatedEvents = [statusEvent, ...currentEventsRef.current];

              // Protect completion events from being truncated
              const completionEvents = updatedEvents.filter(
                event => event.status === "COMPLETED" || event.status === "FAILED"
              );
              
              // Warn if we're approaching the limit
              if (updatedEvents.length > 950) {
                console.warn(
                  `⚠️ [FRONTEND] Event buffer approaching limit: ${updatedEvents.length}/1000 events`
                );
              }

              // Ensure completion events are preserved
              let trimmedEvents = updatedEvents.slice(0, 1000);
              if (trimmedEvents.length < updatedEvents.length) {
                // Add back any completion events that were truncated
                const truncatedCompletionEvents = completionEvents.filter(
                  event => !trimmedEvents.some(te => 
                    te.importId === event.importId && 
                    te.status === event.status && 
                    te.context === event.context
                  )
                );
                trimmedEvents = [...truncatedCompletionEvents, ...trimmedEvents].slice(0, 1000);
              }
              currentEventsRef.current = trimmedEvents;
              dispatch({
                type: "EVENTS_UPDATED",
                payload: trimmedEvents,
              });
              break;
            case "status_update_batch":
              const batchData = message.data as {
                events: any[];
                batchId: string;
                timestamp: Date;
              };
              
              // Convert optimized events back to full format
              const convertedEvents: StatusEvent[] = batchData.events.map(event => {
                if ('i' in event) {
                  // Optimized format
                  return {
                    importId: event.i,
                    status: event.s,
                    message: event.m,
                    context: event.c,
                    currentCount: event.cc,
                    totalCount: event.tc,
                    createdAt: new Date(event.t).toISOString(),
                    metadata: event.md,
                  };
                } else {
                  // Full format
                  return event as StatusEvent;
                }
              });
              
              // Log completion events from batch
              convertedEvents.forEach((event) => {
                if (event.status === "COMPLETED" || event.status === "FAILED") {
                  console.log(
                    `📥 [FRONTEND] Received ${event.status} from batch: ${event.importId} - ${event.context || "no-context"}`
                  );
                }
              });
              // Process batched events in reverse order to maintain chronological order
              const batchedEvents = [...convertedEvents].reverse();

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
                ...batchedEvents,
                ...currentEventsRef.current,
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
            case "connection_established":
              console.log("🔌 WebSocket connection confirmed");
              break;
            case "pong":
              // Heartbeat response - connection is alive
              break;
            case "error":
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
  }, []);

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
  }, []);

  // Auto-connect WebSocket on mount with initial delay
  useEffect(() => {
    // Set initial status to indicate we're waiting for server
    dispatch({
      type: "CONNECTION_STATUS_CHANGED",
      payload: { status: "connecting", reconnectAttempts: 0 },
    });

    // Add a 2-second delay to allow the backend server to start up
    const initialDelay = setTimeout(() => {
      connectWebSocket();
    }, 2000);

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

  // Upload actions
  const addUploadingHtmlFiles = useCallback((files: string[]) => {
    dispatch({ type: "UPLOAD_FILES_ADDED", payload: files });
  }, []);

  const removeUploadingHtmlFiles = useCallback((files: string[]) => {
    dispatch({ type: "UPLOAD_FILES_REMOVED", payload: files });
  }, []);

  const clearUploadingHtmlFiles = useCallback(() => {
    dispatch({ type: "UPLOAD_FILES_CLEARED" });
  }, []);

  const setFileTitles = useCallback((titles: Map<string, string>) => {
    dispatch({ type: "FILE_TITLES_SET", payload: titles });
  }, []);

  const clearFileTitles = useCallback(() => {
    dispatch({ type: "FILE_TITLES_CLEARED" });
  }, []);

  const addUploadItem = useCallback((item: UploadItem) => {
    dispatch({ type: "UPLOAD_ITEM_ADDED", payload: item });
  }, []);

  const updateUploadItem = useCallback(
    (importId: string, updates: Partial<UploadItem>) => {
      dispatch({ type: "UPLOAD_ITEM_UPDATED", payload: { importId, updates } });
    },
    []
  );

  const removeUploadItem = useCallback((importId: string) => {
    dispatch({ type: "UPLOAD_ITEM_REMOVED", payload: importId });
  }, []);

  const clearUploadItems = useCallback(() => {
    dispatch({ type: "UPLOAD_ITEMS_CLEARED" });
  }, []);

  const generateImportId = useCallback(() => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `import_${timestamp}_${random}`;
  }, []);

  const cancelUpload = useCallback(
    (importId: string) => {
      const item = state.uploadItems.get(importId);
      if (item?.abortController) {
        item.abortController.abort();
      }
      updateUploadItem(importId, { status: "cancelled" });
    },
    [state.uploadItems, updateUploadItem]
  );

  const cancelAllUploads = useCallback(() => {
    state.uploadItems.forEach((item) => {
      if (item.abortController) {
        item.abortController.abort();
      }
    });
    dispatch({ type: "UPLOAD_ITEMS_CLEARED" });
  }, [state.uploadItems]);

  // Connection actions
  const setConnectionStatus = useCallback((status: ConnectionState) => {
    dispatch({ type: "CONNECTION_STATUS_CHANGED", payload: status });
  }, []);

  // Events actions
  const updateEvents = useCallback((events: StatusEvent[]) => {
    dispatch({ type: "EVENTS_UPDATED", payload: events });
  }, []);

  // Import items actions
  const updateImportItems = useCallback((items: Map<string, ImportItem>) => {
    dispatch({ type: "IMPORT_ITEMS_UPDATED", payload: items });
  }, []);

  // Collapsible actions
  const isExpanded = useCallback(
    (itemId: string): boolean => {
      return state.expandedItems.has(itemId);
    },
    [state.expandedItems]
  );

  const toggleItem = useCallback((itemId: string) => {
    dispatch({ type: "ITEM_TOGGLED", payload: itemId });
  }, []);

  const expandItem = useCallback((itemId: string) => {
    dispatch({ type: "ITEM_EXPANDED", payload: itemId });
  }, []);

  const collapseItem = useCallback((itemId: string) => {
    dispatch({ type: "ITEM_COLLAPSED", payload: itemId });
  }, []);

  const expandAll = useCallback((itemIds: string[]) => {
    dispatch({ type: "ALL_ITEMS_EXPANDED", payload: itemIds });
  }, []);

  const collapseAll = useCallback(() => {
    dispatch({ type: "ALL_ITEMS_COLLAPSED" });
  }, []);

  const setExpandedItems = useCallback((itemIds: string[]) => {
    dispatch({ type: "EXPANDED_ITEMS_SET", payload: itemIds });
  }, []);

  // Pagination actions
  const setCurrentPage = useCallback((page: number) => {
    dispatch({ type: "PAGE_CHANGED", payload: page });
  }, []);

  const setItemsPerPage = useCallback((count: number) => {
    dispatch({ type: "ITEMS_PER_PAGE_CHANGED", payload: count });
  }, []);

  const contextValue: ImportStateContextType = {
    state,
    dispatch,

    // Upload actions
    addUploadingHtmlFiles,
    removeUploadingHtmlFiles,
    clearUploadingHtmlFiles,
    setFileTitles,
    clearFileTitles,
    addUploadItem,
    updateUploadItem,
    removeUploadItem,
    clearUploadItems,
    generateImportId,
    cancelUpload,
    cancelAllUploads,

    // Connection actions
    setConnectionStatus,
    connectWebSocket,
    disconnectWebSocket,

    // Events actions
    updateEvents,

    // Import items actions
    updateImportItems,

    // Collapsible actions
    isExpanded,
    toggleItem,
    expandItem,
    collapseItem,
    expandAll,
    collapseAll,
    setExpandedItems,

    // Pagination actions
    setCurrentPage,
    setItemsPerPage,
  };

  return (
    <ImportStateContext.Provider value={contextValue}>
      {children}
    </ImportStateContext.Provider>
  );
}

export function useImportState(): ImportStateContextType {
  const context = useContext(ImportStateContext);
  if (context === undefined) {
    throw new Error(
      "useImportState must be used within an ImportStateProvider"
    );
  }
  return context;
}
