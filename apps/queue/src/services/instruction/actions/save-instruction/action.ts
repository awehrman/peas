import { saveInstruction } from "./service";

import { ActionName } from "../../../../types";
import { BaseAction } from "../../../../workers/core/base-action";
import { ActionContext } from "../../../../workers/core/types";
import type { InstructionJobData } from "../../../../workers/instruction/dependencies";
import type { InstructionWorkerDependencies } from "../../../../workers/instruction/dependencies";

export class SaveInstructionAction extends BaseAction<
  InstructionJobData,
  InstructionWorkerDependencies,
  InstructionJobData
> {
  /** The unique identifier for this action in the worker pipeline */
  name = ActionName.SAVE_INSTRUCTION_LINE;

  /**
   * Validate input data before processing
   * @param data The job data to validate
   * @returns Error if validation fails, null if valid
   */
  validateInput(data: InstructionJobData): Error | null {
    if (!data.noteId) {
      return new Error("Note ID is required for instruction saving");
    }
    if (!data.instructionReference) {
      return new Error("Instruction reference is required for saving");
    }
    return null;
  }

  /**
   * Execute the action to save an instruction
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
      serviceCall: () => deps.services.saveInstruction(data),
      contextName: "SAVE_INSTRUCTION_LINE",
      suppressDefaultBroadcast: true,
    });
  }
}

export { saveInstruction };
