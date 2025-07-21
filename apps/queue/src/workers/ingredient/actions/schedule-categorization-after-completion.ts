import { BaseAction } from "../../core/base-action";
import { ActionContext } from "../../core/types";
import type {
  IngredientJobData,
  ScheduleCategorizationAfterCompletionDeps,
} from "../types";

/**
 * Action that schedules categorization after all ingredients are processed.
 * This should be called when the last ingredient line for a note is completed.
 */
export class ScheduleCategorizationAfterCompletionAction extends BaseAction<
  IngredientJobData,
  ScheduleCategorizationAfterCompletionDeps
> {
  name = "schedule_categorization_after_completion";

  /**
   * Executes the scheduling of categorization after ingredient completion.
   * @param data - The ingredient job data.
   * @param deps - The dependencies for scheduling and broadcasting.
   * @param context - The action context.
   * @returns The original ingredient job data.
   */
  async execute(
    data: IngredientJobData,
    deps: ScheduleCategorizationAfterCompletionDeps,
    context: ActionContext
  ): Promise<IngredientJobData> {
    this.logSchedulingStart(data, deps);
    try {
      await this.scheduleCategorizationJob(data, deps);
      this.logSchedulingSuccess(data, deps);
      await this.broadcastStatusUpdate(data, deps, context);
    } catch (error) {
      this.logSchedulingError(data, deps, error);
      await this.broadcastErrorStatus(data, deps, context, error);
    }
    return data;
  }

  /**
   * Logs the start of scheduling.
   */
  private logSchedulingStart(
    data: IngredientJobData,
    deps: ScheduleCategorizationAfterCompletionDeps
  ): void {
    deps.logger.log(
      `[SCHEDULE_CATEGORIZATION] Scheduling categorization for note ${data.noteId} after ingredient completion`
    );
  }

  /**
   * Schedules the categorization job in the queue.
   */
  private async scheduleCategorizationJob(
    data: IngredientJobData,
    deps: ScheduleCategorizationAfterCompletionDeps
  ): Promise<void> {
    await deps.categorizationQueue.add("process-categorization", {
      noteId: data.noteId,
      title: data.reference, // Use reference as title if available
      content: "", // Categorization doesn't need full content, just noteId
    });
  }

  /**
   * Logs a successful scheduling operation.
   */
  private logSchedulingSuccess(
    data: IngredientJobData,
    deps: ScheduleCategorizationAfterCompletionDeps
  ): void {
    deps.logger.log(
      `[SCHEDULE_CATEGORIZATION] Successfully scheduled categorization for note ${data.noteId}`
    );
  }

  /**
   * Broadcasts a status update after successful scheduling.
   */
  private async broadcastStatusUpdate(
    data: IngredientJobData,
    deps: ScheduleCategorizationAfterCompletionDeps,
    context: ActionContext
  ): Promise<void> {
    await deps.addStatusEventAndBroadcast({
      importId: data.noteId, // Use noteId as importId for ingredient jobs
      noteId: data.noteId,
      status: "PROCESSING",
      message: "Scheduled categorization after ingredient processing",
      context: context.operation,
    });
  }

  /**
   * Logs an error that occurred during scheduling.
   */
  private logSchedulingError(
    data: IngredientJobData,
    deps: ScheduleCategorizationAfterCompletionDeps,
    error: unknown
  ): void {
    deps.logger.log(
      `[SCHEDULE_CATEGORIZATION] Failed to schedule categorization for note ${data.noteId}: ${error}`,
      "error"
    );
  }

  /**
   * Broadcasts an error status if scheduling fails.
   */
  private async broadcastErrorStatus(
    data: IngredientJobData,
    deps: ScheduleCategorizationAfterCompletionDeps,
    context: ActionContext,
    error: unknown
  ): Promise<void> {
    await deps.addStatusEventAndBroadcast({
      importId: data.noteId, // Use noteId as importId for ingredient jobs
      noteId: data.noteId,
      status: "FAILED",
      message: `Failed to schedule categorization: ${error}`,
      context: context.operation,
    });
  }
}
