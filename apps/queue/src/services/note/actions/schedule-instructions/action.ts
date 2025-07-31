import { processInstructions } from "./service";

import { ActionName } from "../../../../types";
import type { NotePipelineData } from "../../../../types/notes";
import type { NoteWorkerDependencies } from "../../../../types/notes";
import { BaseAction } from "../../../../workers/core/base-action";
import { ActionContext } from "../../../../workers/core/types";

export class ProcessInstructionsAction extends BaseAction<
  NotePipelineData,
  NoteWorkerDependencies,
  NotePipelineData
> {
  /** The unique identifier for this action in the worker pipeline */
  name = ActionName.PROCESS_INSTRUCTION_LINES;

  /**
   * Validate input data before processing
   * @param data The pipeline data to validate
   * @returns Error if validation fails, null if valid
   */
  validateInput(data: NotePipelineData): Error | null {
    if (!data.noteId) {
      return new Error("Note ID is required for instruction processing");
    }
    return null;
  }

  /**
   * Execute the action to process instructions
   * @param data The pipeline data containing the note
   * @param deps Dependencies required by the action
   * @param context Context information about the job
   * @returns Promise resolving to the updated pipeline data
   */
  async execute(
    data: NotePipelineData,
    deps: NoteWorkerDependencies,
    context: ActionContext
  ): Promise<NotePipelineData> {
    return this.executeServiceAction({
      data,
      deps,
      context,
      serviceCall: () => processInstructions(data, deps.logger),
      contextName: "PROCESS_INSTRUCTION_LINES",
      startMessage: `Starting to process instructions for note: ${data.noteId}`,
      completionMessage: `Successfully processed instructions for note: ${data.noteId}`,
    });
  }
}

export { processInstructions };
