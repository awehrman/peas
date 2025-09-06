import type { UploadAction, UploadState } from "../../types/import-types";

/**
 * Upload reducer - handles upload batch state
 */
export function uploadReducer(
  state: UploadState,
  action: UploadAction
): UploadState {
  switch (action.type) {
    case "START_BATCH": {
      return {
        ...state,
        currentBatch: {
          importId: action.importId,
          createdAt: action.createdAt,
          numberOfFiles: action.numberOfFiles,
        },
      };
    }

    case "COMPLETE_BATCH": {
      if (!state.currentBatch) return state;
      return {
        previousBatches: [
          ...state.previousBatches,
          {
            ...state.currentBatch,
            successMessage: action.successMessage,
          },
        ],
        currentBatch: undefined,
      };
    }

    case "FAIL_BATCH": {
      if (!state.currentBatch) return state;
      return {
        previousBatches: [
          ...state.previousBatches,
          {
            ...state.currentBatch,
            errorMessage: action.errorMessage,
          },
        ],
        currentBatch: undefined,
      };
    }

    case "RESET_CURRENT_BATCH":
      return {
        ...state,
        currentBatch: undefined,
      };

    default:
      return state;
  }
}

export const defaultUploadState: UploadState = {
  previousBatches: [],
};
