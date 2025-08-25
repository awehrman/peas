import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Add global type declarations for browser APIs
declare global {
  interface Window {
    localStorage: Storage;
  }
}

export interface UseCollapsibleStateOptions {
  storageKey?: string;
  defaultExpanded?: boolean;
  persistState?: boolean;
  maxStoredItems?: number;
}

export interface UseCollapsibleStateReturn {
  expandedItems: Set<string>;
  isExpanded: (itemId: string) => boolean;
  toggleItem: (itemId: string) => void;
  expandItem: (itemId: string) => void;
  collapseItem: (itemId: string) => void;
  expandAll: (itemIds: string[]) => void;
  collapseAll: () => void;
  setExpandedItems: (itemIds: string[]) => void;
}

export function useCollapsibleState({
  storageKey = "collapsible-state",
  defaultExpanded: _defaultExpanded = false,
  persistState = true,
  maxStoredItems = 50,
}: UseCollapsibleStateOptions = {}): UseCollapsibleStateReturn {
  const [expandedItems, setExpandedItemsState] = useState<Set<string>>(
    new Set()
  );

  // Debounce localStorage saves to improve performance
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);

  // Load initial state from localStorage
  useEffect(() => {
    if (!persistState || typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        // Limit the number of stored items to prevent memory issues
        const limitedItems = parsed.slice(0, maxStoredItems);
        setExpandedItemsState(new Set(limitedItems));
      }
    } catch (error) {
      console.warn(
        "Failed to load collapsible state from localStorage:",
        error
      );
      setExpandedItemsState(new Set());
    }
  }, [storageKey, persistState, maxStoredItems]);

  // Save state to localStorage with debouncing
  useEffect(() => {
    if (!persistState || typeof window === "undefined") return;

    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce the save operation
    saveTimeoutRef.current = setTimeout(() => {
      if (!mounted.current) return;

      try {
        const itemsArray = Array.from(expandedItems);
        // Limit stored items to prevent localStorage bloat
        const limitedItems = itemsArray.slice(0, maxStoredItems);
        localStorage.setItem(storageKey, JSON.stringify(limitedItems));
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
  }, [expandedItems, storageKey, persistState, maxStoredItems]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mounted.current = false;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const isExpanded = useCallback(
    (itemId: string): boolean => expandedItems.has(itemId),
    [expandedItems]
  );

  const toggleItem = useCallback((itemId: string) => {
    setExpandedItemsState((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);

  const expandItem = useCallback((itemId: string) => {
    setExpandedItemsState((prev) => {
      if (prev.has(itemId)) return prev; // No change needed
      const newSet = new Set(prev);
      newSet.add(itemId);
      return newSet;
    });
  }, []);

  const collapseItem = useCallback((itemId: string) => {
    setExpandedItemsState((prev) => {
      if (!prev.has(itemId)) return prev; // No change needed
      const newSet = new Set(prev);
      newSet.delete(itemId);
      return newSet;
    });
  }, []);

  const expandAll = useCallback((itemIds: string[]) => {
    setExpandedItemsState((prev) => {
      const newSet = new Set(prev);
      let hasChanges = false;

      itemIds.forEach((id) => {
        if (!newSet.has(id)) {
          newSet.add(id);
          hasChanges = true;
        }
      });

      return hasChanges ? newSet : prev;
    });
  }, []);

  const collapseAll = useCallback(() => {
    setExpandedItemsState((prev) => {
      return prev.size > 0 ? new Set() : prev;
    });
  }, []);

  const setExpandedItems = useCallback((itemIds: string[]) => {
    setExpandedItemsState(new Set(itemIds));
  }, []);

  return useMemo(
    () => ({
      expandedItems,
      isExpanded,
      toggleItem,
      expandItem,
      collapseItem,
      expandAll,
      collapseAll,
      setExpandedItems,
    }),
    [
      expandedItems,
      isExpanded,
      toggleItem,
      expandItem,
      collapseItem,
      expandAll,
      collapseAll,
      setExpandedItems,
    ]
  );
}
