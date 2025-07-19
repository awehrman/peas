import { BaseAction } from "../../core/base-action";
import { ActionContext } from "../../core/types";
import { ScheduleIngredientsDeps } from "../types";
import { type ScheduleIngredientsData } from "../schema";

export class ScheduleIngredientsAction extends BaseAction<
  ScheduleIngredientsData,
  ScheduleIngredientsDeps
> {
  name = "schedule_ingredients";

  async execute(
    data: ScheduleIngredientsData,
    deps: ScheduleIngredientsDeps,
    _context: ActionContext
  ): Promise<ScheduleIngredientsData> {
    const { noteId, importId, note } = data;

    // Extract ingredient lines from the note
    const ingredientLines = note?.parsedIngredientLines || [];

    // Schedule each ingredient line individually with tracking information
    for (let i = 0; i < ingredientLines.length; i++) {
      const ingredientLine = ingredientLines[i];
      if (!ingredientLine) continue; // Skip undefined ingredient lines

      await deps.ingredientQueue.add("process_ingredient_line", {
        noteId,
        importId,
        ingredientLineId: ingredientLine.id,
        reference: ingredientLine.reference,
        blockIndex: ingredientLine.blockIndex,
        lineIndex: ingredientLine.lineIndex,
        currentIngredientIndex: i + 1, // 1-based for display
        totalIngredients: ingredientLines.length,
      });
    }

    deps.logger.log(
      `[SCHEDULE_INGREDIENTS] Scheduled ${ingredientLines.length} ingredient jobs for note ${noteId}`
    );

    return data;
  }
}
