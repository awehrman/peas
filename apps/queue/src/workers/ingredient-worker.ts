import { Queue } from "bullmq";
import {
  BaseWorker,
  BaseWorkerDependencies,
  BaseJobData,
} from "./core/base-worker";
import { BaseAction } from "./actions/core/base-action";
import { ActionContext } from "./actions/core/types";
import {
  ProcessIngredientLineAction,
  SaveIngredientLineAction,
} from "./actions/ingredient";
import { IServiceContainer } from "../services/container";

export type IngredientWorkerDependencies = BaseWorkerDependencies;

export interface IngredientJobData extends BaseJobData {
  ingredientLineId: string;
  reference: string;
  blockIndex: number;
  lineIndex: number;
}

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
  };

  return new IngredientWorker(queue, dependencies);
}
