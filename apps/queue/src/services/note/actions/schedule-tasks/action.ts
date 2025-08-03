import { scheduleAllFollowupTasks } from "./service";

import { ActionName } from "../../../../types";
import type { NotePipelineData } from "../../../../types/notes";
import type { NoteWorkerDependencies } from "../../../../types/notes";
import { BaseAction } from "../../../../workers/core/base-action";
import { ActionContext } from "../../../../workers/core/types";

export class ScheduleAllFollowupTasksAction extends BaseAction<
  NotePipelineData,
  NoteWorkerDependencies,
  NotePipelineData
> {
  name = ActionName.SCHEDULE_ALL_FOLLOWUP_TASKS;

  validateInput(data: NotePipelineData): Error | null {
    if (!data.noteId) {
      return new Error("Note ID is required for scheduling followup tasks");
    }
    return null;
  }

  async execute(
    data: NotePipelineData,
    deps: NoteWorkerDependencies,
    context: ActionContext
  ): Promise<NotePipelineData> {
    // Validate input before processing
    const validationError = this.validateInput(data);
    if (validationError) {
      throw validationError;
    }

    return this.executeServiceAction({
      data,
      deps,
      context,
      serviceCall: () => scheduleAllFollowupTasks(data, deps.logger, deps),
      contextName: "SCHEDULE_ALL_FOLLOWUP_TASKS",
      suppressDefaultBroadcast: true,
      // startMessage: `Starting to schedule followup tasks for note: ${data.noteId}`,
      // completionMessage: `Successfully scheduled all followup tasks for note: ${data.noteId}`,
    });
  }
}
