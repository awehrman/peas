import { buildIngredientDependencies } from "./dependencies";
import type {
  IngredientJobData,
  IngredientWorkerDependencies,
} from "./dependencies";
import { createIngredientPipeline } from "./pipeline";

import { Queue } from "bullmq";

import { IServiceContainer } from "../../services/container";
import { registerIngredientActions } from "../../services/ingredient/register";
import { ActionFactory } from "../core/action-factory";
import { BaseWorker } from "../core/base-worker";
import type { ActionContext, WorkerAction } from "../core/types";

/**
 * IngredientWorker class that extends BaseWorker for processing ingredient jobs
 */
export class IngredientWorker extends BaseWorker<
  IngredientJobData,
  IngredientWorkerDependencies,
  IngredientJobData
> {
  protected actionFactory: ActionFactory<
    IngredientJobData,
    IngredientWorkerDependencies,
    IngredientJobData
  >;

  constructor(
    queue: Queue,
    dependencies: IngredientWorkerDependencies,
    actionFactory: ActionFactory<
      IngredientJobData,
      IngredientWorkerDependencies,
      IngredientJobData
    >,
    container: IServiceContainer
  ) {
    super(queue, dependencies, actionFactory, container);
    this.actionFactory = actionFactory;
    this.registerActions();
  }

  /**
   * Register actions specific to ingredient processing
   * This is where all ingredient-related actions are registered with the factory
   */
  protected registerActions(): void {
    // Register all ingredient actions using the centralized registration function
    registerIngredientActions(this.actionFactory);
  }

  /**
   * Get the operation name for this worker
   */
  protected getOperationName(): string {
    return "ingredient-worker";
  }

  /**
   * Create the action pipeline for ingredient processing
   */
  protected createActionPipeline(
    data: IngredientJobData,
    context: ActionContext
  ): WorkerAction<
    IngredientJobData,
    IngredientWorkerDependencies,
    IngredientJobData
  >[] {
    return createIngredientPipeline(
      this.actionFactory,
      this.dependencies,
      data,
      context
    );
  }
}

/**
 * Create an ingredient worker instance
 */
export function createIngredientWorker(
  queue: Queue,
  container: IServiceContainer
): IngredientWorker {
  const dependencies = buildIngredientDependencies(container);
  const actionFactory = new ActionFactory<
    IngredientJobData,
    IngredientWorkerDependencies,
    IngredientJobData
  >();

  return new IngredientWorker(queue, dependencies, actionFactory, container);
}
