import { determineCategory } from "./service";

import { ActionName } from "../../../../types";
import type { CategorizationJobData } from "../../../../workers/categorization/dependencies";
import type { CategorizationWorkerDependencies } from "../../../../workers/categorization/dependencies";
import { BaseAction } from "../../../../workers/core/base-action";
import type { ActionContext } from "../../../../workers/core/types";

export class DetermineCategoryAction extends BaseAction<
  CategorizationJobData,
  CategorizationWorkerDependencies,
  CategorizationJobData
> {
  name = ActionName.DETERMINE_CATEGORY;

  validateInput(data: CategorizationJobData): Error | null {
    if (!data.noteId) {
      return new Error("Note ID is required for category determination");
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
        message: "Determining recipe category...",
        context: "categorization_start",
        noteId: data.noteId,
        indentLevel: 1,
      });
    }

    // Call the service to determine category
    const result = await determineCategory(data, deps.logger);

    // Send completion message
    if (deps.statusBroadcaster) {
      const category = result.metadata?.determinedCategory as string;
      const message = category 
        ? `Category determined: ${category}`
        : "Category determination completed";

      await deps.statusBroadcaster.addStatusEventAndBroadcast({
        importId: data.importId,
        status: "COMPLETED",
        message,
        context: "categorization_complete",
        noteId: data.noteId,
        indentLevel: 1,
        metadata: {
          determinedCategory: category,
        },
      });
    }

    return result;
  }
}
