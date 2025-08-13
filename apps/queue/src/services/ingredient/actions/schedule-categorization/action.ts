import { scheduleCategorization } from "./service";

import { ActionName } from "../../../../types";
import type { IngredientJobData } from "../../../../workers/ingredient/dependencies";
import type { IngredientWorkerDependencies } from "../../../../workers/ingredient/dependencies";
import { BaseAction } from "../../../../workers/core/base-action";
import type { ActionContext } from "../../../../workers/core/types";

export class ScheduleCategorizationAction extends BaseAction<
  IngredientJobData,
  IngredientWorkerDependencies,
  IngredientJobData
> {
  name = ActionName.SCHEDULE_CATEGORIZATION_AFTER_COMPLETION;

  validateInput(data: IngredientJobData): Error | null {
    if (!data.noteId) {
      return new Error("Note ID is required for categorization scheduling");
    }
    return null;
  }

  async execute(
    data: IngredientJobData,
    deps: IngredientWorkerDependencies,
    _context: ActionContext
  ): Promise<IngredientJobData> {
    // Validate input before processing
    const validationError = this.validateInput(data);
    if (validationError) {
      throw validationError;
    }

    // Call the service to schedule categorization
    const result = await scheduleCategorization(data, deps.logger, deps.statusBroadcaster);

    return result;
  }
}
