import { Queue } from "bullmq";
import {
  BaseWorker,
  createBaseDependenciesFromContainer,
} from "../core/base-worker";
import { ActionContext } from "../core/types";
import { registerIngredientActions } from "./actions";
import { IServiceContainer } from "../../services/container";
import { WORKER_CONSTANTS, LOG_MESSAGES } from "../../config/constants";
import {
  formatLogMessage,
  measureExecutionTime,
  truncateString,
} from "../../utils/utils";
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
    return WORKER_CONSTANTS.NAMES.INGREDIENT;
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
    // Base dependencies from helper methods
    ...createBaseDependenciesFromContainer(container),

    // Ingredient-specific dependencies
    categorizationQueue: container.queues.categorizationQueue,
    database: container.database,
    parseIngredient: async (text: string) => {
      const { result } = await measureExecutionTime(async () => {
        const truncatedText = truncateString(text, 50);
        container.logger.log(
          formatLogMessage(LOG_MESSAGES.INFO.INGREDIENT_PARSING_START, {
            text: truncatedText,
          })
        );

        // Handle empty or whitespace-only input
        if (!text || text.trim().length === 0) {
          container.logger.log(
            formatLogMessage(LOG_MESSAGES.ERROR.INGREDIENT_EMPTY_INPUT, {})
          );
          return {
            success: false,
            parseStatus: "ERROR" as const,
            segments: [],
            processingTime: 0,
            errorMessage: "Empty or invalid input text",
          };
        }

        try {
          // Dynamically import the v1 parser to avoid circular dependency issues
          const { v1: parser } = await import("@peas/parser");
          const parsedResult = parser.parse(text);

          // Check if we have valid parsed data
          if (
            !parsedResult?.values ||
            !Array.isArray(parsedResult.values) ||
            parsedResult.values.length === 0
          ) {
            container.logger.log(
              formatLogMessage(LOG_MESSAGES.ERROR.INGREDIENT_PARSER_NO_DATA, {})
            );
            return {
              success: false,
              parseStatus: "ERROR" as const,
              segments: [],
              processingTime: 0,
              errorMessage: "Parser returned no valid data",
            };
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
            )
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
                  processingTime: 0,
                };
              }
            )
            .filter((segment) => segment.value.length > 0);

          // Only consider successful if we have valid segments
          const hasValidSegments = segments.length > 0;

          const result = {
            success: hasValidSegments,
            parseStatus: hasValidSegments
              ? ("CORRECT" as const)
              : ("ERROR" as const),
            segments,
            processingTime: 0,
            ...(hasValidSegments
              ? {}
              : { errorMessage: "No valid ingredient segments found" }),
          };

          container.logger.log(
            formatLogMessage(
              LOG_MESSAGES.SUCCESS.INGREDIENT_PARSING_COMPLETED,
              {
                status: result.parseStatus,
                segments: segments.length,
              }
            )
          );

          return result;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          container.logger.log(
            formatLogMessage(LOG_MESSAGES.ERROR.INGREDIENT_PARSING_FAILED, {
              error: errorMessage,
            })
          );

          return {
            success: false,
            parseStatus: "ERROR" as const,
            segments: [],
            processingTime: 0,
            errorMessage: errorMessage,
          };
        }
      }, "ingredient_parsing");

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
