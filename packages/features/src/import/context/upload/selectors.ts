import { useImportUpload } from "./upload-provider";

import { useCallback, useMemo } from "react";

import type { UploadState } from "../../types/import-types";

export function useUploadSelector<T>(selector: (state: UploadState) => T): T {
  const { state } = useImportUpload();
  // Use useCallback to memoize the selector function
  const memoizedSelector = useCallback(selector, []);
  return useMemo(() => memoizedSelector(state), [state, memoizedSelector]);
}

export function useUploadDerived() {
  return useUploadSelector((state) => ({
    hasActiveBatch: !!state.currentBatch,
    totalBatches: state.previousBatches.length + (state.currentBatch ? 1 : 0),
    successfulBatches: state.previousBatches.filter(
      (batch) => batch.successMessage
    ).length,
    failedBatches: state.previousBatches.filter((batch) => batch.errorMessage)
      .length,
  }));
}
