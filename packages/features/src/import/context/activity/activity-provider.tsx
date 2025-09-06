"use client";

import { activityReducer, defaultActivityState } from "./activity-reducer";

import { type ReactNode, useMemo, useReducer } from "react";

import {
  createContext as createSelectorContext,
  useContextSelector,
} from "use-context-selector";

import type { ActivityAction, ActivityState } from "../../types/import-types";

interface ActivityContextValue {
  state: ActivityState;
  dispatch: (action: ActivityAction) => void;
}

const ActivityContext = createSelectorContext<ActivityContextValue | null>(
  null
);

interface ActivityProviderProps {
  children: ReactNode;
  initialState?: ActivityState;
}

/**
 * Activity context provider for managing import activity state
 * Provides optimized reducer with better performance for array operations
 * Memoized to prevent unnecessary re-renders
 */
export function ActivityProvider({
  children,
  initialState = defaultActivityState,
}: ActivityProviderProps) {
  const [state, dispatch] = useReducer(activityReducer, initialState);

  // Memoize context value to prevent unnecessary re-renders
  // Only recreate when state actually changes
  const contextValue = useMemo(() => ({ state, dispatch }), [state]);

  return (
    <ActivityContext.Provider value={contextValue}>
      {children}
    </ActivityContext.Provider>
  );
}

/**
 * Hook to access activity context
 * @throws Error if used outside of ActivityProvider
 */
export function useActivity(): ActivityContextValue {
  const context = useContextSelector(ActivityContext, (v) => v);
  if (!context) {
    throw new Error("useActivity must be used within an ActivityProvider");
  }
  return context;
}
