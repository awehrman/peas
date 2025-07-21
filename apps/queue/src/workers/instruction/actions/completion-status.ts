import type { CompletionStatusInput } from "./types";

import { ActionName } from "../../../types";
import { BaseAction } from "../../core/base-action";
import { ActionContext } from "../../core/types";
import type { InstructionWorkerDependencies } from "../types";

// Track which notes have already been marked as complete to prevent multiple broadcasts
const completedNotes = new Set<string>();

/**
 * Action to check and broadcast the completion status of a note's instruction jobs.
 * Handles duplicate prevention, logging, and metadata enrichment.
 */
export class CompletionStatusAction extends BaseAction<
  CompletionStatusInput,
  InstructionWorkerDependencies
> {
  name = ActionName.COMPLETION_STATUS ?? "completion_status";

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
    input: CompletionStatusInput,
    deps: InstructionWorkerDependencies,
    _context: ActionContext
  ): Promise<CompletionStatusInput> {
    this.logReceivedInput(input, deps);
    if (!this.hasRequiredFields(input, deps)) return input;
    if (this.isAlreadyCompleted(input, deps)) return input;
    const completionStatus = await this.checkCompletion(input, deps);
    if (!completionStatus) return input;
    if (completionStatus.isComplete) {
      await this.handleComplete(input, deps, completionStatus);
    } else {
      this.logNotComplete(input, deps, completionStatus);
    }
    return input;
  }

  /**
   * Logs the received input for debugging.
   */
  private logReceivedInput(
    input: CompletionStatusInput,
    deps: InstructionWorkerDependencies
  ) {
    deps.logger?.log(
      `[COMPLETION_STATUS] Received input: noteId=${input.noteId}, importId=${input.importId}, currentInstructionIndex=${input.currentInstructionIndex}, totalInstructions=${input.totalInstructions}`
    );
  }

  /**
   * Checks if required fields are present.
   */
  private hasRequiredFields(
    input: CompletionStatusInput,
    deps: InstructionWorkerDependencies
  ): boolean {
    if (!input.noteId || !input.importId) {
      deps.logger?.log(
        `[COMPLETION_STATUS] Skipping completion check - missing noteId or importId`
      );
      return false;
    }
    return true;
  }

  /**
   * Checks if the note has already been marked as complete.
   */
  private isAlreadyCompleted(
    input: CompletionStatusInput,
    deps: InstructionWorkerDependencies
  ): boolean {
    if (completedNotes.has(input.noteId!)) {
      deps.logger?.log(
        `[COMPLETION_STATUS] Note ${input.noteId} already marked as complete, skipping duplicate broadcast`
      );
      return true;
    }
    return false;
  }

  /**
   * Checks the completion status from the database.
   */
  private async checkCompletion(
    input: CompletionStatusInput,
    deps: InstructionWorkerDependencies
  ) {
    if (!deps.database?.checkNoteCompletion) {
      deps.logger?.log(
        `[COMPLETION_STATUS] Database checkNoteCompletion method not available`
      );
      return null;
    }
    try {
      return await deps.database.checkNoteCompletion(input.noteId!);
    } catch (error) {
      deps.logger?.log(
        `[COMPLETION_STATUS] Error checking completion status for note ${input.noteId}: ${error}`
      );
      return null;
    }
  }

  /**
   * Handles broadcasting when the note is complete.
   */
  private async handleComplete(
    input: CompletionStatusInput,
    deps: InstructionWorkerDependencies,
    completionStatus: {
      isComplete: boolean;
      completedJobs: number;
      totalJobs: number;
    }
  ) {
    completedNotes.add(input.noteId!);
    let noteTitle: string | null = null;
    if (deps.database?.getNoteTitle) {
      try {
        noteTitle = await deps.database.getNoteTitle(input.noteId!);
      } catch (error) {
        deps.logger?.log(
          `[COMPLETION_STATUS] Error getting note title: ${error}`
        );
      }
    }
    await deps.addStatusEventAndBroadcast({
      importId: input.importId!,
      noteId: input.noteId!,
      status: "COMPLETED",
      message: "Import completed successfully",
      context: "import_complete",
      indentLevel: 0,
      metadata: {
        completedJobs: completionStatus.completedJobs,
        totalJobs: completionStatus.totalJobs,
        noteTitle,
      },
    });
    deps.logger?.log(
      `[COMPLETION_STATUS] Successfully broadcast completion for note ${input.noteId}`
    );
  }

  /**
   * Logs when the note is not yet complete.
   */
  private logNotComplete(
    input: CompletionStatusInput,
    deps: InstructionWorkerDependencies,
    completionStatus: {
      isComplete: boolean;
      completedJobs: number;
      totalJobs: number;
    }
  ) {
    deps.logger?.log(
      `[COMPLETION_STATUS] Note ${input.noteId} not yet complete: ${completionStatus.completedJobs}/${completionStatus.totalJobs} jobs finished.`
    );
  }
}
