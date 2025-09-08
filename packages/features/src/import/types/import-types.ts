/**
 * Import feature types based on the architecture document
 */

export interface FileUploadItem {
  id: string;
  file: File;
  status: "pending" | "uploading" | "completed" | "failed";
  progress: number;
  error?: string;
}

export interface UploadBatch {
  importId: string;
  createdAt: string;
  numberOfFiles: number;
  files: FileUploadItem[];
  directoryName?: string;
  successMessage?: string;
  errorMessage?: string;
}

export interface UploadState {
  currentBatch?: UploadBatch;
  previousBatches: UploadBatch[];
}

export interface WsConnectionState {
  lastSuccessfulConnectionAt?: string;
  status: "idle" | "connecting" | "connected" | "error" | "reconnecting";
  reconnectionAttempts: number;
}

// WebSocket message types for better type safety
export interface WebSocketMessage {
  type: "status_update" | "connection_established" | "pong" | "error";
  data: any;
}

export interface StatusEvent {
  importId: string;
  status: string;
  progress?: number;
  message?: string;
}

export interface ImportStatsState {
  numberOfIngredients: number;
  numberOfNotes: number;
  numberOfParsingErrors: number;
}

export interface StepStatus {
  started: boolean;
  completed: boolean;
  hasError: boolean;
  startMessage?: string;
  completedMessage?: string;
  errorMessage?: string;
  progressMessage?: string;
  steps?: number;
  processedSteps?: number;
  erroredSteps?: number;
}

export interface ImportCard {
  id: string;
  isExpanded: boolean;
  imageThumbnail?: string;
  status: {
    uploaded: StepStatus;
    cleanedNote: StepStatus;
    savedNote: StepStatus;
    ingredientProcessing: StepStatus;
    instructionProcessing: StepStatus;
    connectingSource: StepStatus;
    addingImages: StepStatus;
    addingTags: StepStatus;
    addingCategories: StepStatus;
    checkDuplicates: StepStatus;
  };
}

export interface ActivityState {
  currentPageIndex: number;
  pageToCardIds: Record<number, string[]>;
  cardsById: Record<string, ImportCard>;
}

export interface ImportState {
  uploads: UploadState;
  wsConnection: WsConnectionState;
  stats: ImportStatsState;
  activity: ActivityState;
}

// Action types
export type UploadAction =
  | {
      type: "START_BATCH";
      importId: string;
      createdAt: string;
      numberOfFiles: number;
    }
  | { type: "ADD_FILES"; files: FileUploadItem[]; directoryName?: string }
  | {
      type: "UPDATE_FILE_STATUS";
      fileId: string;
      status: FileUploadItem["status"];
      progress?: number;
      error?: string;
    }
  | { type: "REMOVE_FILE"; fileId: string }
  | { type: "CLEAR_FILES" }
  | {
      type: "UPDATE_BATCH_STATUS";
      importId: string;
      status: FileUploadItem["status"];
      progress?: number;
      error?: string;
    }
  | { type: "COMPLETE_BATCH"; successMessage: string }
  | { type: "FAIL_BATCH"; errorMessage: string }
  | { type: "RESET_CURRENT_BATCH" }
  | { type: "CLEAR_ALL_BATCHES" };

export type WsAction =
  | { type: "WS_CONNECTING" }
  | { type: "WS_CONNECTED"; timestamp: string }
  | { type: "WS_DISCONNECTED" }
  | { type: "WS_RETRY" }
  | { type: "WS_ERROR" };

export type StatsAction = { type: "REFRESH_STATS"; stats: ImportStatsState };

export type ActivityAction =
  | { type: "ADD_IMPORT_CARD"; pageIndex: number; card: ImportCard }
  | { type: "TOGGLE_CARD_EXPANDED"; pageIndex: number; cardId: string }
  | {
      type: "UPDATE_CARD_STATUS";
      pageIndex: number;
      cardId: string;
      step: keyof ImportCard["status"];
      statusUpdate: Partial<StepStatus>;
    }
  | { type: "SET_PAGE"; pageIndex: number }
  | { type: "RESET_ACTIVITY" };

export type ImportAction =
  | UploadAction
  | WsAction
  | StatsAction
  | ActivityAction;

// Context value types for proper TypeScript export
export interface UploadContextValue {
  state: UploadState;
  dispatch: (action: UploadAction) => void;
}

export interface WsContextValue {
  state: WsConnectionState;
  dispatch: (action: WsAction) => void;
  connect: () => void;
  disconnect: () => void;
  sendMessage: <T extends WebSocketMessage>(message: T) => void;
}

export interface StatsContextValue {
  state: ImportStatsState;
  dispatch: (action: StatsAction) => void;
}

export interface ActivityContextValue {
  state: ActivityState;
  dispatch: (action: ActivityAction) => void;
}
