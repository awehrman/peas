import { useWs } from "./ws-provider";

import { useCallback, useMemo } from "react";

import type { WsConnectionState } from "../../types/import-types";

export function useWsSelector<T>(selector: (state: WsConnectionState) => T): T {
  const { state } = useWs();
  // Use useCallback to memoize the selector function
  const memoizedSelector = useCallback(selector, []);
  return useMemo(() => memoizedSelector(state), [state, memoizedSelector]);
}

export function useWsDerived() {
  return useWsSelector((state) => ({
    isConnected: state.status === "connected",
    isConnecting: state.status === "connecting",
    isReconnecting: state.status === "reconnecting",
    hasError: state.status === "error",
    isIdle: state.status === "idle",
    shouldShowRetry: state.status === "error" && state.reconnectionAttempts < 5,
  }));
}
