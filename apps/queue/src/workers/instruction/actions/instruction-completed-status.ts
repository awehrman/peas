import type {
  InstructionCompletedStatusData,
  InstructionCompletedStatusDeps,
} from "./types";

import { ActionName } from "../../../types";
import { BaseAction } from "../../core/base-action";
import { ActionContext } from "../../core/types";

/**
 * Action to broadcast the completion or progress status of instruction processing.
 * Handles status/emoji logic and event broadcasting for instruction completion.
 */
export class InstructionCompletedStatusAction extends BaseAction<
  InstructionCompletedStatusData,
  InstructionCompletedStatusDeps
> {
  name = ActionName.INSTRUCTION_COMPLETED_STATUS;

  /**
   * Executes the instruction completed status action.
   * Broadcasts status if tracking information is present.
   */
  async execute(
    data: InstructionCompletedStatusData,
    deps: InstructionCompletedStatusDeps,
    _context: ActionContext
  ): Promise<InstructionCompletedStatusData> {
    if (!this.hasTrackingInfo(data)) {
      return data;
    }
    const { status, emoji } = this.getStatusAndEmoji(data);
    await this.broadcastStatus(data, deps, status, emoji);
    return data;
  }

  /**
   * Checks if the data has the required tracking information.
   */
  private hasTrackingInfo(data: InstructionCompletedStatusData): boolean {
    return (
      !!data.importId &&
      typeof data.currentInstructionIndex === "number" &&
      typeof data.totalInstructions === "number"
    );
  }

  /**
   * Determines the status and emoji based on progress.
   */
  private getStatusAndEmoji(data: InstructionCompletedStatusData): {
    status: string;
    emoji: string;
  } {
    const isComplete = data.currentInstructionIndex === data.totalInstructions;
    return {
      status: isComplete ? "COMPLETED" : "PROCESSING",
      emoji: isComplete ? "✅" : "⏳",
    };
  }

  /**
   * Broadcasts the status event.
   */
  private async broadcastStatus(
    data: InstructionCompletedStatusData,
    deps: InstructionCompletedStatusDeps,
    status: string,
    emoji: string
  ) {
    await deps.addStatusEventAndBroadcast({
      importId: data.importId!,
      noteId: data.noteId,
      status,
      message: `${emoji} ${data.currentInstructionIndex}/${data.totalInstructions} instructions`,
      context: "parse_html_instructions",
      indentLevel: 2,
      metadata: {
        totalInstructions: data.totalInstructions,
        processedInstructions: data.currentInstructionIndex,
        instructionLineId: data.instructionLineId,
        parseStatus: data.parseStatus || "UNKNOWN",
        isComplete: data.currentInstructionIndex === data.totalInstructions,
      },
    });
  }
}
