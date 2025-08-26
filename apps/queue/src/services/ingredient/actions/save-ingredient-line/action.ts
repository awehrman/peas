import { saveIngredientLine } from "./service";

import { ActionName } from "../../../../types";
import { BaseAction } from "../../../../workers/core/base-action";
import { ActionContext } from "../../../../workers/core/types";
import type { IngredientJobData } from "../../../../workers/ingredient/dependencies";
import type { IngredientWorkerDependencies } from "../../../../workers/ingredient/dependencies";

export class SaveIngredientLineAction extends BaseAction<
  IngredientJobData,
  IngredientWorkerDependencies,
  IngredientJobData
> {
  /** The unique identifier for this action in the worker pipeline */
  name = ActionName.SAVE_INGREDIENT_LINE;

  /**
   * Validate input data before saving ingredient line
   * @param data The ingredient job data to validate
   * @returns Error if validation fails, null if valid
   */
  validateInput(data: IngredientJobData): Error | null {
    if (!data.noteId) {
      return new Error("Note ID is required for saving ingredient line");
    }
    if (!data.ingredientReference) {
      return new Error(
        "Ingredient reference is required for saving ingredient line"
      );
    }
    return null;
  }

  /**
   * Execute the action to save an ingredient line
   * @param data The ingredient job data containing the ingredient
   * @param deps Dependencies required by the action
   * @param context Context information about the job
   * @returns Promise resolving to the updated ingredient job data
   */
  async execute(
    data: IngredientJobData,
    deps: IngredientWorkerDependencies,
    context: ActionContext
  ): Promise<IngredientJobData> {
    return this.executeServiceAction({
      data,
      deps,
      context,
      serviceCall: () => deps.services.saveIngredient(data),
      contextName: "save_ingredient_line",
      suppressDefaultBroadcast: true,
    });
  }
}

export { saveIngredientLine };
