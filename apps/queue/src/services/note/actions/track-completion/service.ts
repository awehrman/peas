import { updateNote } from "@peas/database";
import type { Prisma } from "@peas/database";

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
  // In-memory ingredient tracking
  totalIngredientLines: number;
  completedIngredientLines: Set<string>; // Track by "blockIndex:lineIndex"
}

// Track completion status by note ID
const noteCompletionStatus = new Map<string, NoteCompletionStatus>();

/**
 * Initialize completion tracking for a note
 */
export async function initializeNoteCompletion(
  noteId: string,
  importId: string,
  logger?: StructuredLogger
): Promise<void> {
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
    totalIngredientLines: 0,
    completedIngredientLines: new Set<string>(),
  });

  // Mark the note as processing when work starts
  try {
    await markNoteAsProcessing(noteId, logger);
  } catch (error) {
    // Don't fail initialization if status update fails
    if (logger) {
      logger.log(
        `[TRACK_COMPLETION] Failed to mark note as processing during initialization: ${error}`
      );
    }
  }
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
export async function markImageJobCompleted(
  noteId: string,
  logger: StructuredLogger,
  statusBroadcaster?: {
    addStatusEventAndBroadcast: (
      event: Record<string, unknown>
    ) => Promise<Record<string, unknown>>;
  }
): Promise<void> {
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
    await markWorkerCompleted(noteId, "image", logger, statusBroadcaster);
  } else if (status.totalImageJobs === 0) {
    // If there are no images, mark image worker as completed immediately
    logger.log(
      `[TRACK_COMPLETION] No images for note ${noteId}, marking image worker as completed`
    );
    await markWorkerCompleted(noteId, "image", logger, statusBroadcaster);
  }
}

/**
 * Mark a specific worker type as completed for a note
 */
