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
    console.log(
      `[SCHEDULE_INGREDIENTS] Scheduling ingredient processing for note ${data.note.id}`
    );
    console.log(`[SCHEDULE_INGREDIENTS] Data structure:`, {
      noteId: data.note?.id,
      fileTitle: data.file?.title,
      hasFile: !!data.file,
    });

    try {
      await deps.ingredientQueue.add("process_ingredients", {
        noteId: data.note.id,
        file: data.file,
      });
      console.log(
        `[SCHEDULE_INGREDIENTS] Successfully scheduled ingredient job for note ${data.note.id}`
      );
    } catch (error) {
      console.error(
        `[SCHEDULE_INGREDIENTS] Failed to schedule ingredient job:`,
        error
      );
      throw error;
    }

    return data;
  }
}
