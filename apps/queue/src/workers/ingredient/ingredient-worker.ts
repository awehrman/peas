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

    // 3. Schedule categorization (COMMENTED OUT FOR SIMPLIFIED TESTING)
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
        // Dynamically import the v2 parser to avoid circular dependency issues
        const { v1: parser } = await import("@peas/parser");
        const parsedResult = parser.parse(text);

        result = {
          success: true,
          parseStatus: "CORRECT" as const,
          segments: parsedResult || [],
          processingTime: Date.now() - startTime,
        };

        container.logger.log(
          `[INGREDIENT] Parsing completed with status: ${result.parseStatus}, segments: ${result.segments.length}`
        );

        // Log the detailed parsed result
        container.logger.log(
          `[INGREDIENT] Parsed result details: ${JSON.stringify(parsedResult, null, 2)}`
        );
      } catch (error) {
        container.logger.log(
          `[INGREDIENT] Parsing failed: ${error instanceof Error ? error.message : String(error)}`
        );

        result = {
          success: false,
          parseStatus: "ERROR" as const,
          segments: [],
          processingTime: Date.now() - startTime,
          errorMessage: error instanceof Error ? error.message : String(error),
        };
      }

      return result;
    },
  };

  return new IngredientWorker(queue, dependencies);
}
