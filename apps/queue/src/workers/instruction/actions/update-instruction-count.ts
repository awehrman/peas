import { BaseAction } from "../../core/base-action";
import { ActionContext } from "../../core/types";
import type { BaseWorkerDependencies } from "../../types";
import type { IDatabaseService } from "../../../services";

export interface UpdateInstructionCountDeps extends BaseWorkerDependencies {
  database: IDatabaseService;
}

export interface UpdateInstructionCountData {
  importId: string;
  noteId?: string;
  currentInstructionIndex: number;
  totalInstructions: number;
}

export class UpdateInstructionCountAction extends BaseAction<
  UpdateInstructionCountData,
  UpdateInstructionCountDeps
> {
  name = "update_instruction_count";

  async execute(
    data: UpdateInstructionCountData,
    deps: UpdateInstructionCountDeps,
    _context: ActionContext
  ): Promise<UpdateInstructionCountData> {
    // Determine if this is the final instruction
    const isComplete = data.currentInstructionIndex === data.totalInstructions;
    const status = isComplete ? "COMPLETED" : "PROCESSING";
    const emoji = isComplete ? "✅" : "⏳";

    // Update job completion tracker for each instruction job completion
    if (data.noteId) {
      try {
        if (deps.database.updateNoteCompletionTracker) {
          // Update with the current number of completed jobs
          await deps.database.updateNoteCompletionTracker(
            data.noteId,
            data.currentInstructionIndex
          );
          deps.logger?.log(
            `[UPDATE_INSTRUCTION_COUNT] Updated completion tracker for note ${data.noteId}: ${data.currentInstructionIndex}/${data.totalInstructions} instruction jobs completed`
          );
        }
      } catch (error) {
        deps.logger?.log(
          `[UPDATE_INSTRUCTION_COUNT] Failed to update completion tracker for note ${data.noteId}: ${error}`,
          "error"
        );
      }
    }

    await deps.addStatusEventAndBroadcast({
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

    return data;
  }
}
