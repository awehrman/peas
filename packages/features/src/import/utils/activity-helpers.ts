import type { ImportCard, StepStatus } from "../types/import-types";

/**
 * Maps websocket context strings to ImportCard step keys
 */
export function mapContextToStep(
  context: string
): keyof ImportCard["status"] | null {
  // Map context strings to step names
  const contextMap: Record<string, keyof ImportCard["status"]> = {
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
    note_completion: "savedNote", // Final completion maps to savedNote
  };

  return contextMap[context] || null;
}

/**
 * Calculates overall progress percentage for a card (0-100)
 * Each step contributes equally to the total progress
 */
export function calculateCardProgress(card: ImportCard): number {
  const steps = Object.values(card.status);
  const totalSteps = steps.length;

  if (totalSteps === 0) return 0;

  let totalProgress = 0;

  for (const step of steps) {
    if (step.completed) {
      // Completed step = 100% of its portion
      totalProgress += 100 / totalSteps;
    } else if (step.started && step.steps && step.processedSteps) {
      // In-progress step with counts = partial progress
      const stepProgress =
        (step.processedSteps / step.steps) * (100 / totalSteps);
      totalProgress += stepProgress;
    }
  }

  return Math.round(totalProgress);
}

/**
 * Returns human-readable labels for step keys
 */
export function getStepLabel(step: keyof ImportCard["status"]): string {
  const labels: Record<keyof ImportCard["status"], string> = {
    uploaded: "Uploaded",
    cleanedNote: "Cleaning HTML",
    savedNote: "Saving Note",
    ingredientProcessing: "Processing Ingredients",
    instructionProcessing: "Processing Instructions",
    connectingSource: "Connecting Source",
    addingImages: "Adding Images",
    addingTags: "Adding Tags",
    addingCategories: "Adding Categories",
    checkDuplicates: "Checking Duplicates",
  };

  return labels[step] || step;
}

/**
 * Creates an initial card with default step statuses
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
    id: noteId || importId,
    isExpanded: false,
    status: {
      uploaded: { ...initialStepStatus, started: true }, // Upload starts immediately
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
