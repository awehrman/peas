import { processInstructions } from "./service";

import { ActionName } from "../../../../types";
import type { NotePipelineData } from "../../../../types/notes";
import type { NoteWorkerDependencies } from "../../../../types/notes";
import { BaseAction } from "../../../../workers/core/base-action";
import { ActionContext } from "../../../../workers/core/types";

export class ScheduleInstructionsAction extends BaseAction<
  NotePipelineData,
  NoteWorkerDependencies,
  NotePipelineData
> {
  /** The unique identifier for this action in the worker pipeline */
  name = ActionName.SCHEDULE_INSTRUCTION_LINES;

  /**
   * Validate input data before scheduling instructions
   * @param data The pipeline data to validate
   * @returns Error if validation fails, null if valid
   */
  validateInput(data: NotePipelineData): Error | null {
    if (!data.noteId) {
      return new Error("Note ID is required for scheduling instructions");
    }
    return null;
  }

  /**
   * Execute the action to schedule instruction processing jobs
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
      serviceCall: () => processInstructions(data, deps.logger, deps.queues),
      contextName: "SCHEDULE_INSTRUCTIONS",
      suppressDefaultBroadcast: true,
      // startMessage: `Starting to process instructions for note: ${data.noteId}`,
      // Completion handled via per-instruction progress events; no final broadcast
      additionalBroadcasting: async () => {
        /* istanbul ignore next -- @preserve */
      },
    });
  }
}

export { processInstructions };
