import { processSource } from "./service";

import { ActionName } from "../../../../types";
import type { NotePipelineData } from "../../../../types/notes";
import type { NoteWorkerDependencies } from "../../../../types/notes";
import { BaseAction } from "../../../../workers/core/base-action";
import { ActionContext } from "../../../../workers/core/types";

export class ProcessSourceAction extends BaseAction<
  NotePipelineData,
  NoteWorkerDependencies,
  NotePipelineData
> {
  /** The unique identifier for this action in the worker pipeline */
  name = ActionName.PROCESS_SOURCE;

  /**
   * Validate input data before processing
   * @param data The pipeline data to validate
   * @returns Error if validation fails, null if valid
   */
  validateInput(data: NotePipelineData): Error | null {
    if (!data.noteId) {
      return new Error("Note ID is required for source processing");
    }
    return null;
  }

  /**
   * Execute the action to process source
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
    // Validate input before processing
    const validationError = this.validateInput(data);
    /* istanbul ignore next -- @preserve */
    if (validationError) {
      throw validationError;
    }

    return this.executeServiceAction({
      data,
      deps,
      context,
      serviceCall: () => processSource(data, deps.logger),
      contextName: "PROCESS_SOURCE",
      startMessage: `Processing source for note...`,
      completionMessage: `Successfully processed source for note!`,
    });
  }
}

export { processSource };
