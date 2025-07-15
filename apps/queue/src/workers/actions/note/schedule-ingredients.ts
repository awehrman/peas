import { BaseAction } from "../core/base-action";
import { ActionContext } from "../core/types";

export interface ScheduleIngredientsDeps {
  ingredientQueue: { add: (name: string, data: any) => Promise<any> };
}

export interface ScheduleIngredientsData {
  note: { id: string };
  file: any; // Replace with actual parsed file type
}

export class ScheduleIngredientsAction extends BaseAction<
  ScheduleIngredientsData,
  ScheduleIngredientsDeps
> {
  name = "schedule_ingredients";

  async execute(
    data: ScheduleIngredientsData,
    deps: ScheduleIngredientsDeps,
    _context: ActionContext
  ) {
    await deps.ingredientQueue.add("process_ingredients", {
      noteId: data.note.id,
      file: data.file,
    });
    return data;
  }
}
