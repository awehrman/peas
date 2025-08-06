import type { StructuredLogger } from "../../../../types";

export interface NoteCompletionStatus {
  noteId: string;
  importId: string;
  noteWorkerCompleted: boolean;
  instructionWorkerCompleted: boolean;
  ingredientWorkerCompleted: boolean;
  imageWorkerCompleted: boolean;
  allCompleted: boolean;
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
  });
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
    try {
      statusBroadcaster.addStatusEventAndBroadcast({
        importId: status.importId,
        noteId: status.noteId,
        status: "COMPLETED",
        message: `Import ${status.importId} Completed!`,
        context: "note_completion",
        indentLevel: 0,
        metadata: {
          noteId: status.noteId,
          importId: status.importId,
        },
      });
      logger.log(
        `[TRACK_COMPLETION] Broadcasted completion for note ${noteId}`
      );
    } catch (error) {
      logger.log(`[TRACK_COMPLETION] Failed to broadcast completion: ${error}`);
    }
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
