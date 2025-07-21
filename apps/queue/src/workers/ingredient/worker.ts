import { registerIngredientActions } from "./actions";
import { createIngredientWorkerDependencies } from "./dependencies";
import { createIngredientPipeline } from "./pipeline";
import type { IngredientJobData, IngredientWorkerDependencies } from "./types";

import { Queue } from "bullmq";

import { WORKER_CONSTANTS } from "../../config/constants";
import { IServiceContainer } from "../../services/container";
import type { BaseAction } from "../core/base-action";
import { BaseWorker } from "../core/base-worker";
import type { ActionContext } from "../core/types";

/**
 * Worker for processing ingredient jobs.
 * Extends BaseWorker to provide custom ingredient processing logic.
 */
export class IngredientWorker extends BaseWorker<
  IngredientJobData,
  IngredientWorkerDependencies
> {
  /**
   * Registers all ingredient-specific actions with the action factory.
   */
  protected registerActions(): void {
    registerIngredientActions(this.actionFactory);
  }

  /**
   * Returns the operation name for this worker.
   *
   * @returns The operation name string.
   */
  protected getOperationName(): string {
    return WORKER_CONSTANTS.NAMES.INGREDIENT;
  }

  /**
   * Adds status actions to the pipeline.
   * Overridden to provide custom ingredient progress tracking.
   *
   * @param actions - The array of actions to add to.
   * @param data - The job data for the ingredient line.
   */
  protected addStatusActions(
    actions: BaseAction<IngredientJobData, IngredientJobData>[],
    data: IngredientJobData
  ): void {
    this.dependencies.logger.log(
      `[${this.getOperationName().toUpperCase()}] addStatusActions called with data: noteId=${data.noteId}, hasNoteId=${!!data.noteId}, dataKeys=${Object.keys(data).join(", ")}`
    );
    this.dependencies.logger.log(
      `[${this.getOperationName().toUpperCase()}] Skipping generic status actions - using custom ingredient progress tracking`
    );
  }

  /**
   * Creates the action pipeline for a given ingredient job.
   *
   * @param data - The job data for the ingredient line.
   * @param context - The action context.
   * @returns An array of actions to execute for the ingredient job.
   */
  protected createActionPipeline(
    data: IngredientJobData,
    context: ActionContext
  ): BaseAction<IngredientJobData, IngredientJobData>[] {
    return createIngredientPipeline(
      {
        addStatusActions: this.addStatusActions.bind(this),
        createWrappedAction: this.createWrappedAction.bind(this),
        createErrorHandledAction: this.createErrorHandledAction.bind(this),
        dependencies: this.dependencies,
      },
      data,
      context
    );
  }
}

/**
 * Factory function to create an ingredient worker with dependencies from the service container.
 *
 * @param queue - The BullMQ queue for ingredient jobs.
 * @param container - The service container providing dependencies.
 * @returns An instance of IngredientWorker.
 */
export function createIngredientWorker(
  queue: Queue,
  container: IServiceContainer
): IngredientWorker {
  const dependencies = createIngredientWorkerDependencies(container);
  return new IngredientWorker(queue, dependencies);
}
