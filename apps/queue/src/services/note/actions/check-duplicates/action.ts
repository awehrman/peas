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
    _context: ActionContext
  ): Promise<NotePipelineData> {
    // Validate input before processing
    const validationError = this.validateInput(data);
    if (validationError) {
      throw validationError;
    }

    // Call the service directly to get both data and duplicate status
    const serviceResult = await checkForDuplicates(data, deps.logger);

    // Send start message
    if (deps.statusBroadcaster) {
      await deps.statusBroadcaster.addStatusEventAndBroadcast({
        importId: data.importId,
        status: "PROCESSING",
        message: "Checking for duplicate notes...",
        context: "CHECK_DUPLICATES",
        noteId: data.noteId,
        metadata: undefined,
      });

      // Send appropriate completion message based on duplicate status
      const completionMessage = serviceResult.hasDuplicates
        ? "Duplicate note identified!"
        : "Verified no duplicates!";

      await deps.statusBroadcaster.addStatusEventAndBroadcast({
        importId: data.importId,
        status: "COMPLETED",
        message: completionMessage,
        context: "CHECK_DUPLICATES",
        noteId: data.noteId,
        metadata: {
          duplicateCount: serviceResult.hasDuplicates ? 1 : 0,
        },
      });
    }

    return serviceResult.data;
  }
}
