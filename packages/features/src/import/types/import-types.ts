/**
 * Import feature types based on the architecture document
 */

export interface UploadBatch {
  importId: string;
  createdAt: string;
  numberOfFiles: number;
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
  | { type: "COMPLETE_BATCH"; successMessage: string }
  | { type: "FAIL_BATCH"; errorMessage: string }
  | { type: "RESET_CURRENT_BATCH" };

export type WsAction =
  | { type: "WS_CONNECTING" }
  | { type: "WS_CONNECTED"; timestamp: string }
  | { type: "WS_DISCONNECTED" }
  | { type: "WS_RETRY" }
  | { type: "WS_ERROR" };

export type StatsAction =
  | { type: "INCREMENT_INGREDIENTS"; count: number }
  | { type: "INCREMENT_NOTES"; count: number }
  | { type: "INCREMENT_ERRORS"; count: number }
  | { type: "RESET_STATS" };

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
