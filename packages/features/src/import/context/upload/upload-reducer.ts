import type {
  FileUploadItem,
  UploadAction,
  UploadState,
} from "../../types/import-types";

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
          files: [],
        },
      };
    }

    case "ADD_FILES": {
      if (!state.currentBatch) return state;
      return {
        ...state,
        currentBatch: {
          ...state.currentBatch,
          files: [...state.currentBatch.files, ...action.files],
          directoryName: action.directoryName,
        },
      };
    }

    case "UPDATE_FILE_STATUS": {
      if (!state.currentBatch) return state;
      return {
        ...state,
        currentBatch: {
          ...state.currentBatch,
          files: state.currentBatch.files.map((file) =>
            file.id === action.fileId
              ? {
                  ...file,
                  status: action.status,
                  progress: action.progress ?? file.progress,
                  error: action.error,
                }
              : file
          ),
        },
      };
    }

    case "REMOVE_FILE": {
      if (!state.currentBatch) return state;
      return {
        ...state,
        currentBatch: {
          ...state.currentBatch,
          files: state.currentBatch.files.filter(
            (file) => file.id !== action.fileId
          ),
        },
      };
    }

    case "CLEAR_FILES": {
      if (!state.currentBatch) return state;
      return {
        ...state,
        currentBatch: {
          ...state.currentBatch,
          files: [],
        },
      };
    }

    case "UPDATE_BATCH_STATUS": {
      if (
        !state.currentBatch ||
        state.currentBatch.importId !== action.importId
      ) {
        return state;
      }
      return {
        ...state,
        currentBatch: {
          ...state.currentBatch,
          files: state.currentBatch.files.map((file) => ({
            ...file,
            status: action.status,
            progress: action.progress ?? file.progress,
            error: action.error,
          })),
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

    case "CLEAR_ALL_BATCHES":
      return {
        ...state,
        currentBatch: undefined,
        previousBatches: [],
      };

    default:
      return state;
  }
}

export const defaultUploadState: UploadState = {
  previousBatches: [],
};
