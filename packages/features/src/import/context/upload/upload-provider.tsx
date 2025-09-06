"use client";

import { defaultUploadState, uploadReducer } from "./upload-reducer";

import { type ReactNode, useMemo, useReducer } from "react";

import {
  createContext as createSelectorContext,
  useContextSelector,
} from "use-context-selector";

import type { UploadAction, UploadState } from "../../types/import-types";

interface UploadContextValue {
  state: UploadState;
  dispatch: (action: UploadAction) => void;
}

const UploadContext = createSelectorContext<UploadContextValue | null>(null);

interface UploadProviderProps {
  children: ReactNode;
  initialState?: UploadState;
}

/**
 * Upload context provider for managing upload batch state
 * Memoized to prevent unnecessary re-renders
 */
export function ImportUploadProvider({
  children,
  initialState = defaultUploadState,
}: UploadProviderProps) {
  const [state, dispatch] = useReducer(uploadReducer, initialState);

  // Memoize context value to prevent unnecessary re-renders
  // Only recreate when state actually changes
  const contextValue = useMemo(() => ({ state, dispatch }), [state]);

  return (
    <UploadContext.Provider value={contextValue}>
      {children}
    </UploadContext.Provider>
  );
}

/**
 * Hook to access upload context
 * @throws Error if used outside of ImportUploadProvider
 */
export function useImportUpload(): UploadContextValue {
  const context = useContextSelector(UploadContext, (v) => v);
  if (!context) {
    throw new Error(
      "useImportUpload must be used within an ImportUploadProvider"
    );
  }
  return context;
}
