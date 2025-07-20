import { Queue } from "bullmq";
import { BaseWorker } from "../core/base-worker";
import { ActionContext } from "../core/types";
import { registerIngredientActions } from "./actions";
import { IServiceContainer } from "../../services/container";
import type { IngredientWorkerDependencies, IngredientJobData } from "./types";
import type { BaseAction } from "../core/base-action";

// Using imported types from ./types.ts

/**
 * Ingredient Worker that extends BaseWorker for ingredient processing
 */
export class IngredientWorker extends BaseWorker<
  IngredientJobData,
  IngredientWorkerDependencies
> {
  protected registerActions(): void {
    registerIngredientActions(this.actionFactory);
  }

  protected getOperationName(): string {
    return "ingredient_processing";
  }

  /**
   * Override addStatusActions to prevent generic status messages when we have ingredient tracking
   */
  protected addStatusActions(
    actions: BaseAction<unknown, unknown>[],
    data: IngredientJobData
  ): void {
    this.dependencies.logger.log(
      `[${this.getOperationName().toUpperCase()}] addStatusActions called with data: noteId=${data.noteId}, hasNoteId=${!!data.noteId}, dataKeys=${Object.keys(data).join(", ")}`
    );

    // Skip both processing and completion status actions since we handle them specifically
    this.dependencies.logger.log(
      `[${this.getOperationName().toUpperCase()}] Skipping generic status actions - using custom ingredient progress tracking`
    );
  }

  protected createActionPipeline(
    data: IngredientJobData,
    _context: ActionContext
  ): BaseAction<unknown, unknown>[] {
    const actions: BaseAction<unknown, unknown>[] = [];

    // Add standard status actions if we have a noteId
    this.addStatusActions(actions, data);

    // Add ingredient count update if we have tracking information
    if (
      data.importId &&
      typeof data.currentIngredientIndex === "number" &&
      typeof data.totalIngredients === "number"
    ) {
      actions.push(
        this.createWrappedAction("update_ingredient_count", this.dependencies)
      );
    }

    // 1. Process ingredient line (with retry and error handling)
    actions.push(
      this.createWrappedAction("process_ingredient_line", this.dependencies)
    );

    // 2. Save ingredient line (with retry and error handling)
    actions.push(
      this.createWrappedAction("save_ingredient_line", this.dependencies)
    );

    // 3. Track unique line pattern (low priority, non-blocking)
    actions.push(this.createWrappedAction("track_pattern", this.dependencies));

    // 4. Check completion status and broadcast if all jobs are done
    actions.push(
      this.createErrorHandledAction("completion_status", this.dependencies)
    );

    // 5. Schedule categorization (COMMENTED OUT FOR SIMPLIFIED TESTING)
    // Note: This will schedule categorization after each ingredient line.
    // In a production system, you might want to track when ALL ingredient lines
    // for a note are completed before scheduling categorization.
    // actions.push(
    //   this.createErrorHandledAction(
    //     "schedule_categorization",
    //     this.dependencies
    //   )
    // );

    return actions;
  }
}

/**
 * Factory function to create an ingredient worker with dependencies from the service container
 */
