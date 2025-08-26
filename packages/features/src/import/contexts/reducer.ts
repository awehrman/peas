import type { ImportAction, ImportState } from "./types";
import { DEFAULT_ITEMS_PER_PAGE } from "./types";

// Initial state
export const initialState: ImportState = {
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
  itemsPerPage: DEFAULT_ITEMS_PER_PAGE,
  importStatusTracker: new Map(),
};

// State reducer with optimized updates
export function importStateReducer(
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
          existing[key as keyof typeof existing] !==
          updates[key as keyof typeof updates]
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

      // Deduplicate events based on importId, status, context, and timestamp
      const seenEvents = new Set<string>();
      const deduplicatedEvents = newEvents.filter((event) => {
        const eventKey = `${event.importId}_${event.status}_${event.context || "no-context"}_${event.createdAt}`;
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
