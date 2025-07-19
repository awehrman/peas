import { BaseAction } from "../../core/base-action";
import { ActionContext } from "../../core/types";
import type { NotePipelineStage3, StatusEvent } from "../types";
import type { ParsedHtmlFile } from "../schema";

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
    _context: ActionContext
  ): Promise<NotePipelineStage3> {
    const { note, importId } = data;

    deps.logger.log(
      `[SCHEDULE_ALL_FOLLOWUP] Scheduling all follow-up tasks for note ${note.id}`
    );

    // Schedule all follow-up tasks concurrently
    const schedulePromises: Promise<unknown>[] = [];

    // Add ingredient scheduling promises
    schedulePromises.push(
      ...this.createIngredientSchedulingPromises(note, importId, deps)
    );

    // Add instruction scheduling promises
    schedulePromises.push(
      ...this.createInstructionSchedulingPromises(note, importId, deps)
    );

    // Wait for all scheduling operations to complete
    const results = await Promise.all(schedulePromises);

    // Log results
    this.logSchedulingResults(results, note.id, deps);

    return data;
  }

  /**
   * Creates promises for scheduling ingredient processing jobs
   */
  private createIngredientSchedulingPromises(
    note: NotePipelineStage3["note"],
    importId: string,
    deps: ScheduleAllFollowupTasksDeps
  ): Promise<unknown>[] {
    const ingredientLines = note?.parsedIngredientLines || [];
    const promises: Promise<unknown>[] = [];

    for (let i = 0; i < ingredientLines.length; i++) {
      const ingredientLine = ingredientLines[i];
      if (!ingredientLine) continue;

      promises.push(
        deps.ingredientQueue
          .add("process_ingredient_line", {
            noteId: note.id,
            importId,
            ingredientLineId: ingredientLine.id,
            reference: ingredientLine.reference,
            blockIndex: ingredientLine.blockIndex,
            lineIndex: ingredientLine.lineIndex,
            currentIngredientIndex: i + 1,
            totalIngredients: ingredientLines.length,
          })
          .catch((error) => {
            deps.logger.log(
              `[SCHEDULE_ALL_FOLLOWUP] Failed to schedule ingredient ${i + 1}: ${error}`,
              "error"
            );
            return null;
          })
      );
    }

    return promises;
  }

  /**
   * Creates promises for scheduling instruction processing jobs
   */
  private createInstructionSchedulingPromises(
    note: NotePipelineStage3["note"],
    importId: string,
    deps: ScheduleAllFollowupTasksDeps
  ): Promise<unknown>[] {
    const instructionLines = note?.parsedInstructionLines || [];
    const promises: Promise<unknown>[] = [];

    for (let i = 0; i < instructionLines.length; i++) {
      const instructionLine = instructionLines[i];
      if (!instructionLine) continue;

      promises.push(
        deps.instructionQueue
          .add("process-instruction-line", {
            noteId: note.id,
            importId,
            instructionLineId: instructionLine.id,
            originalText: instructionLine.originalText,
            lineIndex: instructionLine.lineIndex,
            currentInstructionIndex: i + 1,
            totalInstructions: instructionLines.length,
          })
          .catch((error) => {
            deps.logger.log(
              `[SCHEDULE_ALL_FOLLOWUP] Failed to schedule instruction ${i + 1}: ${error}`,
              "error"
            );
            return null;
          })
      );
    }

    return promises;
  }

  /**
   * Logs the results of all scheduling operations
   */
  private logSchedulingResults(
    results: unknown[],
    noteId: string,
    deps: ScheduleAllFollowupTasksDeps
  ): void {
    const successful = results.filter((r) => r !== null).length;
    const failed = results.filter((r) => r === null).length;

    deps.logger.log(
      `[SCHEDULE_ALL_FOLLOWUP] Scheduled ${successful} tasks successfully, ${failed} failed for note ${noteId}`
    );
  }
}
