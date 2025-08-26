import React, { useEffect, useRef } from "react";
import type { ImportAction } from "./types";

// Add global type declarations for browser APIs
declare global {
  interface Window {
    localStorage: Storage;
  }
}

interface StorageManagerProps {
  state: { expandedItems: Set<string> };
  dispatch: React.Dispatch<ImportAction>;
  storageKey: string;
  persistCollapsibleState: boolean;
}

export function useStorageManager({ 
  state, 
  dispatch, 
  storageKey, 
  persistCollapsibleState 
}: StorageManagerProps) {
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
      console.warn("Failed to load collapsible state from localStorage:", { error: error instanceof Error ? error.message : "Unknown error" });
    }
  }, [storageKey, persistCollapsibleState, dispatch]);

  // Debounce localStorage saves for collapsible state
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        console.warn("Failed to save collapsible state to localStorage:", { error: error instanceof Error ? error.message : "Unknown error" });
      }
    }, 300); // 300ms debounce

    // Cleanup timeout on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state.expandedItems, storageKey, persistCollapsibleState]);
}