export function createIngredientWorker(
  queue: Queue,
  container: IServiceContainer
): IngredientWorker {
  const dependencies: IngredientWorkerDependencies = {
    // Base dependencies
    addStatusEventAndBroadcast:
      container.statusBroadcaster?.addStatusEventAndBroadcast ||
      (() => Promise.resolve()),
    ErrorHandler: container.errorHandler?.errorHandler || {
      withErrorHandling: async (operation) => operation(),
    },
    logger: container.logger,

    // Ingredient-specific dependencies
    categorizationQueue: container.queues.categorizationQueue,
    database: container.database,
    parseIngredient: async (text: string) => {
      container.logger.log(
        `[INGREDIENT] Parsing ingredient text: "${text.substring(0, 50)}${text.length > 50 ? "..." : ""}"`
      );

      const startTime = Date.now();
      let result;

      try {
        // Handle empty or whitespace-only input
        if (!text || text.trim().length === 0) {
          container.logger.log(
            `[INGREDIENT] Empty or whitespace-only input received`
          );
          result = {
            success: false,
            parseStatus: "ERROR" as const,
            segments: [],
            processingTime: Date.now() - startTime,
            errorMessage: "Empty or invalid input text",
          };
          return result;
        }

        // Dynamically import the v1 parser to avoid circular dependency issues
        const { v1: parser } = await import("@peas/parser");
        const parsedResult = parser.parse(text);
        container.logger.log(
          `[INGREDIENT] Parsed result: ${JSON.stringify(parsedResult, null, 2)}`
        );

        // Check if we have valid parsed data
        // The v1 parser returns a single object with values, not a parsed array
        if (
          !parsedResult?.values ||
          !Array.isArray(parsedResult.values) ||
          parsedResult.values.length === 0
        ) {
          container.logger.log(`[INGREDIENT] Parser returned no valid data`);
          result = {
            success: false,
            parseStatus: "ERROR" as const,
            segments: [],
            processingTime: Date.now() - startTime,
            errorMessage: "Parser returned no valid data",
          };
          return result;
        }

        // Convert parser output to expected format
        const segments = parsedResult.values
          .filter(
            (segment: {
              rule?: string;
              type?: string;
              value?: string;
              values?: string[] | string;
            }) => segment && (segment.values || segment.value)
          ) // Filter out empty segments
          .map(
            (
              segment: {
                rule?: string;
                type?: string;
                value?: string;
                values?: string[] | string;
              },
              index: number
            ) => {
              const segmentStartTime = Date.now();

              // Handle different possible formats of segment.values
              let value: string;
              if (Array.isArray(segment.values)) {
                value = segment.values.join(" ");
              } else if (typeof segment.values === "string") {
                value = segment.values;
              } else if (segment.value) {
                value =
                  typeof segment.value === "string"
                    ? segment.value
                    : String(segment.value);
              } else {
                value = "";
              }

              const segmentProcessingTime = Date.now() - segmentStartTime;

              return {
                index,
                rule: segment.rule || "",
                type:
                  (segment.type as
                    | "amount"
                    | "unit"
                    | "ingredient"
                    | "modifier") || "ingredient",
                value: value.trim(),
                processingTime: segmentProcessingTime,
              };
            }
          )
          .filter((segment) => segment.value.length > 0); // Filter out segments with empty values

        // Only consider successful if we have valid segments
        const hasValidSegments = segments.length > 0;

        result = {
          success: hasValidSegments,
          parseStatus: hasValidSegments
            ? ("CORRECT" as const)
            : ("ERROR" as const),
          segments,
          processingTime: Date.now() - startTime,
          ...(hasValidSegments
            ? {}
            : { errorMessage: "No valid ingredient segments found" }),
        };

        container.logger.log(
          `[INGREDIENT] Parsing completed with status: ${result.parseStatus}, segments: ${segments.length}`
        );

        // Log the detailed parsed result for debugging
        container.logger.log(
          `[INGREDIENT] Parsed result details: ${JSON.stringify(parsedResult, null, 2)}`
        );
      } catch (error) {
        // Preserve the original error message
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        container.logger.log(`[INGREDIENT] Parsing failed: ${errorMessage}`);

        result = {
          success: false,
          parseStatus: "ERROR" as const,
          segments: [],
          processingTime: Date.now() - startTime,
          errorMessage: errorMessage,
        };
      }

      return result;
    },
    // Add job completion tracker methods from the container's database service
    updateNoteCompletionTracker: container.database.updateNoteCompletionTracker,
    incrementNoteCompletionTracker:
      container.database.incrementNoteCompletionTracker,
    checkNoteCompletion: container.database.checkNoteCompletion,
  };

  return new IngredientWorker(queue, dependencies);
}
