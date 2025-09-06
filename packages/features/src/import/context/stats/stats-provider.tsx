"use client";

import { defaultStatsState, statsReducer } from "./stats-reducer";

import { type ReactNode, useMemo, useReducer } from "react";

import {
  createContext as createSelectorContext,
  useContextSelector,
} from "use-context-selector";

import type { ImportStatsState, StatsAction } from "../../types/import-types";

interface StatsContextValue {
  state: ImportStatsState;
  dispatch: (action: StatsAction) => void;
}

const StatsContext = createSelectorContext<StatsContextValue | null>(null);

interface StatsProviderProps {
  children: ReactNode;
  initialState?: ImportStatsState;
}

/**
 * Stats context provider for managing import statistics
 * Memoized to prevent unnecessary re-renders
 */
export function StatsProvider({
  children,
  initialState = defaultStatsState,
}: StatsProviderProps) {
  const [state, dispatch] = useReducer(statsReducer, initialState);

  // Memoize context value to prevent unnecessary re-renders
  // Only recreate when state actually changes
  const contextValue = useMemo(() => ({ state, dispatch }), [state]);

  return (
    <StatsContext.Provider value={contextValue}>
      {children}
    </StatsContext.Provider>
  );
}

/**
 * Hook to access stats context
 * @throws Error if used outside of StatsProvider
 */
export function useStats(): StatsContextValue {
  const context = useContextSelector(StatsContext, (v) => v);
  if (!context) {
    throw new Error("useStats must be used within a StatsProvider");
  }
  return context;
}
