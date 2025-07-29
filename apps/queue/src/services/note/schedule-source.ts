import { ActionName } from "../../types";
import type { StructuredLogger } from "../../types";
import type { NotePipelineData } from "../../types/notes";
import type { NoteWorkerDependencies } from "../../types/notes";
import { BaseAction } from "../../workers/core/base-action";
import { ActionContext } from "../../workers/core/types";

/**
 * Schedules source processing for a note.
 *
 * This is a stubbed implementation that will be replaced with actual source processing logic.
 *
 * @param data - The pipeline data containing the note
 * @param logger - Logger instance for recording operation progress
 * @returns Promise resolving to the updated pipeline data
 */
export async function scheduleSource(
  data: NotePipelineData,
  logger: StructuredLogger
): Promise<NotePipelineData> {
  logger.log(
    `[SCHEDULE_SOURCE] Starting source scheduling for note: ${data.noteId}`
  );

  // Validate that we have a note ID
  if (!data.noteId) {
    throw new Error("No note ID available for source scheduling");
  }

  try {
    // TODO: Implement actual source scheduling logic
    // This could involve:
    // - Extracting source URLs from the note content
    // - Validating source links
    // - Creating source records in the database
    // - Scheduling source processing jobs

    logger.log(
      `[SCHEDULE_SOURCE] Successfully scheduled source processing for note: ${data.noteId}`
    );

    return data;
  } catch (error) {
    logger.log(
      `[SCHEDULE_SOURCE] Failed to schedule source processing: ${error}`
    );
    throw error;
  }
}

/**
 * Action class for scheduling source processing in the worker pipeline.
 *
 * This action is responsible for scheduling source-related tasks for a note.
 * It extends BaseAction to provide standardized error handling, logging, and status broadcasting.
 *
 * @example
 * ```typescript
 * const action = new ScheduleSourceAction();
 * const result = await action.execute(pipelineData, dependencies, context);
 * ```
 */
export class ScheduleSourceAction extends BaseAction<
  NotePipelineData,
  NoteWorkerDependencies,
  NotePipelineData
> {
  /** The unique identifier for this action in the worker pipeline */
  name = ActionName.SCHEDULE_SOURCE;

  /**
   * Validate input data before processing
   * @param data The pipeline data to validate
   * @returns Error if validation fails, null if valid
   */
  validateInput(data: NotePipelineData): Error | null {
    if (!data.noteId) {
      return new Error("Note ID is required for source scheduling");
    }
    return null;
  }

  /**
   * Execute the action to schedule source processing
   * @param data The pipeline data containing the note
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
      serviceCall: () => scheduleSource(data, deps.logger),
      contextName: "SCHEDULE_SOURCE",
      startMessage: `Starting to schedule source processing for note: ${data.noteId}`,
      completionMessage: `Successfully scheduled source processing for note: ${data.noteId}`,
    });
  }
}
