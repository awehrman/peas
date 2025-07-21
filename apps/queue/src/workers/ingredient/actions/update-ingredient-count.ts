import { BaseAction } from "../../core/base-action";
import { ActionContext } from "../../core/types";
import type {
  UpdateIngredientCountData,
  UpdateIngredientCountDeps,
} from "../types";

/**
 * Action to update the ingredient completion tracker and broadcast status.
 */
export class UpdateIngredientCountAction extends BaseAction<
  UpdateIngredientCountData,
  UpdateIngredientCountDeps
> {
  name = "update_ingredient_count";

  /**
   * Executes the update ingredient count action.
   * @param data - The update ingredient count data.
   * @param deps - The dependencies for updating and broadcasting.
   * @param _context - The action context (unused).
   * @returns The original update ingredient count data.
   */
  async execute(
    data: UpdateIngredientCountData,
    deps: UpdateIngredientCountDeps,
    _context: ActionContext
  ): Promise<UpdateIngredientCountData> {
    const isComplete = this.isFinalIngredient(data);
    await this.updateCompletionTracker(data, deps);
    await this.broadcastStatus(data, deps, isComplete);
    return data;
  }

  /**
   * Determines if this is the final ingredient.
   */
  private isFinalIngredient(data: UpdateIngredientCountData): boolean {
    return data.currentIngredientIndex === data.totalIngredients;
  }

  /**
   * Updates the job completion tracker for the note.
   */
  private async updateCompletionTracker(
    data: UpdateIngredientCountData,
    deps: UpdateIngredientCountDeps
  ): Promise<void> {
    if (data.noteId && deps.database.incrementNoteCompletionTracker) {
      try {
        await deps.database.incrementNoteCompletionTracker(data.noteId);
        deps.logger?.log(
          `[UPDATE_INGREDIENT_COUNT] Incremented completion tracker for note ${data.noteId}: ingredient ${data.currentIngredientIndex}/${data.totalIngredients} completed`
        );
      } catch (error) {
        deps.logger?.log(
          `[UPDATE_INGREDIENT_COUNT] Failed to update completion tracker for note ${data.noteId}: ${error}`,
          "error"
        );
      }
    }
  }

  /**
   * Broadcasts the status update for ingredient processing.
   */
  private async broadcastStatus(
    data: UpdateIngredientCountData,
    deps: UpdateIngredientCountDeps,
    isComplete: boolean
  ): Promise<void> {
    const status = isComplete ? "COMPLETED" : "PROCESSING";
    const emoji = isComplete ? "✅" : "⏳";
    await deps.addStatusEventAndBroadcast({
      importId: data.importId,
      noteId: data.noteId,
      status,
      message: `${emoji} ${data.currentIngredientIndex}/${data.totalIngredients} ingredients`,
      context: "parse_html_ingredients",
      indentLevel: 2,
      metadata: {
        currentIngredientIndex: data.currentIngredientIndex,
        totalIngredients: data.totalIngredients,
        isComplete,
      },
    });
  }
}
