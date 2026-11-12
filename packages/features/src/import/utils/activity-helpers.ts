import type {
  ImportCard,
  ImportCardDetails,
  StatusEvent,
  StepStatus,
} from "../types/import-types";

export type ImportStepKey = keyof ImportCard["status"];

/** Pipeline steps in the order the queue runs them */
export const IMPORT_STEP_ORDER: readonly ImportStepKey[] = [
  "uploaded",
  "cleanedNote",
  "savedNote",
  "ingredientProcessing",
  "instructionProcessing",
  "connectingSource",
  "addingImages",
  "addingTags",
  "addingCategories",
  "checkDuplicates",
];

/**
 * Maps websocket context strings to ImportCard step keys
 */
export function mapContextToStep(context: string): ImportStepKey | null {
  const contextMap: Record<string, ImportStepKey> = {
    clean_html_start: "cleanedNote",
    clean_html_end: "cleanedNote",
    save_note: "savedNote",
    ingredient_processing: "ingredientProcessing",
    parse_ingredient_line: "ingredientProcessing",
    save_ingredient_line: "ingredientProcessing",
    instruction_processing: "instructionProcessing",
    format_instruction_line: "instructionProcessing",
    save_instruction_line: "instructionProcessing",
    source_connection: "connectingSource",
    image_processing: "addingImages",
    tag_save_complete: "addingTags",
    tag_save: "addingTags",
    tag_determination_start: "addingTags",
    tag_determination_complete: "addingTags",
    categorization_save_complete: "addingCategories",
    categorization_save: "addingCategories",
    categorization_complete: "addingCategories",
    categorization_start: "addingCategories",
    check_duplicates: "checkDuplicates",
    note_completion: "savedNote",
  };

  return contextMap[context] || null;
}

/**
 * Pulls the note's title, thumbnail, source and completion out of a status
 * event. Each arrives on a different step, so most events carry none.
 */
export function getCardDetailsFromEvent(event: StatusEvent): ImportCardDetails {
  const { metadata, context, status } = event;
  const details: ImportCardDetails = {};

  if (typeof metadata?.title === "string" && metadata.title.trim()) {
    details.title = metadata.title.trim();
  }
  if (typeof metadata?.r2ThumbnailUrl === "string" && metadata.r2ThumbnailUrl) {
    details.thumbnailUrl = metadata.r2ThumbnailUrl;
  }
  if (typeof metadata?.source === "string" && metadata.source.trim()) {
    details.source = metadata.source.trim();
  }
  if (context === "note_completion" && status === "COMPLETED") {
    details.isComplete = true;
  }

  return details;
}

/**
 * Overall progress for a card (0-100). Each step contributes equally, and
 * only the queue's final completion event reaches 100.
 */
export function calculateCardProgress(card: ImportCard): number {
  if (card.isComplete) return 100;

  const steps = Object.values(card.status);
  if (steps.length === 0) return 0;

  let totalProgress = 0;
  for (const step of steps) {
    if (step.completed) {
      totalProgress += 100 / steps.length;
    } else if (step.started && step.steps && step.processedSteps) {
      totalProgress += (step.processedSteps / step.steps) * (100 / steps.length);
    }
  }

  return Math.min(99, Math.round(totalProgress));
}

/**
 * Returns human-readable labels for step keys
 */
export function getStepLabel(step: ImportStepKey): string {
  const labels: Record<ImportStepKey, string> = {
    uploaded: "Uploading",
    cleanedNote: "Cleaning HTML",
    savedNote: "Saving note",
    ingredientProcessing: "Parsing ingredients",
    instructionProcessing: "Formatting instructions",
    connectingSource: "Connecting source",
    addingImages: "Processing images",
    addingTags: "Adding tags",
    addingCategories: "Adding categories",
    checkDuplicates: "Checking for duplicates",
  };

  return labels[step] || step;
}

/**
 * Creates an initial card with default step statuses.
 * Cards are keyed by importId: every queue event carries it, while noteId
 * only exists once the note has been saved.
 */
export function createInitialCard(
  importId: string,
  noteId?: string
): ImportCard {
  const initialStepStatus: StepStatus = {
    started: false,
    completed: false,
    hasError: false,
  };

  return {
    id: importId,
    ...(noteId ? { noteId } : {}),
    isComplete: false,
    status: {
      // Cards are created from queue events, so the upload has already landed
      uploaded: { ...initialStepStatus, started: true, completed: true },
      cleanedNote: { ...initialStepStatus },
      savedNote: { ...initialStepStatus },
      ingredientProcessing: { ...initialStepStatus },
      instructionProcessing: { ...initialStepStatus },
      connectingSource: { ...initialStepStatus },
      addingImages: { ...initialStepStatus },
      addingTags: { ...initialStepStatus },
      addingCategories: { ...initialStepStatus },
      checkDuplicates: { ...initialStepStatus },
    },
  };
}

/**
 * Checks if a step is currently in progress
 */
export function isStepInProgress(status: StepStatus): boolean {
  return status.started && !status.completed && !status.hasError;
}

/**
 * Checks if a step is completed successfully
 */
export function isStepCompleted(status: StepStatus): boolean {
  return status.completed && !status.hasError;
}

/**
 * Checks if a step has an error
 */
export function isStepError(status: StepStatus): boolean {
  return status.hasError;
}

/**
 * Checks if a step is pending (not started)
 */
export function isStepPending(status: StepStatus): boolean {
  return !status.started && !status.completed && !status.hasError;
}
