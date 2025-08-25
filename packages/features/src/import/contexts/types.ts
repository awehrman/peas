// WebSocket configuration
export const DEFAULT_WS_URL =
  process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080";

// Default configuration constants
export const DEFAULT_ITEMS_PER_PAGE = 20; // More reasonable default for pagination
export const DEFAULT_STORAGE_KEY = "import-state";
export const DEFAULT_PERSIST_COLLAPSIBLE = true;

// WebSocket configuration constants
export const WS_CONNECTION_TIMEOUT_MS = 10000; // 10 seconds
export const WS_HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds
export const WS_RATE_LIMIT_MS = 5000; // 5 seconds between reconnection attempts
export const WS_MAX_RECONNECT_ATTEMPTS = 5;
export const WS_INITIAL_RETRY_DELAY_MS = 3000; // 3 seconds
export const WS_MAX_RETRY_DELAY_MS = 30000; // 30 seconds
export const WS_INITIAL_CONNECTION_DELAY_MS = 2000; // 2 seconds for server startup

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

import React from "react";

// Import StatusEvent type from the hooks
export interface StatusEvent {
  importId: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  message?: string;
  context?: string;
  errorMessage?: string;
  currentCount?: number;
  totalCount?: number;
  createdAt: string;
  indentLevel?: number;
  metadata?: Record<string, unknown>;
}
