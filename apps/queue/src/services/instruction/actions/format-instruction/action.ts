import { formatInstruction } from "./service";

import { ActionName } from "../../../../types";
import { BaseAction } from "../../../../workers/core/base-action";
import { ActionContext } from "../../../../workers/core/types";
import type { InstructionJobData } from "../../../../workers/instruction/dependencies";
import type { InstructionWorkerDependencies } from "../../../../workers/instruction/dependencies";

export class FormatInstructionAction extends BaseAction<
  InstructionJobData,
  InstructionWorkerDependencies,
  InstructionJobData
> {
  /** The unique identifier for this action in the worker pipeline */
  name = ActionName.FORMAT_INSTRUCTION_LINE;

  /**
   * Validate input data before processing
   * @param data The job data to validate
   * @returns Error if validation fails, null if valid
   */
  validateInput(data: InstructionJobData): Error | null {
    if (!data.noteId) {
      return new Error("Note ID is required for instruction formatting");
    }
    if (!data.instructionReference) {
      return new Error("Instruction reference is required for formatting");
    }
    return null;
  }

  /**
   * Execute the action to format an instruction
   * @param data The job data containing the instruction
   * @param deps Dependencies required by the action
   * @param context Context information about the job
   * @returns Promise resolving to the updated job data
   */
  async execute(
    data: InstructionJobData,
    deps: InstructionWorkerDependencies,
    context: ActionContext
  ): Promise<InstructionJobData> {
    return this.executeServiceAction({
      data,
      deps,
      context,
      serviceCall: () => deps.services.formatInstruction(data),
      contextName: "format_instruction_line",
      suppressDefaultBroadcast: false,
      startMessage: `Formatting instruction line ${data.lineIndex}`,
      additionalBroadcasting: async () => {
        // Emit a per-line pre-save progress update (e.g., 0/x)
        try {
          if (deps.statusBroadcaster && data.importId && data.noteId) {
            const { getInstructionCompletionStatus } = await import(
              "@peas/database"
            );
            const completionStatus = await getInstructionCompletionStatus(
              data.noteId
            );

            // Debug logging to trace pre-save broadcast values
            if (deps.logger && typeof deps.logger.log === "function") {
              deps.logger.log(
                `[FORMAT_INSTRUCTION_LINE] Pre-save progress (before save): ${completionStatus.completedInstructions}/${completionStatus.totalInstructions} (noteId=${data.noteId}, importId=${data.importId}, lineIndex=${data.lineIndex})`
              );
            }

            await deps.statusBroadcaster.addStatusEventAndBroadcast({
              importId: data.importId,
              noteId: data.noteId,
              status: "PROCESSING",
              message: `Processing ${completionStatus.completedInstructions}/${completionStatus.totalInstructions} instructions`,
              context: "instruction_processing",
              currentCount: completionStatus.completedInstructions,
              totalCount: completionStatus.totalInstructions,
              indentLevel: 1,
              metadata: {
                totalInstructions: completionStatus.totalInstructions,
                completedInstructions: completionStatus.completedInstructions,
                lineIndex: data.lineIndex,
              },
            });
          }
        } catch {
          // Ignore broadcast errors here; save step will still emit progress
        }
      },
    });
  }
}

export { formatInstruction };
