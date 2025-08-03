import { checkForDuplicates } from "./service";

import { ActionName } from "../../../../types";
import type { NotePipelineData } from "../../../../types/notes";
import type { NoteWorkerDependencies } from "../../../../types/notes";
import { BaseAction } from "../../../../workers/core/base-action";
import type { ActionContext } from "../../../../workers/core/types";

export class CheckDuplicatesAction extends BaseAction<
  NotePipelineData,
  NoteWorkerDependencies,
  NotePipelineData
> {
  name = ActionName.CHECK_DUPLICATES;

  validateInput(data: NotePipelineData): Error | null {
    if (!data.noteId) {
      return new Error("Note ID is required for duplicate checking");
    }
    return null;
  }

  async execute(
    data: NotePipelineData,
    deps: NoteWorkerDependencies,
    context: ActionContext
  ): Promise<NotePipelineData> {
    // Validate input before processing
    const validationError = this.validateInput(data);
    if (validationError) {
      throw validationError;
    }

    return this.executeServiceAction({
      data,
      deps,
      context,
      serviceCall: () => checkForDuplicates(data, deps.logger),
      contextName: "CHECK_DUPLICATES",
      startMessage: "Checking for duplicate recipes...",
      completionMessage: "Duplicate check completed",
    });
  }
}
