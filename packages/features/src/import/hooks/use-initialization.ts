import { useImport } from "./use-import";

import { useEffect, useRef } from "react";

interface UseInitializationProps {
  initialNoteCount?: number;
  initialIngredientCount?: number;
  initialParsingErrorCount?: number;
  enableDemoInit?: boolean;
}

/**
 * Hook to handle initialization of import contexts with server data
 * Prevents double initialization in development mode
 */
export function useInitialization({
  initialNoteCount = 0,
  initialIngredientCount = 0,
  initialParsingErrorCount = 0,
  enableDemoInit = false,
}: UseInitializationProps) {
  const { upload, stats } = useImport();
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Prevent double initialization in development mode
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    // Initialize stats with server data if provided
    if (initialNoteCount > 0) {
      stats.dispatch({ type: "INCREMENT_NOTES", count: initialNoteCount });
    }
    if (initialIngredientCount > 0) {
      stats.dispatch({
        type: "INCREMENT_INGREDIENTS",
        count: initialIngredientCount,
      });
    }
    if (initialParsingErrorCount > 0) {
      stats.dispatch({
        type: "INCREMENT_ERRORS",
        count: initialParsingErrorCount,
      });
    }

    if (enableDemoInit) {
      upload.dispatch({
        type: "START_BATCH",
        importId: `test-batch-${Date.now()}`,
        createdAt: new Date().toISOString(),
        numberOfFiles: 5,
      });
    }
  }, [
    initialNoteCount,
    initialIngredientCount,
    initialParsingErrorCount,
    enableDemoInit,
    // Remove stats and upload from deps to prevent infinite loops
    // They are stable references from context
  ]);
}
