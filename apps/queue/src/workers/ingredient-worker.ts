import { Queue } from "bullmq";
import { BaseWorker } from "./core/base-worker";
import { BaseAction } from "./actions/core/base-action";
import { ActionContext } from "./actions/core/types";
import {
  ProcessIngredientLineAction,
  SaveIngredientLineAction,
} from "./actions/ingredient";
import { IServiceContainer } from "../services/container";
import type { IngredientWorkerDependencies, IngredientJobData } from "./types";

// Using imported types from ./types.ts

/**
 * Ingredient Worker that extends BaseWorker for ingredient processing
 */
export class IngredientWorker extends BaseWorker<
  IngredientJobData,
  IngredientWorkerDependencies
> {
  protected registerActions(): void {
    // Register ingredient actions
    this.actionFactory.register(
      "process_ingredient_line",
      () => new ProcessIngredientLineAction()
    );
    this.actionFactory.register(
      "save_ingredient_line",
      () => new SaveIngredientLineAction()
    );
  }

  protected getOperationName(): string {
    return "ingredient_processing";
  }

  protected createActionPipeline(
    data: IngredientJobData,
    _context: ActionContext
  ): BaseAction<any, any>[] {
    const actions: BaseAction<any, any>[] = [];

    // Add standard status actions if we have a noteId
    this.addStatusActions(actions, data);

    // 1. Process ingredient line (with retry and error handling)
    actions.push(
      this.createWrappedAction("process_ingredient_line", this.dependencies)
    );

    // 2. Save ingredient line (with retry and error handling)
    actions.push(
      this.createWrappedAction("save_ingredient_line", this.dependencies)
    );

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
    database: {
      updateIngredientLine: async (id: string, data: any) => {
        container.logger.log(
          `[INGREDIENT] Updating ingredient line ${id} with data: ${JSON.stringify(data)}`
        );
        // TODO: Implement actual database update
        const result = { id, ...data };
        container.logger.log(
          `[INGREDIENT] Successfully updated ingredient line ${id}`
        );
        return result;
      },
      createParsedSegments: async (segments: any[]) => {
        container.logger.log(
          `[INGREDIENT] Creating ${segments.length} parsed segments`
        );
        // TODO: Implement actual segment creation
        const result = segments;
        container.logger.log(
          `[INGREDIENT] Successfully created ${segments.length} parsed segments`
        );
        return result;
      },
    },
    parseIngredient: async (text: string) => {
      container.logger.log(
        `[INGREDIENT] Parsing ingredient text: "${text.substring(0, 50)}${text.length > 50 ? "..." : ""}"`
      );
      // TODO: Implement actual ingredient parsing
      const result = {
        success: true,
        parseStatus: "CORRECT" as const,
        segments: [],
        processingTime: 0,
      };
      container.logger.log(
        `[INGREDIENT] Parsing completed with status: ${result.parseStatus}`
      );
      return result;
    },
  };

  return new IngredientWorker(queue, dependencies);
}
