import type {
  ConnectionState,
  ImportAction,
  ImportItem,
  ImportState,
  StatusEvent,
  UploadItem,
} from "./types";

import React, { useCallback } from "react";

interface ActionsProps {
  state: ImportState;
  dispatch: React.Dispatch<ImportAction>;
}

export function useImportActions({ state, dispatch }: ActionsProps) {
  // Upload actions
  const addUploadingHtmlFiles = useCallback(
    (files: string[]) => {
      dispatch({ type: "UPLOAD_FILES_ADDED", payload: files });
    },
    [dispatch]
  );

  const removeUploadingHtmlFiles = useCallback(
    (files: string[]) => {
      dispatch({ type: "UPLOAD_FILES_REMOVED", payload: files });
    },
    [dispatch]
  );

  const clearUploadingHtmlFiles = useCallback(() => {
    dispatch({ type: "UPLOAD_FILES_CLEARED" });
  }, [dispatch]);

  const setFileTitles = useCallback(
    (titles: Map<string, string>) => {
      dispatch({ type: "FILE_TITLES_SET", payload: titles });
    },
    [dispatch]
  );

  const clearFileTitles = useCallback(() => {
    dispatch({ type: "FILE_TITLES_CLEARED" });
  }, [dispatch]);

  const addUploadItem = useCallback(
    (item: UploadItem) => {
      dispatch({ type: "UPLOAD_ITEM_ADDED", payload: item });
    },
    [dispatch]
  );

  const updateUploadItem = useCallback(
    (importId: string, updates: Partial<UploadItem>) => {
      dispatch({ type: "UPLOAD_ITEM_UPDATED", payload: { importId, updates } });
    },
    [dispatch]
  );

  const removeUploadItem = useCallback(
    (importId: string) => {
      dispatch({ type: "UPLOAD_ITEM_REMOVED", payload: importId });
    },
    [dispatch]
  );

  const clearUploadItems = useCallback(() => {
    dispatch({ type: "UPLOAD_ITEMS_CLEARED" });
  }, [dispatch]);

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
  }, [state.uploadItems, dispatch]);

  // Connection actions
  const setConnectionStatus = useCallback(
    (status: ConnectionState) => {
      dispatch({ type: "CONNECTION_STATUS_CHANGED", payload: status });
    },
    [dispatch]
  );

  // Events actions
  const updateEvents = useCallback(
    (events: StatusEvent[]) => {
      dispatch({ type: "EVENTS_UPDATED", payload: events });
    },
    [dispatch]
  );

  // Import items actions
  const updateImportItems = useCallback(
    (items: Map<string, ImportItem>) => {
      dispatch({ type: "IMPORT_ITEMS_UPDATED", payload: items });
    },
    [dispatch]
  );

  // Collapsible actions
  const isExpanded = useCallback(
    (itemId: string): boolean => {
      return state.expandedItems.has(itemId);
    },
    [state.expandedItems]
  );

  const toggleItem = useCallback(
    (itemId: string) => {
      dispatch({ type: "ITEM_TOGGLED", payload: itemId });
    },
    [dispatch]
  );

  const expandItem = useCallback(
    (itemId: string) => {
      dispatch({ type: "ITEM_EXPANDED", payload: itemId });
    },
    [dispatch]
  );

  const collapseItem = useCallback(
    (itemId: string) => {
      dispatch({ type: "ITEM_COLLAPSED", payload: itemId });
    },
    [dispatch]
  );

  const expandAll = useCallback(
    (itemIds: string[]) => {
      dispatch({ type: "ALL_ITEMS_EXPANDED", payload: itemIds });
    },
    [dispatch]
  );

  const collapseAll = useCallback(() => {
    dispatch({ type: "ALL_ITEMS_COLLAPSED" });
  }, [dispatch]);

  const setExpandedItems = useCallback(
    (itemIds: string[]) => {
      dispatch({ type: "EXPANDED_ITEMS_SET", payload: itemIds });
    },
    [dispatch]
  );

  // Pagination actions
  const setCurrentPage = useCallback(
    (page: number) => {
      dispatch({ type: "PAGE_CHANGED", payload: page });
    },
    [dispatch]
  );

  const setItemsPerPage = useCallback(
    (count: number) => {
      dispatch({ type: "ITEMS_PER_PAGE_CHANGED", payload: count });
    },
    [dispatch]
  );

  return {
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
}
