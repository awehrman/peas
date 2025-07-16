import { BaseAction } from "../../core/base-action";
import { ActionContext } from "../../core/types";
import { ScheduleIngredientsData, ScheduleIngredientsDeps } from "../types";

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
    await deps.ingredientQueue.add("process-ingredient-line", {
      noteId: data.noteId,
    });
    return data;
  }
}
