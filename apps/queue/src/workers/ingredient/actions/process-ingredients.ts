import { BaseAction } from "../../core/base-action";
import { ActionContext } from "../../core/types";
import type { IngredientWorkerDependencies } from "../types";

export interface ProcessIngredientsInput {
  noteId: string;
  importId: string;
  ingredientLines: Array<{
    id: string;
    reference: string;
    blockIndex: number;
    lineIndex: number;
  }>;
}

export interface ProcessIngredientsOutput {
  success: boolean;
  processedCount: number;
  totalCount: number;
  errors: Array<{
    lineId: string;
    error: string;
  }>;
}

export class ProcessIngredientsAction extends BaseAction<
  ProcessIngredientsInput,
  IngredientWorkerDependencies
> {
  name = "process-ingredients";

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

    // Process each ingredient line
    for (const line of ingredientLines) {
      try {
        // Process the ingredient line
        const result = await deps.parseIngredient(line.reference);

        if (result.success) {
          // Save the parsed segments
          await deps.database.createParsedSegments(
            result.segments.map((segment, index) => ({
              ingredientLineId: line.id,
              index,
              rule: segment.rule,
              type: segment.type,
              value: segment.value,
              confidence: segment.confidence,
            }))
          );

          // Update the ingredient line with parsing results
          await deps.database.updateIngredientLine(line.id, {
            parseStatus: result.parseStatus,
            processingTime: result.processingTime,
            parsedAt: new Date(),
          });

          processedCount++;
          deps.logger.log(
            `[PROCESS_INGREDIENTS] Successfully processed ingredient line ${line.id}`
          );
        } else {
          errors.push({
            lineId: line.id,
            error: result.errorMessage || "Parsing failed",
          });
          deps.logger.log(
            `[PROCESS_INGREDIENTS] Failed to parse ingredient line ${line.id}: ${result.errorMessage}`,
            "error"
          );
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
      }
    }

    // Broadcast completion status
    await deps.addStatusEventAndBroadcast({
      importId,
      noteId,
      status: "PROCESSING",
      message: `Processed ${processedCount}/${totalCount} ingredient lines`,
      currentCount: processedCount,
      totalCount,
      context: context.operation,
    });

    deps.logger.log(
      `[PROCESS_INGREDIENTS] Completed processing ${processedCount}/${totalCount} ingredient lines for note ${noteId}`
    );

    // Schedule categorization after all ingredients are processed
    if (processedCount > 0) {
      try {
        await deps.categorizationQueue.add("process-categorization", {
          noteId,
          importId,
          title: `Recipe with ${processedCount} ingredients`,
          content: "", // Categorization doesn't need full content, just noteId
        });

        deps.logger.log(
          `[PROCESS_INGREDIENTS] Successfully scheduled categorization for note ${noteId}`
        );

        // Broadcast categorization scheduling status
        await deps.addStatusEventAndBroadcast({
          importId,
          noteId,
          status: "PROCESSING",
          message: "Scheduled categorization after ingredient processing",
          context: context.operation,
        });
      } catch (error) {
        deps.logger.log(
          `[PROCESS_INGREDIENTS] Failed to schedule categorization for note ${noteId}: ${error}`,
          "error"
        );

        // Broadcast error status
        await deps.addStatusEventAndBroadcast({
          importId,
          noteId,
          status: "FAILED",
          message: `Failed to schedule categorization: ${error}`,
          context: context.operation,
        });
      }
    }

    return {
      success: processedCount > 0,
      processedCount,
      totalCount,
      errors,
    };
  }
}
