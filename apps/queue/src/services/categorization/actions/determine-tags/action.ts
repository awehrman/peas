import { determineTags } from "./service";

import { ActionName } from "../../../../types";
import type { CategorizationJobData } from "../../../../workers/categorization/dependencies";
import type { CategorizationWorkerDependencies } from "../../../../workers/categorization/dependencies";
import { BaseAction } from "../../../../workers/core/base-action";
import type { ActionContext } from "../../../../workers/core/types";

export class DetermineTagsAction extends BaseAction<
  CategorizationJobData,
  CategorizationWorkerDependencies,
  CategorizationJobData
> {
  name = ActionName.DETERMINE_TAGS;

  validateInput(data: CategorizationJobData): Error | null {
    if (!data.noteId) {
      return new Error("Note ID is required for tag determination");
    }
    return null;
  }

  async execute(
    data: CategorizationJobData,
    deps: CategorizationWorkerDependencies,
    _context: ActionContext
  ): Promise<CategorizationJobData> {
    // Validate input before processing
    const validationError = this.validateInput(data);
    if (validationError) {
      throw validationError;
    }

    // Send start message
    if (deps.statusBroadcaster) {
      await deps.statusBroadcaster.addStatusEventAndBroadcast({
        importId: data.importId,
        status: "PROCESSING",
        message: "Determining recipe tags...",
        context: "tag_determination_start",
        noteId: data.noteId,
        indentLevel: 1,
      });
    }

    // Call the service to determine tags
    const result = await determineTags(data, deps.logger);

    // Send completion message
    if (deps.statusBroadcaster) {
      const tags = result.metadata?.determinedTags as string[];
      const message = tags && tags.length > 0
        ? `Tags determined: ${tags.join(", ")}`
        : "Tag determination completed";

      await deps.statusBroadcaster.addStatusEventAndBroadcast({
        importId: data.importId,
        status: "COMPLETED",
        message,
        context: "tag_determination_complete",
        noteId: data.noteId,
        indentLevel: 1,
        metadata: {
          determinedTags: tags,
        },
      });
    }

    return result;
  }
}
