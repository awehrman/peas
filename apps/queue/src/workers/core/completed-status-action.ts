import { BaseAction } from "./base-action";
import type { ActionContext } from "./types";

import type { LogLevel, StatusEvent } from "../types";

const completedNotes = new Set<string>();

export interface CompletionStatusInputBase {
  noteId?: string;
  importId?: string;
  currentIngredientIndex?: number;
  totalIngredients?: number;
  // ...other shared fields
}

export interface CompletionStatusDepsBase {
  logger?: { log: (msg: string, level?: LogLevel) => void };
  database?: {
    checkNoteCompletion?: (noteId: string) => Promise<{
      isComplete: boolean;
      completedJobs: number;
      totalJobs: number;
    }>;
    getNoteTitle?: (noteId: string) => Promise<string | null>;
  };
  addStatusEventAndBroadcast?: (args: StatusEvent) => Promise<unknown>;
}

/**
 * Generic action to check and broadcast the completion status of a note's jobs.
 * Prevents duplicate broadcasts, logs progress, and enriches metadata.
 */
export class CompletionStatusAction<
  Input extends CompletionStatusInputBase,
  Deps extends CompletionStatusDepsBase,
> extends BaseAction<Input, Deps> {
  name = "completion_status";

  /**
   * Static method to clear completed notes for testing.
   */
  static clearCompletedNotes(): void {
    completedNotes.clear();
  }

  /**
   * Executes the completion status check and broadcast.
   * Logs progress and prevents duplicate broadcasts.
   */
  async execute(
    input: Input,
    deps: Deps,
    _context: ActionContext
  ): Promise<Input> {
    const { noteId, importId, currentIngredientIndex, totalIngredients } =
      input;

    deps.logger?.log(
      `[COMPLETION_STATUS] Received input: noteId=${noteId}, importId=${importId}, currentIngredientIndex=${currentIngredientIndex}, totalIngredients=${totalIngredients}`
    );

    if (!noteId || !importId) {
      deps.logger?.log(
        `[COMPLETION_STATUS] Skipping completion check - missing noteId or importId`
      );
      return input;
    }

    try {
      // Check if this note has already been marked as complete
      if (completedNotes.has(noteId)) {
        deps.logger?.log(
          `[COMPLETION_STATUS] Note ${noteId} already marked as complete, skipping duplicate broadcast`
        );
        return input;
      }

      // Check if all jobs for this note are complete
      if (!deps.database?.checkNoteCompletion) {
        deps.logger?.log(
          `[COMPLETION_STATUS] Database checkNoteCompletion method not available`
        );
        return input;
      }

      const completionStatus = await deps.database.checkNoteCompletion(noteId);

      if (completionStatus.isComplete) {
        deps.logger?.log(
          `[COMPLETION_STATUS] Note ${noteId} is complete: ${completionStatus.completedJobs}/${completionStatus.totalJobs} jobs finished. Broadcasting completion.`
        );

        // Mark this note as completed to prevent duplicate broadcasts
        completedNotes.add(noteId);

        // Get note title for metadata
        let noteTitle: string | null = null;
        if (deps.database?.getNoteTitle) {
          try {
            noteTitle = await deps.database.getNoteTitle(noteId);
          } catch (error) {
            deps.logger?.log(
              `[COMPLETION_STATUS] Error getting note title: ${error}`
            );
          }
        }

        // Broadcast completion status
        if (deps.addStatusEventAndBroadcast) {
          await deps.addStatusEventAndBroadcast({
            importId,
            noteId,
            status: "COMPLETED",
            message: "Import completed successfully",
            context: "import_complete",
            indentLevel: 0,
            metadata: {
              completedJobs: completionStatus.completedJobs,
              totalJobs: completionStatus.totalJobs,
              noteTitle, // Include note title in metadata
            },
          });
        }

        deps.logger?.log(
          `[COMPLETION_STATUS] Successfully broadcast completion for note ${noteId}`
        );
      } else {
        deps.logger?.log(
          `[COMPLETION_STATUS] Note ${noteId} not yet complete: ${completionStatus.completedJobs}/${completionStatus.totalJobs} jobs finished.`
        );
      }
    } catch (error) {
      deps.logger?.log(
        `[COMPLETION_STATUS] Error checking completion status for note ${noteId}: ${error}`
      );
    }

    return input;
  }
}
