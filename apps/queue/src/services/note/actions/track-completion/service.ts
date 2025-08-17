import { updateNote, updateParsingErrorCount } from "@peas/database";
import type { Prisma } from "@peas/database";

import type { StructuredLogger } from "../../../../types";
import { CleanupService } from "../../../cleanup/cleanup-service";

export interface NoteCompletionStatus {
  noteId: string;
  importId: string;
  htmlFileName?: string; // Store the original HTML filename
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
  htmlFileName?: string,
  logger?: StructuredLogger
): Promise<void> {
  noteCompletionStatus.set(noteId, {
    noteId,
    importId,
    htmlFileName,
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
    /* istanbul ignore next -- @preserve */
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
  let status = noteCompletionStatus.get(noteId);
  if (!status) {
    logger.log(
      `[TRACK_COMPLETION] No completion status found for note: ${noteId}, creating new status`
    );
    status = {
      noteId,
      importId: "", // Will be set later
      noteWorkerCompleted: false,
      instructionWorkerCompleted: false,
      ingredientWorkerCompleted: false,
      imageWorkerCompleted: false,
      allCompleted: false,
      totalImageJobs: 0,
      completedImageJobs: 0,
      totalIngredientLines: 0,
      completedIngredientLines: new Set(),
    };
    noteCompletionStatus.set(noteId, status);
  }

  status.totalImageJobs = totalJobs;
  status.completedImageJobs = 0; // Reset completed count when setting total
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
      `[TRACK_COMPLETION] ❌ No completion status found for note: ${noteId}`
    );
    return;
  }

  status.completedImageJobs++;
  logger.log(
    `[TRACK_COMPLETION] ✅ Image job completed for note ${noteId}: ${status.completedImageJobs}/${status.totalImageJobs}`
  );
  logger.log(`[TRACK_COMPLETION] ImportId: ${status.importId}`);

  // Only broadcast progress updates for significant milestones or when all images are done
  // This reduces noise and prevents UI resets
  const shouldBroadcast =
    statusBroadcaster &&
    status.totalImageJobs > 0 &&
    (status.completedImageJobs === status.totalImageJobs || // All done
      status.completedImageJobs %
        Math.max(1, Math.floor(status.totalImageJobs / 4)) ===
        0); // Every 25% milestone

  if (shouldBroadcast) {
    try {
      const isComplete = status.completedImageJobs >= status.totalImageJobs;
      logger.log(
        `[TRACK_COMPLETION] Broadcasting image progress update: ${status.completedImageJobs}/${status.totalImageJobs}${isComplete ? " (COMPLETE)" : ""}`
      );
      await statusBroadcaster.addStatusEventAndBroadcast({
        importId: status.importId,
        noteId: status.noteId,
        status: isComplete ? "COMPLETED" : "PROCESSING",
        message: isComplete
          ? `All ${status.totalImageJobs} images processed`
          : `Processing ${status.completedImageJobs}/${status.totalImageJobs} images`,
        context: "image_processing",
        currentCount: status.completedImageJobs,
        totalCount: status.totalImageJobs,
        indentLevel: 1,
        metadata: {
          totalImages: status.totalImageJobs,
          completedImages: status.completedImageJobs,
        },
      });
      logger.log(
        `[TRACK_COMPLETION] ✅ Broadcasted image progress update: ${status.completedImageJobs}/${status.totalImageJobs}`
      );
    } catch (broadcastError) {
      logger.log(
        `[TRACK_COMPLETION] ❌ Failed to broadcast image progress: ${broadcastError}`
      );
    }
  }

  // Check if all image jobs are completed
  /* istanbul ignore next -- @preserve */
  if (
    status.completedImageJobs >= status.totalImageJobs &&
    status.totalImageJobs > 0
  ) {
    logger.log(
      `[TRACK_COMPLETION] 🎉 All image jobs completed for note ${noteId}, marking image worker as completed`
    );
    await markWorkerCompleted(noteId, "image", logger, statusBroadcaster);
    /* istanbul ignore next -- @preserve */
  } else if (status.totalImageJobs === 0) {
    // If there are no images, mark image worker as completed immediately
    /* istanbul ignore next -- @preserve */
    logger.log(
      `[TRACK_COMPLETION] No images for note ${noteId}, marking image worker as completed`
    );
    /* istanbul ignore next -- @preserve */
    await markWorkerCompleted(noteId, "image", logger, statusBroadcaster);
  } else {
    logger.log(
      `[TRACK_COMPLETION] Image jobs still in progress: ${status.completedImageJobs}/${status.totalImageJobs}`
    );
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
      `[TRACK_COMPLETION] ❌ No completion status found for note: ${noteId}`
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

  // Only broadcast completion when ALL workers are completed
  // This prevents intermediate status updates that cause UI resets
  if (allCompleted) {
    try {
      // Update the note status in the database
      await updateNote(noteId, {
        status: "COMPLETED",
      });

      // Update the parsing error count based on actual parsing errors
      try {
        await updateParsingErrorCount(noteId);
        logger.log(
          `[TRACK_COMPLETION] ✅ Updated parsing error count for note: ${noteId}`
        );
      } catch (error) {
        logger.log(
          `[TRACK_COMPLETION] ⚠️ Failed to update parsing error count for note ${noteId}: ${error}`
        );
        // Don't fail the main completion if parsing error count update fails
      }

      // Broadcast final completion event only
      if (statusBroadcaster && status.importId) {
        await statusBroadcaster.addStatusEventAndBroadcast({
          importId: status.importId,
          noteId: status.noteId,
          status: "COMPLETED",
          message: "Note processing completed successfully",
          context: "note_completion",
          metadata: {
            noteId: status.noteId,
            htmlFileName: status.htmlFileName,
            totalImageJobs: status.totalImageJobs,
            completedImageJobs: status.completedImageJobs,
            totalIngredientLines: status.totalIngredientLines,
            completedIngredientLines: status.completedIngredientLines.size,
          },
        });
      }

      // Clean up the completion status from memory
      noteCompletionStatus.delete(noteId);

      // Clean up the import directory
      if (status.importId) {
        try {
          const cleanupService = new CleanupService(logger);
          await cleanupService.cleanupImportDirectory(status.importId);
        } catch (cleanupError) {
          logger.log(
            `[TRACK_COMPLETION] ⚠️ Failed to cleanup import directory for ${status.importId}: ${cleanupError}`
          );
          // Don't fail the main completion if cleanup fails
        }
      }
    } catch (error) {
      logger.log(
        `[TRACK_COMPLETION] ❌ Failed to update note status or broadcast completion: ${error}`
      );
      logger.log(`[TRACK_COMPLETION] Error details: ${error}`);
    }
  }
  // Note: We intentionally don't broadcast intermediate worker completions
  // to prevent UI status resets and confusion
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
  } catch (error) {
    /* istanbul ignore next -- @preserve */
    if (logger) {
      logger.log(
        `[TRACK_COMPLETION] Failed to update note status to PROCESSING: ${error}`
      );
    }
    /* istanbul ignore next -- @preserve */
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

    // Clean up the completion status from memory
    const status = noteCompletionStatus.get(noteId);
    if (status) {
      noteCompletionStatus.delete(noteId);

      // Clean up the import directory even for failed notes
      if (status.importId && logger) {
        try {
          const cleanupService = new CleanupService(logger);
          await cleanupService.cleanupImportDirectory(status.importId);
        } catch (cleanupError) {
          logger.log(
            `[TRACK_COMPLETION] ⚠️ Failed to cleanup import directory for failed note ${status.importId}: ${cleanupError}`
          );
          // Don't fail the main error handling if cleanup fails
        }
      }
    }
  } catch (error) {
    /* istanbul ignore next -- @preserve */
    if (logger) {
      logger.log(
        `[TRACK_COMPLETION] Failed to update note status to FAILED: ${error}`
      );
    }
    /* istanbul ignore next -- @preserve */
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
