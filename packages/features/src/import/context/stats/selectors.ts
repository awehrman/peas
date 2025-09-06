import { useStats } from "./stats-provider";

import { useCallback, useMemo } from "react";

import type { ImportStatsState } from "../../types/import-types";

export function useStatsSelector<T>(
  selector: (state: ImportStatsState) => T
): T {
  const { state } = useStats();
  // Use useCallback to memoize the selector function
  const memoizedSelector = useCallback(selector, []);
  return useMemo(() => memoizedSelector(state), [state, memoizedSelector]);
}

export function useStatsDerived() {
  return useStatsSelector((state) => ({
    totalItems: state.numberOfNotes + state.numberOfIngredients,
    hasErrors: state.numberOfParsingErrors > 0,
    errorRate: state.numberOfParsingErrors / Math.max(state.numberOfNotes, 1),
  }));
}
