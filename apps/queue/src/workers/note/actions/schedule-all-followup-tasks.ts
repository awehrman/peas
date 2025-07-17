import { BaseAction } from "../../core/base-action";
import { ActionContext } from "../../core/types";
import type { NotePipelineStage3, StatusEvent, ParsedHtmlFile } from "../types";

export interface ScheduleAllFollowupTasksDeps {
  ingredientQueue: {
    add: (name: string, data: Record<string, unknown>) => Promise<unknown>;
  };
  instructionQueue: {
    add: (name: string, data: Record<string, unknown>) => Promise<unknown>;
  };
  imageQueue: {
    add: (name: string, data: Record<string, unknown>) => Promise<unknown>;
  };
  sourceQueue: {
    add: (name: string, data: Record<string, unknown>) => Promise<unknown>;
  };
  addStatusEventAndBroadcast: (event: StatusEvent) => Promise<unknown>;
  logger: { log: (message: string, level?: string) => void };
}

export interface ScheduleAllFollowupTasksData {
  noteId: string;
  importId: string;
  file: ParsedHtmlFile;
}

/**
 * Action that schedules all follow-up processing tasks concurrently
 * This replaces the individual schedule actions with a single concurrent action
 */
export class ScheduleAllFollowupTasksAction extends BaseAction<
  NotePipelineStage3,
  ScheduleAllFollowupTasksDeps
> {
  name = "schedule_all_followup_tasks";

  async execute(
    data: NotePipelineStage3,
    deps: ScheduleAllFollowupTasksDeps,
    context: ActionContext
  ): Promise<NotePipelineStage3> {
    const { note, importId } = data;

    deps.logger.log(
      `[SCHEDULE_ALL_FOLLOWUP] Scheduling all follow-up tasks for note ${note.id}`
    );

    // Schedule all follow-up tasks concurrently (except categorization)
    const schedulePromises = [
      // Schedule source processing
      deps.sourceQueue
        .add("process-source", {
          noteId: note.id,
          importId,
          title: note.title,
          content: note.content,
        })
        .catch((error) => {
          deps.logger.log(
            `[SCHEDULE_ALL_FOLLOWUP] Failed to schedule source: ${error}`,
            "error"
          );
          return null;
        }),

      // Schedule image processing
      deps.imageQueue
        .add("process-images", {
          noteId: note.id,
          importId,
          content: note.content,
        })
        .catch((error) => {
          deps.logger.log(
            `[SCHEDULE_ALL_FOLLOWUP] Failed to schedule images: ${error}`,
            "error"
          );
          return null;
        }),

      // Schedule ingredient processing (categorization will be scheduled after completion)
      deps.ingredientQueue
        .add("process-ingredients", {
          noteId: note.id,
          importId,
          ingredientLines: note.parsedIngredientLines,
        })
        .catch((error) => {
          deps.logger.log(
            `[SCHEDULE_ALL_FOLLOWUP] Failed to schedule ingredients: ${error}`,
            "error"
          );
          return null;
        }),

      // Schedule instruction processing
      deps.instructionQueue
        .add("process-instructions", {
          noteId: note.id,
          importId,
          instructionLines: note.parsedInstructionLines,
        })
        .catch((error) => {
          deps.logger.log(
            `[SCHEDULE_ALL_FOLLOWUP] Failed to schedule instructions: ${error}`,
            "error"
          );
          return null;
        }),
    ];

    // Wait for all scheduling operations to complete
    const results = await Promise.all(schedulePromises);

    // Log results
    const successful = results.filter((r) => r !== null).length;
    const failed = results.filter((r) => r === null).length;

    deps.logger.log(
      `[SCHEDULE_ALL_FOLLOWUP] Scheduled ${successful} tasks successfully, ${failed} failed for note ${note.id}`
    );

    // Broadcast status update
    await deps.addStatusEventAndBroadcast({
      importId,
      noteId: note.id,
      status: "PROCESSING",
      message: `Scheduled ${successful} follow-up processing tasks`,
      context: context.operation,
    });

    return data;
  }
}
