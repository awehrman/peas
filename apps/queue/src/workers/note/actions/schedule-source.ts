import { BaseAction } from "../../core/base-action";
import { ActionContext } from "../../core/types";
import { ScheduleSourceData, ScheduleSourceDeps } from "../types";

export class ScheduleSourceAction extends BaseAction<
  ScheduleSourceData,
  ScheduleSourceDeps
> {
  name = "schedule_source";

  async execute(
    data: ScheduleSourceData,
    deps: ScheduleSourceDeps,
    _context: ActionContext
  ): Promise<ScheduleSourceData> {
    await deps.sourceQueue.add("process-source", {
      noteId: data.noteId,
    });
    return data;
  }
}
