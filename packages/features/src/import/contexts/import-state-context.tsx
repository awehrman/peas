"use client";

import { useImportActions } from "./actions";
import { importStateReducer, initialState } from "./reducer";
import { useStorageManager } from "./storage-manager";
import type { ImportStateContextType } from "./types";
import { DEFAULT_PERSIST_COLLAPSIBLE, DEFAULT_STORAGE_KEY } from "./types";
import { useWebSocketManager } from "./websocket-manager";

import { ReactNode, createContext, useContext, useReducer } from "react";

const ImportStateContext = createContext<ImportStateContextType | undefined>(
  undefined
);

interface ImportStateProviderProps {
  children: ReactNode;
  storageKey?: string;
  persistCollapsibleState?: boolean;
}

export function ImportStateProvider({
  children,
  storageKey = DEFAULT_STORAGE_KEY,
  persistCollapsibleState = DEFAULT_PERSIST_COLLAPSIBLE,
}: ImportStateProviderProps): ReactNode {
  const [state, dispatch] = useReducer(importStateReducer, initialState);

  // Use extracted hooks for different concerns
  const actions = useImportActions({ state, dispatch });
  const { connectWebSocket, disconnectWebSocket } = useWebSocketManager({
    dispatch,
    state,
  });

  useStorageManager({
    state,
    dispatch,
    storageKey,
    persistCollapsibleState,
  });

  const contextValue: ImportStateContextType = {
    state,
    dispatch,
    ...actions,
    connectWebSocket,
    disconnectWebSocket,
  };

  return (
    <ImportStateContext.Provider value={contextValue}>
      {children}
    </ImportStateContext.Provider>
  );
}

export function useImportState(): ImportStateContextType {
  const context = useContext(ImportStateContext);
  if (context === undefined) {
    throw new Error(
      "useImportState must be used within an ImportStateProvider"
    );
  }
  return context;
}
