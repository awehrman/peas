import { BaseAction } from "../core/base-action";
import { ActionContext } from "../core/types";

export interface ScheduleCategorizationDeps {
  categorizationQueue: { add: (name: string, data: any) => Promise<any> };
}

export interface ScheduleCategorizationData {
  note: { id: string };
  file: any; // Replace with actual parsed file type
}

export class ScheduleCategorizationAction extends BaseAction<
  ScheduleCategorizationData,
  ScheduleCategorizationDeps
> {
  name = "schedule_categorization";

  async execute(
    data: ScheduleCategorizationData,
    deps: ScheduleCategorizationDeps,
    _context: ActionContext
  ) {
    console.log(
      `[SCHEDULE_CATEGORIZATION] Scheduling categorization for note ${data.note.id}`
    );

    try {
      await deps.categorizationQueue.add("categorize_note", {
        noteId: data.note.id,
        file: data.file,
      });
      console.log(
        `[SCHEDULE_CATEGORIZATION] Successfully scheduled categorization job for note ${data.note.id}`
      );
    } catch (error) {
      console.error(
        `[SCHEDULE_CATEGORIZATION] Failed to schedule categorization job:`,
        error
      );
      throw error;
    }

    return data;
  }
}
