import type {
  UpdateInstructionCountData,
  UpdateInstructionCountDeps,
} from "./types";

import type { NoteStatus } from "@peas/database";

import { ActionName } from "../../../types";
import { BaseAction } from "../../core/base-action";
import { ActionContext } from "../../core/types";

const STATUS = { COMPLETE: "COMPLETED", PROCESS: "PROCESSING" } as const;
const EMOJI = { COMPLETE: "✅", PROCESS: "⏳" } as const;

/**
 * Action to update the instruction count and broadcast status for instruction jobs.
 * Handles incrementing the completion tracker, status/emoji logic, and broadcasting.
 */
export class UpdateInstructionCountAction extends BaseAction<
  UpdateInstructionCountData,
  UpdateInstructionCountDeps
> {
  name = ActionName.UPDATE_INSTRUCTION_COUNT;

  /**
   * Executes the update instruction count action.
   * Increments the completion tracker and broadcasts status.
   */
  async execute(
    data: UpdateInstructionCountData,
    deps: UpdateInstructionCountDeps,
    _context: ActionContext
  ): Promise<UpdateInstructionCountData> {
    const isComplete = this.isComplete(data);
    const status = this.getStatus(isComplete);
    const emoji = this.getEmoji(isComplete);

    if (!data.noteId) {
      await this.broadcastStatus(data, deps, status, emoji, isComplete);
      return data;
    }

    await this.incrementAndLogCompletionTracker(
      data.noteId,
      data.currentInstructionIndex,
      data.totalInstructions,
      deps
    );
    await this.broadcastStatus(data, deps, status, emoji, isComplete);
    return data;
  }

  /**
   * Determines if the instruction is complete.
   */
  private isComplete(data: UpdateInstructionCountData): boolean {
    return data.currentInstructionIndex === data.totalInstructions;
  }

  /**
   * Gets the status string based on completion.
   */
  private getStatus(isComplete: boolean): NoteStatus {
    return isComplete ? STATUS.COMPLETE : STATUS.PROCESS;
  }

  /**
   * Gets the emoji string based on completion.
   */
  private getEmoji(isComplete: boolean): string {
    return isComplete ? EMOJI.COMPLETE : EMOJI.PROCESS;
  }

  /**
   * Increments the note completion tracker and logs the result.
   */
  private async incrementAndLogCompletionTracker(
    noteId: string,
    currentInstructionIndex: number,
    totalInstructions: number,
    deps: UpdateInstructionCountDeps
  ) {
    try {
      if (deps.database.incrementNoteCompletionTracker) {
        await deps.database.incrementNoteCompletionTracker(noteId);
        deps.logger?.log(
          `[UPDATE_INSTRUCTION_COUNT] Incremented completion tracker for note ${noteId}: instruction ${currentInstructionIndex}/${totalInstructions} completed`
        );
      }
    } catch (error) {
      deps.logger?.log(
        `[UPDATE_INSTRUCTION_COUNT] Failed to update completion tracker for note ${noteId}: ${error}`,
        "error"
      );
    }
  }

  /**
   * Broadcasts the status event for the instruction count update.
   */
  private async broadcastStatus(
    data: UpdateInstructionCountData,
    deps: UpdateInstructionCountDeps,
    status: NoteStatus,
    emoji: string,
    isComplete: boolean
  ) {
    try {
      await deps.addStatusEventAndBroadcast?.({
        importId: data.importId,
        noteId: data.noteId,
        status,
        message: `${emoji} ${data.currentInstructionIndex}/${data.totalInstructions} instructions`,
        context: "parse_html_instructions",
        indentLevel: 2,
        metadata: {
          totalInstructions: data.totalInstructions,
          processedInstructions: data.currentInstructionIndex,
          isComplete,
        },
      });
    } catch (err) {
      deps.logger?.log(
        `[UPDATE_INSTRUCTION_COUNT] Failed to broadcast status: ${err}`,
        "error"
      );
    }
  }
}
