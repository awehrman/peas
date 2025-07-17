import { BaseAction } from "../../core/base-action";
import { ActionContext } from "../../core/types";
import type { StatusEvent } from "../../types";
import type { IngredientJobData } from "../types";

export interface ScheduleCategorizationAfterCompletionDeps {
  categorizationQueue: {
    add: (name: string, data: Record<string, unknown>) => Promise<unknown>;
  };
  addStatusEventAndBroadcast: (event: StatusEvent) => Promise<unknown>;
  logger: { log: (message: string, level?: string) => void };
}

export interface ScheduleCategorizationAfterCompletionData {
  noteId: string;
  importId: string;
  title?: string;
  content: string;
}

/**
 * Action that schedules categorization after all ingredients are processed
 * This should be called when the last ingredient line for a note is completed
 */
export class ScheduleCategorizationAfterCompletionAction extends BaseAction<
  IngredientJobData,
  ScheduleCategorizationAfterCompletionDeps
> {
  name = "schedule_categorization_after_completion";

  async execute(
    data: IngredientJobData,
    deps: ScheduleCategorizationAfterCompletionDeps,
    context: ActionContext
  ): Promise<IngredientJobData> {
    const { noteId } = data;

    deps.logger.log(
      `[SCHEDULE_CATEGORIZATION] Scheduling categorization for note ${noteId} after ingredient completion`
    );

    try {
      // Schedule categorization job
      await deps.categorizationQueue.add("process-categorization", {
        noteId,
        title: data.reference, // Use reference as title if available
        content: "", // Categorization doesn't need full content, just noteId
      });

      deps.logger.log(
        `[SCHEDULE_CATEGORIZATION] Successfully scheduled categorization for note ${noteId}`
      );

      // Broadcast status update
      await deps.addStatusEventAndBroadcast({
        importId: noteId, // Use noteId as importId for ingredient jobs
        noteId,
        status: "PROCESSING",
        message: "Scheduled categorization after ingredient processing",
        context: context.operation,
      });
    } catch (error) {
      deps.logger.log(
        `[SCHEDULE_CATEGORIZATION] Failed to schedule categorization for note ${noteId}: ${error}`,
        "error"
      );

      // Broadcast error status
      await deps.addStatusEventAndBroadcast({
        importId: noteId, // Use noteId as importId for ingredient jobs
        noteId,
        status: "FAILED",
        message: `Failed to schedule categorization: ${error}`,
        context: context.operation,
      });
    }

    return data;
  }
}
