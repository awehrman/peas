"use client";

import { activityBatchReducer, defaultActivityState } from "./activity-reducer";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";

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
 * Activity context provider for managing import activity state.
 * Each imported note emits dozens of status events, so actions are queued
 * and applied together once per animation frame.
 */
export function ActivityProvider({
  children,
  initialState = defaultActivityState,
}: ActivityProviderProps) {
  const [state, applyActions] = useReducer(activityBatchReducer, initialState);
  const queueRef = useRef<ActivityAction[]>([]);
  const cancelFlushRef = useRef<(() => void) | null>(null);

  const flush = useCallback(() => {
    cancelFlushRef.current = null;
    const actions = queueRef.current;
    queueRef.current = [];
    if (actions.length > 0) applyActions(actions);
  }, []);

  const dispatch = useCallback(
    (action: ActivityAction) => {
      queueRef.current.push(action);
      if (!cancelFlushRef.current) cancelFlushRef.current = scheduleFrame(flush);
    },
    [flush]
  );

  useEffect(() => {
    const reschedule = () => {
      cancelFlushRef.current?.();
      cancelFlushRef.current =
        queueRef.current.length > 0 ? scheduleFrame(flush) : null;
    };

    reschedule();
    document.addEventListener("visibilitychange", reschedule);
    return () => {
      document.removeEventListener("visibilitychange", reschedule);
      cancelFlushRef.current?.();
      cancelFlushRef.current = null;
    };
  }, [flush]);

  const contextValue = useMemo(() => ({ state, dispatch }), [state, dispatch]);

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

// Animation frames pause in background tabs, which would let the queue grow
// for the whole import; hidden tabs flush on a timer instead
const HIDDEN_TAB_FLUSH_MS = 250;

function scheduleFrame(callback: () => void): () => void {
  const isHidden = typeof document !== "undefined" && document.hidden;
  if (!isHidden && typeof window !== "undefined" && window.requestAnimationFrame) {
    const frame = window.requestAnimationFrame(callback);
    return () => window.cancelAnimationFrame(frame);
  }
  const timeout = setTimeout(callback, isHidden ? HIDDEN_TAB_FLUSH_MS : 16);
  return () => clearTimeout(timeout);
}
