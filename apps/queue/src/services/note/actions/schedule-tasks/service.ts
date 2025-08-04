import type { StructuredLogger } from "../../../../types";
import type { NotePipelineData } from "../../../../types/notes";
import type { NoteWorkerDependencies } from "../../../../types/notes";
import { ActionContext } from "../../../../workers/core/types";
import { ProcessSourceAction } from "../process-source/action";
// import { ScheduleImagesAction } from "../../schedule-images";
import { ScheduleIngredientsAction } from "../schedule-ingredients/action";
import { ScheduleInstructionsAction } from "../schedule-instructions/action";

export async function scheduleAllFollowupTasks(
  data: NotePipelineData,
  logger: StructuredLogger,
  deps: NoteWorkerDependencies
): Promise<NotePipelineData> {
  // Validate that we have a note ID
  if (!data.noteId) {
    throw new Error("No note ID available for scheduling followup tasks");
  }

  // Validate that we have dependencies
  if (!deps) {
    throw new Error("No dependencies available for scheduling followup tasks");
  }

  try {
    logger.log(
      `[SCHEDULE_ALL_FOLLOWUP_TASKS] Starting to schedule followup tasks for note: ${data.noteId}`
    );

    // Create action instances
    const sourceAction = new ProcessSourceAction();
    const instructionsAction = new ScheduleInstructionsAction();
    const ingredientAction = new ScheduleIngredientsAction();
    // const imageAction = new ScheduleImagesAction();

    // Create a mock context for the actions
    const context: ActionContext = {
      jobId: "schedule-followup-tasks",
      retryCount: 0,
      queueName: "note_processing",
      operation: "schedule_followup_tasks",
      startTime: Date.now(),
      workerName: "note_worker",
      attemptNumber: 1,
    };

    // Execute all followup tasks in parallel
    // Each will have its own action with start/stop broadcasting
    await Promise.all([
      // Schedule source processing
      sourceAction.execute(data, deps, context),

      // Process instructions (schedules individual instruction jobs)
      instructionsAction.execute(data, deps, context),

      // Schedule ingredient processing
      ingredientAction.execute(data, deps, context),

      // Schedule image processing
      // imageAction.execute(data, deps, context),
    ]);

    logger.log(
      `[SCHEDULE_ALL_FOLLOWUP_TASKS] Successfully scheduled all followup tasks for note: ${data.noteId}`
    );

    return data;
  } catch (error) {
    logger.log(
      `[SCHEDULE_ALL_FOLLOWUP_TASKS] Failed to schedule followup tasks: ${error}`
    );
    throw error;
  }
}
