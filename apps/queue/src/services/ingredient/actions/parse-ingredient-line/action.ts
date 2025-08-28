import { parseIngredientLine } from "./service";

import { ActionName } from "../../../../types";
import { BaseAction } from "../../../../workers/core/base-action";
import { ActionContext } from "../../../../workers/core/types";
import type { IngredientJobData } from "../../../../workers/ingredient/dependencies";
import type { IngredientWorkerDependencies } from "../../../../workers/ingredient/dependencies";

export class ParseIngredientLineAction extends BaseAction<
  IngredientJobData,
  IngredientWorkerDependencies,
  IngredientJobData
> {
  /** The unique identifier for this action in the worker pipeline */
  name = ActionName.PARSE_INGREDIENT_LINE;

  /**
   * Validate input data before parsing ingredient line
   * @param data The ingredient job data to validate
   * @returns Error if validation fails, null if valid
   */
  validateInput(data: IngredientJobData): Error | null {
    if (!data.noteId) {
      return new Error("Note ID is required for parsing ingredient line");
    }
    if (!data.ingredientReference) {
      return new Error(
        "Ingredient reference is required for parsing ingredient line"
      );
    }
    return null;
  }

  /**
   * Execute the action to parse an ingredient line
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
      serviceCall: () => deps.services.parseIngredient(data),
      contextName: "parse_ingredient_line",
      suppressDefaultBroadcast: false,
      startMessage: `Parsing ingredient line ${data.lineIndex}`,
      additionalBroadcasting: async () => {
        // Emit a per-line pre-save progress update (e.g., 0/x, 1/x before increment)
        try {
          if (deps.statusBroadcaster && data.importId && data.noteId) {
            const { getIngredientCompletionStatus } = await import(
              "../../../note/actions/track-completion/service"
            );
            const completionStatus = getIngredientCompletionStatus(data.noteId);

            // Debug logging to trace pre-save broadcast values
            if (deps.logger && typeof deps.logger.log === "function") {
              deps.logger.log(
                `[PARSE_INGREDIENT_LINE] Pre-save progress (before save): ${completionStatus.completedIngredients}/${completionStatus.totalIngredients} (noteId=${data.noteId}, importId=${data.importId}, lineIndex=${data.lineIndex})`
              );
            }

            await deps.statusBroadcaster.addStatusEventAndBroadcast({
              importId: data.importId,
              noteId: data.noteId,
              status: "PROCESSING",
              message: `Processing ${completionStatus.completedIngredients}/${completionStatus.totalIngredients} ingredients`,
              context: "ingredient_processing",
              currentCount: completionStatus.completedIngredients,
              totalCount: completionStatus.totalIngredients,
              indentLevel: 1,
              metadata: {
                totalIngredients: completionStatus.totalIngredients,
                completedIngredients: completionStatus.completedIngredients,
                lineIndex: data.lineIndex,
              },
            });
          }
        } catch {
          // Ignore broadcast errors here; save step will still emit progress
        }
      },
    });
  }
}

export { parseIngredientLine };
