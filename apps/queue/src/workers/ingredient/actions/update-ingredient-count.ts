import { BaseAction } from "../../core/base-action";
import { ActionContext } from "../../core/types";
import type { IngredientWorkerDependencies } from "../types";

export interface UpdateIngredientCountData {
  importId: string;
  noteId?: string;
  currentIngredientIndex: number;
  totalIngredients: number;
}

export interface UpdateIngredientCountDeps
  extends IngredientWorkerDependencies {
  database: IngredientWorkerDependencies["database"] & {
    incrementNoteCompletionTracker?: (noteId: string) => Promise<unknown>;
  };
}

export class UpdateIngredientCountAction extends BaseAction<
  UpdateIngredientCountData,
  UpdateIngredientCountDeps
> {
  name = "update_ingredient_count";

  async execute(
    data: UpdateIngredientCountData,
    deps: UpdateIngredientCountDeps,
    _context: ActionContext
  ): Promise<UpdateIngredientCountData> {
    const { importId, noteId, currentIngredientIndex, totalIngredients } = data;

    // Determine if this is the final ingredient
    const isComplete = currentIngredientIndex === totalIngredients;
    const status = isComplete ? "COMPLETED" : "PROCESSING";
    const emoji = isComplete ? "✅" : "⏳";

    // Update job completion tracker for each ingredient job completion
    if (noteId) {
      try {
        if (deps.database.incrementNoteCompletionTracker) {
          // Increment the completed jobs count by 1
          await deps.database.incrementNoteCompletionTracker(noteId);
          deps.logger?.log(
            `[UPDATE_INGREDIENT_COUNT] Incremented completion tracker for note ${noteId}: ingredient ${currentIngredientIndex}/${totalIngredients} completed`
          );
        }
      } catch (error) {
        deps.logger?.log(
          `[UPDATE_INGREDIENT_COUNT] Failed to update completion tracker for note ${noteId}: ${error}`,
          "error"
        );
      }
    }

    await deps.addStatusEventAndBroadcast({
      importId,
      noteId,
      status,
      message: `${emoji} ${currentIngredientIndex}/${totalIngredients} ingredients`,
      context: "parse_html_ingredients",
      indentLevel: 2, // Additional indentation for ingredients
      metadata: {
        currentIngredientIndex,
        totalIngredients,
        isComplete,
      },
    });

    return data;
  }
}
