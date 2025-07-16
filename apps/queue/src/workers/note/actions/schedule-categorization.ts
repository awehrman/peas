import { BaseAction } from "../../core/base-action";
import { ActionContext } from "../../core/types";
import {
  ScheduleCategorizationData,
  ScheduleCategorizationDeps,
} from "../types";

export class ScheduleCategorizationAction extends BaseAction<
  ScheduleCategorizationData,
  ScheduleCategorizationDeps
> {
  name = "schedule_categorization";

  async execute(
    data: ScheduleCategorizationData,
    deps: ScheduleCategorizationDeps,
    _context: ActionContext
  ): Promise<ScheduleCategorizationData> {
    await deps.categorizationQueue.add("categorize", {
      noteId: data.noteId,
    });
    return data;
  }
}
