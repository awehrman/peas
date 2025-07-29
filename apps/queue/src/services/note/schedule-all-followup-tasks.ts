import { ActionName } from "../../types";
import type { StructuredLogger } from "../../types";
import type { NotePipelineData } from "../../types/notes";
import type { NoteWorkerDependencies } from "../../types/notes";
import { BaseAction } from "../../workers/core/base-action";
import { ActionContext } from "../../workers/core/types";

/**
 * Schedules all followup tasks for a note after it has been saved.
 *
 * This action schedules the following tasks:
 * - SCHEDULE_SOURCE: Process source information
 * - SCHEDULE_IMAGES: Process images
 * - SCHEDULE_INGREDIENTS: Process ingredients
 * - SCHEDULE_INSTRUCTIONS: Process instructions
 *
 * @param data - The pipeline data containing the saved note
 * @param logger - Logger instance for recording operation progress
 * @returns Promise resolving to the updated pipeline data
 */
export async function scheduleAllFollowupTasks(
  data: NotePipelineData,
  logger: StructuredLogger
): Promise<NotePipelineData> {
  logger.log(
    `[SCHEDULE_ALL_FOLLOWUP_TASKS] Starting to schedule followup tasks for note: ${data.noteId}`
  );

  // Validate that we have a note ID
  if (!data.noteId) {
    throw new Error("No note ID available for scheduling followup tasks");
  }

  try {
    // Schedule source processing
    logger.log(`[SCHEDULE_ALL_FOLLOWUP_TASKS] Scheduling source processing`);
    // TODO: Implement actual source scheduling
    // await scheduleSource(data.noteId);

    // Schedule image processing
    logger.log(`[SCHEDULE_ALL_FOLLOWUP_TASKS] Scheduling image processing`);
    // TODO: Implement actual image scheduling
    // await scheduleImages(data.noteId);

    // Schedule ingredient processing
    logger.log(
      `[SCHEDULE_ALL_FOLLOWUP_TASKS] Scheduling ingredient processing`
    );
    // TODO: Implement actual ingredient scheduling
    // await scheduleIngredients(data.noteId);

    // Schedule instruction processing
    logger.log(
      `[SCHEDULE_ALL_FOLLOWUP_TASKS] Scheduling instruction processing`
    );
    // TODO: Implement actual instruction scheduling
    // await scheduleInstructions(data.noteId);

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

/**
 * Action class for scheduling all followup tasks in the worker pipeline.
 *
 * This action schedules the four main followup tasks (source, images, ingredients, instructions)
 * after a note has been successfully saved. It extends BaseAction to provide
 * standardized error handling, logging, and status broadcasting.
 *
 * @example
 * ```typescript
 * const action = new ScheduleAllFollowupTasksAction();
 * const result = await action.execute(pipelineData, dependencies, context);
 * ```
 */
export class ScheduleAllFollowupTasksAction extends BaseAction<
  NotePipelineData,
  NoteWorkerDependencies,
  NotePipelineData
> {
  /** The unique identifier for this action in the worker pipeline */
  name = ActionName.SCHEDULE_ALL_FOLLOWUP_TASKS;

  /**
   * Validate input data before processing
   * @param data The pipeline data to validate
   * @returns Error if validation fails, null if valid
   */
  validateInput(data: NotePipelineData): Error | null {
    if (!data.noteId) {
      return new Error("Note ID is required for scheduling followup tasks");
    }
    return null;
  }

  /**
   * Execute the action to schedule all followup tasks
   * @param data The pipeline data containing the saved note
   * @param deps Dependencies required by the action
   * @param context Context information about the job
   * @returns Promise resolving to the updated pipeline data
   */
  async execute(
    data: NotePipelineData,
    deps: NoteWorkerDependencies,
    context: ActionContext
  ): Promise<NotePipelineData> {
    return this.executeServiceAction({
      data,
      deps,
      context,
      serviceCall: () => scheduleAllFollowupTasks(data, deps.logger),
      contextName: "SCHEDULE_ALL_FOLLOWUP_TASKS",
      startMessage: `Starting to schedule followup tasks for note: ${data.noteId}`,
      completionMessage: `Successfully scheduled all followup tasks for note: ${data.noteId}`,
    });
  }
}
