import { useActivity } from "./activity-provider";

import { useCallback, useMemo } from "react";

import type { ActivityState } from "../../types/import-types";

export function useActivitySelector<T>(
  selector: (state: ActivityState) => T
): T {
  const { state } = useActivity();
  // Use useCallback to memoize the selector function
  const memoizedSelector = useCallback(selector, []);
  return useMemo(() => memoizedSelector(state), [state, memoizedSelector]);
}

export function useActivityDerived() {
  return useActivitySelector((state) => {
    const numPages = Object.keys(state.pageToCardIds).length || 1;
    // Count only completed cards (cards with savedNote.completed = true)
    const totalImported = Object.values(state.cardsById).filter(
      (card) => card.status.savedNote.completed
    ).length;
    return {
      numPages,
      totalImported,
      currentPageIndex: state.currentPageIndex,
    };
  });
}
