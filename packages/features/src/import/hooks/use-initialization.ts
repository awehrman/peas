"use client";

import { useImport } from "./use-import";

import { useEffect, useRef } from "react";

interface UseInitializationProps {
  initialNoteCount?: number;
  initialIngredientCount?: number;
  initialParsingErrorCount?: number;
}

/**
 * Hook to handle initialization of import contexts with server data
 * Prevents double initialization in development mode
 */
export function useInitialization({
  initialNoteCount = 0,
  initialIngredientCount = 0,
  initialParsingErrorCount = 0,
}: UseInitializationProps) {
  const { upload, stats } = useImport();
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Prevent double initialization in development mode
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    // Initialize stats with server data if provided
    if (
      initialNoteCount > 0 ||
      initialIngredientCount > 0 ||
      initialParsingErrorCount > 0
    ) {
      stats.dispatch({
        type: "REFRESH_STATS",
        stats: {
          numberOfNotes: initialNoteCount,
          numberOfIngredients: initialIngredientCount,
          numberOfParsingErrors: initialParsingErrorCount,
        },
      });
    }
  }, [
    initialNoteCount,
    initialIngredientCount,
    initialParsingErrorCount,
    // Remove stats and upload from deps to prevent infinite loops
    // They are stable references from context
  ]);
}
