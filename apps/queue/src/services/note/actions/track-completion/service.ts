import type { StructuredLogger } from "../../../../types";

export interface NoteCompletionStatus {
  noteId: string;
  importId: string;
  noteWorkerCompleted: boolean;
  instructionWorkerCompleted: boolean;
  ingredientWorkerCompleted: boolean;
  imageWorkerCompleted: boolean;
  allCompleted: boolean;
  // Image job tracking
  totalImageJobs: number;
  completedImageJobs: number;
}

// Track completion status by note ID
const noteCompletionStatus = new Map<string, NoteCompletionStatus>();

/**
 * Initialize completion tracking for a note
 */
export function initializeNoteCompletion(
  noteId: string,
  importId: string
): void {
  noteCompletionStatus.set(noteId, {
    noteId,
    importId,
    noteWorkerCompleted: false,
    instructionWorkerCompleted: false,
    ingredientWorkerCompleted: false,
    imageWorkerCompleted: false,
    allCompleted: false,
    totalImageJobs: 0,
    completedImageJobs: 0,
  });
}

/**
 * Set the total number of image jobs for a note
 */
export function setTotalImageJobs(
  noteId: string,
  totalJobs: number,
  logger: StructuredLogger
): void {
  const status = noteCompletionStatus.get(noteId);
  if (!status) {
    logger.log(
      `[TRACK_COMPLETION] No completion status found for note: ${noteId}`
    );
    return;
  }

  status.totalImageJobs = totalJobs;
  logger.log(
    `[TRACK_COMPLETION] Set total image jobs for note ${noteId}: ${totalJobs}`
  );
}

/**
 * Mark an individual image job as completed
 */
export function markImageJobCompleted(
  noteId: string,
  logger: StructuredLogger,
  statusBroadcaster?: {
    addStatusEventAndBroadcast: (
      event: Record<string, unknown>
    ) => Promise<Record<string, unknown>>;
  }
): void {
  const status = noteCompletionStatus.get(noteId);
  if (!status) {
    logger.log(
      `[TRACK_COMPLETION] No completion status found for note: ${noteId}`
    );
    return;
  }

  status.completedImageJobs++;
  logger.log(
    `[TRACK_COMPLETION] Image job completed for note ${noteId}: ${status.completedImageJobs}/${status.totalImageJobs}`
  );

  // Check if all image jobs are completed
  if (
    status.completedImageJobs >= status.totalImageJobs &&
    status.totalImageJobs > 0
  ) {
    logger.log(
      `[TRACK_COMPLETION] All image jobs completed for note ${noteId}, marking image worker as completed`
    );
    markWorkerCompleted(noteId, "image", logger, statusBroadcaster);
  }
}

/**
 * Mark a specific worker type as completed for a note
 */
export function markWorkerCompleted(
  noteId: string,
  workerType: "note" | "instruction" | "ingredient" | "image",
  logger: StructuredLogger,
  statusBroadcaster?: {
    addStatusEventAndBroadcast: (
      event: Record<string, unknown>
    ) => Promise<Record<string, unknown>>;
  }
): void {
  const status = noteCompletionStatus.get(noteId);
  if (!status) {
    logger.log(
      `[TRACK_COMPLETION] No completion status found for note: ${noteId}`
    );
    return;
  }

  // Mark the specific worker as completed
  switch (workerType) {
    case "note":
      status.noteWorkerCompleted = true;
      break;
    case "instruction":
      status.instructionWorkerCompleted = true;
      break;
    case "ingredient":
      status.ingredientWorkerCompleted = true;
      break;
    case "image":
      status.imageWorkerCompleted = true;
      break;
  }

  // Check if all workers are completed
  const allCompleted =
    status.noteWorkerCompleted &&
    status.instructionWorkerCompleted &&
    status.ingredientWorkerCompleted &&
    status.imageWorkerCompleted;

  status.allCompleted = allCompleted;

  logger.log(
    `[TRACK_COMPLETION] Worker ${workerType} completed for note ${noteId}. All completed: ${allCompleted}`
  );

  // If all workers are completed, broadcast the completion
  if (allCompleted && statusBroadcaster) {
    statusBroadcaster
      .addStatusEventAndBroadcast({
        importId: status.importId,
        noteId: status.noteId,
        status: "COMPLETED",
        message: `Import ${status.importId} Completed!`,
        context: "import_complete",
        indentLevel: 0,
        metadata: {
          noteId: status.noteId,
          importId: status.importId,
        },
      })
      .then(() => {
        /* istanbul ignore next -- Difficult to test async success scenarios in unit tests */
        logger.log(
          `[TRACK_COMPLETION] Broadcasted completion for note ${noteId}`
        );
      })
      .catch((error) => {
        /* istanbul ignore next -- Difficult to test async error scenarios in unit tests */
        logger.log(
          `[TRACK_COMPLETION] Failed to broadcast completion: ${error}`
        );
      });
  }
}

/**
 * Get completion status for a note
 */
export function getNoteCompletionStatus(
  noteId: string
): NoteCompletionStatus | undefined {
  return noteCompletionStatus.get(noteId);
}

/**
 * Clean up completion tracking for a note
 */
export function cleanupNoteCompletion(noteId: string): void {
  noteCompletionStatus.delete(noteId);
}

/**
 * Manually mark instruction worker as completed for a note
 * This should be called when all instruction jobs for a note are finished
 */
export function markInstructionWorkerCompleted(
  noteId: string,
  logger: StructuredLogger,
  statusBroadcaster?: {
    addStatusEventAndBroadcast: (
      event: Record<string, unknown>
    ) => Promise<Record<string, unknown>>;
  }
): void {
  /* istanbul ignore next -- @preserve */
  markWorkerCompleted(noteId, "instruction", logger, statusBroadcaster);
}

/**
 * Manually mark ingredient worker as completed for a note
 * This should be called when all ingredient jobs for a note are finished
 */
export function markIngredientWorkerCompleted(
  noteId: string,
  logger: StructuredLogger,
  statusBroadcaster?: {
    addStatusEventAndBroadcast: (
      event: Record<string, unknown>
    ) => Promise<Record<string, unknown>>;
  }
): void {
  /* istanbul ignore next -- @preserve */
  markWorkerCompleted(noteId, "ingredient", logger, statusBroadcaster);
}

/**
 * Manually mark image worker as completed for a note
 * This should be called when all image jobs for a note are finished
 */
export function markImageWorkerCompleted(
  noteId: string,
  logger: StructuredLogger,
  statusBroadcaster?: {
    addStatusEventAndBroadcast: (
      event: Record<string, unknown>
    ) => Promise<Record<string, unknown>>;
  }
): void {
  markWorkerCompleted(noteId, "image", logger, statusBroadcaster);
}