export async function markWorkerCompleted(
  noteId: string,
  workerType: "note" | "instruction" | "ingredient" | "image",
  logger: StructuredLogger,
  statusBroadcaster?: {
    addStatusEventAndBroadcast: (
      event: Record<string, unknown>
    ) => Promise<Record<string, unknown>>;
  }
): Promise<void> {
  const status = noteCompletionStatus.get(noteId);
  if (!status) {
    logger.log(
      `[TRACK_COMPLETION] No completion status found for note: ${noteId}`
    );
    return;
  }

  // Mark the specific worker as completed
  logger.log(
    `[TRACK_COMPLETION] Marking ${workerType} worker as completed for note ${noteId}`
  );

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

  logger.log(
    `[TRACK_COMPLETION] Worker status for note ${noteId}: note=${status.noteWorkerCompleted}, instruction=${status.instructionWorkerCompleted}, ingredient=${status.ingredientWorkerCompleted}, image=${status.imageWorkerCompleted}`
  );

  // If all workers are completed, update note status and broadcast completion
  if (allCompleted) {
    try {
      // Update the note status to COMPLETED in the database
      await updateNote(status.noteId, {
        status: "COMPLETED",
      });

      logger.log(
        `[TRACK_COMPLETION] Updated note ${noteId} status to COMPLETED`
      );
    } catch (error) {
      logger.log(
        `[TRACK_COMPLETION] Failed to update note status to COMPLETED: ${error}`
      );
    }

    // Get note title for the completion message
    let noteTitle = "";
    try {
      const { getNoteWithIngredients } = await import("@peas/database");
      const note = await getNoteWithIngredients(status.noteId);
      if (note?.title) {
        noteTitle = note.title;
      }
    } catch (error) {
      logger.log(
        `[TRACK_COMPLETION] Failed to get note title for completion message: ${error}`
      );
    }

    // Broadcast the completion event
    if (statusBroadcaster) {
      const completionMessage = noteTitle
        ? `Finished importing "${noteTitle}"`
        : `Import ${status.importId} Completed!`;

      statusBroadcaster
        .addStatusEventAndBroadcast({
          importId: status.importId,
          noteId: status.noteId,
          status: "COMPLETED",
          message: completionMessage,
          context: "import_complete",
          indentLevel: 0,
          metadata: {
            noteId: status.noteId,
            importId: status.importId,
            noteTitle: noteTitle,
          },
        })
        .then(() => {
          /* istanbul ignore next -- @preserve */
          logger.log(
            `[TRACK_COMPLETION] Broadcasted completion for note ${noteId}`
          );
        })
        .catch((error) => {
          /* istanbul ignore next -- @preserve */
          logger.log(
            `[TRACK_COMPLETION] Failed to broadcast completion: ${error}`
          );
        });
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
 * Mark a note as processing in the database
 */
export async function markNoteAsProcessing(
  noteId: string,
  logger?: StructuredLogger
): Promise<void> {
  try {
    await updateNote(noteId, {
      status: "PROCESSING",
    });

    if (logger) {
      logger.log(
        `[TRACK_COMPLETION] Updated note ${noteId} status to PROCESSING`
      );
    }
  } catch (error) {
    /* istanbul ignore next -- @preserve */
    if (logger) {
      logger.log(
        `[TRACK_COMPLETION] Failed to update note status to PROCESSING: ${error}`
      );
    }
    throw error;
  }
}

/**
 * Mark a note as failed in the database
 */
export async function markNoteAsFailed(
  noteId: string,
  errorMessage: string,
  errorCode?:
    | "HTML_PARSE_ERROR"
    | "INGREDIENT_PARSE_ERROR"
    | "INSTRUCTION_PARSE_ERROR"
    | "QUEUE_JOB_FAILED"
    | "IMAGE_UPLOAD_FAILED"
    | "UNKNOWN_ERROR",
  errorDetails?: Prisma.InputJsonValue,
  logger?: StructuredLogger
): Promise<void> {
  try {
    await updateNote(noteId, {
      status: "FAILED",
      errorMessage,
      errorCode,
      errorDetails,
    });

    if (logger) {
      logger.log(
        `[TRACK_COMPLETION] Updated note ${noteId} status to FAILED: ${errorMessage}`
      );
    }
  } catch (error) {
    /* istanbul ignore next -- @preserve */
    if (logger) {
      logger.log(
        `[TRACK_COMPLETION] Failed to update note status to FAILED: ${error}`
      );
    }
    throw error;
  }
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
export async function markInstructionWorkerCompleted(
  noteId: string,
  logger: StructuredLogger,
  statusBroadcaster?: {
    addStatusEventAndBroadcast: (
      event: Record<string, unknown>
    ) => Promise<Record<string, unknown>>;
  }
): Promise<void> {
  /* istanbul ignore next -- @preserve */
  await markWorkerCompleted(noteId, "instruction", logger, statusBroadcaster);
}

/**
 * Manually mark ingredient worker as completed for a note
 * This should be called when all ingredient jobs for a note are finished
 */
export async function markIngredientWorkerCompleted(
  noteId: string,
  logger: StructuredLogger,
  statusBroadcaster?: {
    addStatusEventAndBroadcast: (
      event: Record<string, unknown>
    ) => Promise<Record<string, unknown>>;
  }
): Promise<void> {
  /* istanbul ignore next -- @preserve */
  await markWorkerCompleted(noteId, "ingredient", logger, statusBroadcaster);
}

/**
 * Manually mark image worker as completed for a note
 * This should be called when all image jobs for a note are finished
 */
export async function markImageWorkerCompleted(
  noteId: string,
  logger: StructuredLogger,
  statusBroadcaster?: {
    addStatusEventAndBroadcast: (
      event: Record<string, unknown>
    ) => Promise<Record<string, unknown>>;
  }
): Promise<void> {
  await markWorkerCompleted(noteId, "image", logger, statusBroadcaster);
}

/**
 * Set the total number of ingredient lines for a note
 */
export function setTotalIngredientLines(
  noteId: string,
  totalLines: number,
  logger: StructuredLogger
): void {
  const status = noteCompletionStatus.get(noteId);
  if (!status) {
    logger.log(
      `[TRACK_COMPLETION] No completion status found for note: ${noteId}`
    );
    return;
  }

  status.totalIngredientLines = totalLines;
  logger.log(
    `[TRACK_COMPLETION] Set total ingredient lines for note ${noteId}: ${totalLines}`
  );
}

/**
 * Mark an ingredient line as completed
 */
export function markIngredientLineCompleted(
  noteId: string,
  blockIndex: number,
  lineIndex: number,
  logger: StructuredLogger
): void {
  const status = noteCompletionStatus.get(noteId);
  if (!status) {
    logger.log(
      `[TRACK_COMPLETION] No completion status found for note: ${noteId}`
    );
    return;
  }

  const compositeKey = `${blockIndex}:${lineIndex}`;
  status.completedIngredientLines.add(compositeKey);
  logger.log(
    `[TRACK_COMPLETION] Marked ingredient line ${blockIndex}:${lineIndex} as completed for note ${noteId}. Progress: ${status.completedIngredientLines.size}/${status.totalIngredientLines}`
  );
}

/**
 * Get ingredient completion status from in-memory tracking
 */
export function getIngredientCompletionStatus(noteId: string): {
  completedIngredients: number;
  totalIngredients: number;
  progress: string;
  isComplete: boolean;
} {
  const status = noteCompletionStatus.get(noteId);
  if (!status) {
    return {
      completedIngredients: 0,
      totalIngredients: 0,
      progress: "0/0",
      isComplete: false,
    };
  }

  const completedIngredients = status.completedIngredientLines.size;
  const totalIngredients = status.totalIngredientLines;

  return {
    completedIngredients,
    totalIngredients,
    progress: `${completedIngredients}/${totalIngredients}`,
    isComplete: completedIngredients >= totalIngredients,
  };
}
