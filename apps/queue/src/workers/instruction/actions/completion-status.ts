import { BaseAction } from "../../core/base-action";
import { ActionContext } from "../../core/types";
import type { InstructionWorkerDependencies } from "../types";
import { SaveInstructionLineOutput } from "./save-instruction-line";

export interface CompletionStatusInput extends SaveInstructionLineOutput {
  // Additional fields for completion tracking
  importId?: string;
  currentInstructionIndex?: number;
  totalInstructions?: number;
}

// Track which notes have already been marked as complete to prevent multiple broadcasts
const completedNotes = new Set<string>();

export class CompletionStatusAction extends BaseAction<
  CompletionStatusInput,
  InstructionWorkerDependencies
> {
  name = "completion_status";

  // Static method to clear completed notes for testing
  static clearCompletedNotes(): void {
    completedNotes.clear();
  }

  async execute(
    input: CompletionStatusInput,
    deps: InstructionWorkerDependencies,
    _context: ActionContext
  ): Promise<CompletionStatusInput> {
    const { noteId, importId } = input;

    // Debug logging to see what we're receiving
    deps.logger?.log(
      `[COMPLETION_STATUS] Received input: noteId=${noteId}, importId=${importId}, currentInstructionIndex=${input.currentInstructionIndex}, totalInstructions=${input.totalInstructions}`
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
