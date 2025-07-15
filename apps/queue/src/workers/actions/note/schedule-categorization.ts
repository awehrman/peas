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
    await deps.categorizationQueue.add("categorize_note", {
      noteId: data.note.id,
      file: data.file,
    });
    return data;
  }
}
