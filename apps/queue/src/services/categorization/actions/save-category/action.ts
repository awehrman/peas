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
    context: ActionContext
  ): Promise<CategorizationJobData> {
    // Validate input before processing
    const validationError = this.validateInput(data);
    if (validationError) {
      throw validationError;
    }

    // Call the service to save category using executeServiceAction for status broadcasting
    return this.executeServiceAction({
      data,
      deps,
      context,
      serviceCall: () =>
        saveCategory(data, deps.logger, deps.statusBroadcaster),
      contextName: "categorization_save",
      startMessage: "Saving recipe category...",
      completionMessage: "Category saved: dessert",
      additionalBroadcasting: async (result) => {
        /* istanbul ignore next -- @preserve */
        if (deps.statusBroadcaster) {
          const determinedCategory = result.metadata?.determinedCategory as
            | string
            | undefined;
          const determinedCategories = result.metadata?.determinedCategories as
            | string[]
            | undefined;
          const category =
            determinedCategory ||
            (determinedCategories && determinedCategories.length > 0
              ? determinedCategories[0]
              : undefined);
          const message = category
            ? `Category saved: ${category}`
            : "No category to save";
          await deps.statusBroadcaster.addStatusEventAndBroadcast({
            importId: data.importId,
            status: "COMPLETED",
            message,
            context: "categorization_save_complete",
            noteId: data.noteId,
            indentLevel: 1,
            metadata: {
              savedCategory: category,
            },
          });
        }
      },
    });
  }
}
