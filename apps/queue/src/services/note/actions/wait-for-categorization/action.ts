import { waitForCategorization } from "./service";

import { ActionName } from "../../../../types";
import type {
  NotePipelineData,
  NoteWorkerDependencies,
} from "../../../../types/notes";
import { BaseAction } from "../../../../workers/core/base-action";
import type { ActionContext } from "../../../../workers/core/types";

export class WaitForCategorizationAction extends BaseAction<
  NotePipelineData,
  NoteWorkerDependencies,
  NotePipelineData
> {
  get name(): ActionName {
    return ActionName.WAIT_FOR_CATEGORIZATION;
  }

  validateInput(_data: NotePipelineData): Error | null {
    // Note: noteId is optional for this action, so we don't validate it
    /* istanbul ignore next -- @preserve */
    return null;
  }

  async execute(
    data: NotePipelineData,
    deps: NoteWorkerDependencies,
    _context: ActionContext
  ): Promise<NotePipelineData> {
    // Validate input before processing
    const validationError = this.validateInput(data);
    /* istanbul ignore next -- @preserve */
    if (validationError) {
      /* istanbul ignore next -- @preserve */
      throw validationError;
    }

    // Send start message
    if (deps.statusBroadcaster) {
      await deps.statusBroadcaster.addStatusEventAndBroadcast({
        importId: data.importId,
        status: "PROCESSING",
        message: "Waiting for categorization to complete...",
        context: "wait_for_categorization",
        noteId: data.noteId,
        indentLevel: 1,
      });
    }

    // Call the service to wait for categorization
    const result = await waitForCategorization(
      data.noteId || "",
      data.importId || "",
      deps.logger,
      deps.statusBroadcaster
    );

    // Send completion message
    if (deps.statusBroadcaster) {
      const message = result.success
        ? `Categorization completed (${result.categoriesCount} categories, ${result.tagsCount} tags)`
        : "Categorization timeout - continuing anyway";

      await deps.statusBroadcaster.addStatusEventAndBroadcast({
        importId: data.importId,
        status: result.success ? "COMPLETED" : "FAILED",
        message,
        context: "wait_for_categorization_complete",
        noteId: data.noteId,
        indentLevel: 1,
        metadata: {
          success: result.success,
          categorizationScheduled: result.categorizationScheduled,
          retryCount: result.retryCount,
          hasCategorization: result.hasCategorization,
          hasTags: result.hasTags,
          categoriesCount: result.categoriesCount,
          tagsCount: result.tagsCount,
        },
      });
    }

    return data;
  }
}
