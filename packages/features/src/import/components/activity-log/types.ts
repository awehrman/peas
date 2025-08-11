// Enum for completion messages to make status detection easier
export enum CompletionMessages {
  CLEAN_HTML = "Cleaned .html files!",
  CREATE_STRUCTURE = "Created note structure!",
  ADD_SOURCE = "Added source!",
  ADD_IMAGE = "Added image!",
  VERIFY_DUPLICATES = "Verified no duplicates!",
  DUPLICATE_IDENTIFIED = "Duplicate note identified!",
}

export interface StepStatus {
  status: "pending" | "processing" | "completed" | "failed";
  error?: string;
  message?: string;
}

export interface CountableStepStatus extends StepStatus {
  current: number;
  total: number;
  errors: number;
}

export interface ImportStatus {
  importId: string;
  noteTitle?: string;
  noteId?: string;
  status: "importing" | "completed" | "failed";
  steps: {
    cleaning: StepStatus;
    structure: StepStatus;
    noteProcessing: StepStatus;
    ingredients: CountableStepStatus;
    instructions: CountableStepStatus;
    source: StepStatus;
    image: StepStatus;
    duplicates: StepStatus;
  };
  createdAt: Date;
  completedAt?: Date;
}

export interface Props {
  className?: string;
}
