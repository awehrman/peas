import { BaseAction } from "../../core/base-action";
import { ActionContext } from "../../core/types";
import { DatabaseOperations } from "../../shared/database-operations";
import type {
  IngredientWorkerDependencies,
  ProcessIngredientsInput,
  ProcessIngredientsOutput,
} from "../types";

/**
 * Action to process multiple ingredient lines for a note.
 * Handles parsing, database updates, error tracking, and categorization scheduling.
 */
export class ProcessIngredientsAction extends BaseAction<
  ProcessIngredientsInput,
  IngredientWorkerDependencies
> {
  name = "process-ingredients";

  /**
   * Executes the ingredient lines processing action.
   * @param input - The input data for processing ingredients.
   * @param deps - The ingredient worker dependencies.
   * @param context - The action context.
   * @returns The output of the processing action.
   */
  async execute(
    input: ProcessIngredientsInput,
    deps: IngredientWorkerDependencies,
    context: ActionContext
  ): Promise<ProcessIngredientsOutput> {
    const { noteId, importId, ingredientLines } = input;
    const totalCount = ingredientLines.length;
    const errors: Array<{ lineId: string; error: string }> = [];
    let processedCount = 0;

    deps.logger.log(
      `[PROCESS_INGREDIENTS] Processing ${totalCount} ingredient lines for note ${noteId}`
    );

    for (const line of ingredientLines) {
      if (!this.validateLine(line, errors, deps)) continue;
      const result = await this.processLine(line, deps, errors);
      if (result) processedCount++;
    }

    await this.broadcastProcessingStatus(
      deps,
      importId,
      noteId,
      processedCount,
      totalCount,
      context.operation
    );

    deps.logger.log(
      `[PROCESS_INGREDIENTS] Completed processing ${processedCount}/${totalCount} ingredient lines for note ${noteId}`
    );

    if (processedCount > 0) {
      await this.scheduleCategorization(
        deps,
        importId,
        noteId,
        processedCount,
        context.operation,
        errors
      );
    }

    return {
      success: processedCount > 0,
      processedCount,
      totalCount,
      errors,
    };
  }

  /**
   * Validates an ingredient line and logs/skips if invalid.
   */
  private validateLine(
    line: { id: string },
    errors: Array<{ lineId: string; error: string }>,
    deps: IngredientWorkerDependencies
  ): boolean {
    if (!line.id) {
      errors.push({ lineId: "unknown", error: "Line ID is missing" });
      deps.logger.log(
        `[PROCESS_INGREDIENTS] Skipping ingredient line - missing ID`,
        "error"
      );
      return false;
    }
    return true;
  }

  /**
   * Processes a single ingredient line: parses, updates DB, tracks errors.
   */
  private async processLine(
    line: {
      id: string;
      reference: string;
      blockIndex: number;
      lineIndex: number;
    },
    deps: IngredientWorkerDependencies,
    errors: Array<{ lineId: string; error: string }>
  ): Promise<boolean> {
    try {
      const result = await deps.parseIngredient(line.reference);
      if (result.success) {
        const dbOps = new DatabaseOperations(deps.database.prisma);
        await dbOps.updateParsedIngredientLine(line.id, {
          parseStatus: result.parseStatus as "CORRECT" | "INCORRECT" | "ERROR",
          parsedAt: new Date(),
        });
        if (result.segments && result.segments.length > 0) {
          await dbOps.replaceParsedSegments(line.id, result.segments);
        }
        deps.logger.log(
          `[PROCESS_INGREDIENTS] Successfully processed ingredient line ${line.id}`
        );
        return true;
      } else {
        errors.push({
          lineId: line.id,
          error: result.errorMessage || "Parsing failed",
        });
        deps.logger.log(
          `[PROCESS_INGREDIENTS] Failed to parse ingredient line ${line.id}: ${result.errorMessage}`,
          "error"
        );
        return false;
      }
    } catch (error) {
      errors.push({
        lineId: line.id,
        error: `Processing error: ${error}`,
      });
      deps.logger.log(
        `[PROCESS_INGREDIENTS] Error processing ingredient line ${line.id}: ${error}`,
        "error"
      );
      return false;
    }
  }

  /**
   * Broadcasts the processing status after all lines are processed.
   */
  private async broadcastProcessingStatus(
    deps: IngredientWorkerDependencies,
    importId: string,
    noteId: string,
    processedCount: number,
    totalCount: number,
    operation: string
  ): Promise<void> {
    await deps.addStatusEventAndBroadcast({
      importId,
      noteId,
      status: "PROCESSING",
      message: `Processed ${processedCount}/${totalCount} ingredient lines`,
      currentCount: processedCount,
      totalCount,
      context: operation,
    });
  }

  /**
   * Schedules categorization after ingredient processing and broadcasts status.
   */
  private async scheduleCategorization(
    deps: IngredientWorkerDependencies,
    importId: string,
    noteId: string,
    processedCount: number,
    operation: string,
    _errors: Array<{ lineId: string; error: string }>
  ): Promise<void> {
    try {
      await deps.categorizationQueue.add("process-categorization", {
        noteId,
        importId,
        title: `Recipe with ${processedCount} ingredients`,
        content: "",
      });
      deps.logger.log(
        `[PROCESS_INGREDIENTS] Successfully scheduled categorization for note ${noteId}`
      );
      await deps.addStatusEventAndBroadcast({
        importId,
        noteId,
        status: "PROCESSING",
        message: "Scheduled categorization after ingredient processing",
        context: operation,
      });
    } catch (error) {
      deps.logger.log(
        `[PROCESS_INGREDIENTS] Failed to schedule categorization for note ${noteId}: ${error}`,
        "error"
      );
      await deps.addStatusEventAndBroadcast({
        importId,
        noteId,
        status: "FAILED",
        message: `Failed to schedule categorization: ${error}`,
        context: operation,
      });
    }
  }
}
