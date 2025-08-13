import { saveCategory } from "./service";

import { ActionName } from "../../../../types";
import type { CategorizationJobData } from "../../../../workers/categorization/dependencies";
import type { CategorizationWorkerDependencies } from "../../../../workers/categorization/dependencies";
import { BaseAction } from "../../../../workers/core/base-action";
import type { ActionContext } from "../../../../workers/core/types";

export class SaveCategoryAction extends BaseAction<
  CategorizationJobData,
  CategorizationWorkerDependencies,
  CategorizationJobData
> {
  name = ActionName.SAVE_CATEGORY;

  validateInput(data: CategorizationJobData): Error | null {
    if (!data.noteId) {
      return new Error("Note ID is required for category saving");
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

    // Call the service to save category
    const result = await saveCategory(data, deps.logger, deps.statusBroadcaster);

    return result;
  }
}
