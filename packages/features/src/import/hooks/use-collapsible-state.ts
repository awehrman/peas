import { useCallback, useEffect, useState } from "react";

export interface UseCollapsibleStateOptions {
  storageKey?: string;
  defaultExpanded?: boolean;
  persistState?: boolean;
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
  defaultExpanded = false,
  persistState = true,
}: UseCollapsibleStateOptions = {}): UseCollapsibleStateReturn {
  const [expandedItems, setExpandedItemsState] = useState<Set<string>>(new Set());

  // Load initial state from localStorage
  useEffect(() => {
    if (!persistState) return;

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        setExpandedItemsState(new Set(parsed));
      }
    } catch (error) {
      console.warn("Failed to load collapsible state from localStorage:", error);
      // Continue without loading state - use empty set
      setExpandedItemsState(new Set());
    }
  }, [storageKey, persistState]);

  // Save state to localStorage when it changes
  useEffect(() => {
    if (!persistState) return;

    try {
      localStorage.setItem(storageKey, JSON.stringify(Array.from(expandedItems)));
    } catch (error) {
      console.warn("Failed to save collapsible state to localStorage:", error);
      // Continue without persistence - state will be lost but app won't crash
    }
  }, [expandedItems, storageKey, persistState]);

  const isExpanded = useCallback(
    (itemId: string): boolean => {
      return expandedItems.has(itemId);
    },
    [expandedItems]
  );

  const toggleItem = useCallback(
    (itemId: string) => {
      setExpandedItemsState((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(itemId)) {
          newSet.delete(itemId);
        } else {
          newSet.add(itemId);
        }
        return newSet;
      });
    },
    []
  );

  const expandItem = useCallback(
    (itemId: string) => {
      setExpandedItemsState((prev) => {
        const newSet = new Set(prev);
        newSet.add(itemId);
        return newSet;
      });
    },
    []
  );

  const collapseItem = useCallback(
    (itemId: string) => {
      setExpandedItemsState((prev) => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    },
    []
  );

  const expandAll = useCallback(
    (itemIds: string[]) => {
      setExpandedItemsState((prev) => {
        const newSet = new Set(prev);
        itemIds.forEach((id) => newSet.add(id));
        return newSet;
      });
    },
    []
  );

  const collapseAll = useCallback(() => {
    setExpandedItemsState(new Set());
  }, []);

  const setExpandedItems = useCallback(
    (itemIds: string[]) => {
      setExpandedItemsState(new Set(itemIds));
    },
    []
  );

  return {
    expandedItems,
    isExpanded,
    toggleItem,
    expandItem,
    collapseItem,
    expandAll,
    collapseAll,
    setExpandedItems,
  };
}
