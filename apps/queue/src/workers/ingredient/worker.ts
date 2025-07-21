import { registerIngredientActions } from "./actions";
import { createIngredientWorkerDependencies } from "./dependencies";
import type { IngredientJobData, IngredientWorkerDependencies } from "./types";

import { Queue } from "bullmq";

import { WORKER_CONSTANTS } from "../../config/constants";
import { IServiceContainer } from "../../services/container";
import { ActionName } from "../../types";
import type { BaseAction } from "../core/base-action";
import { BaseWorker } from "../core/base-worker";
import { ActionContext } from "../core/types";

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
        this.createWrappedAction(
          ActionName.UPDATE_INGREDIENT_COUNT,
          this.dependencies
        )
      );
    }

    // 1. Process ingredient line (with retry and error handling)
    actions.push(
      this.createWrappedAction(
        ActionName.PROCESS_INGREDIENT_LINE,
        this.dependencies
      )
    );

    // 2. Save ingredient line (with retry and error handling)
    actions.push(
      this.createWrappedAction(
        ActionName.SAVE_INGREDIENT_LINE,
        this.dependencies
      )
    );

    // 3. Track unique line pattern (low priority, non-blocking)
    actions.push(
      this.createWrappedAction(ActionName.TRACK_PATTERN, this.dependencies)
    );

    // 4. Check completion status and broadcast if all jobs are done
    actions.push(
      this.createErrorHandledAction(
        ActionName.COMPLETION_STATUS,
        this.dependencies
      )
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
  const dependencies = createIngredientWorkerDependencies(container);
  return new IngredientWorker(queue, dependencies);
}
