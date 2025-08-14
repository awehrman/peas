import type {
  CategorizationJobData,
  CategorizationWorkerDependencies,
} from "./dependencies";
import { buildCategorizationDependencies } from "./dependencies";
import { createCategorizationPipeline } from "./pipeline";

import type { Queue } from "bullmq";

import type { IServiceContainer } from "../../services/container";
import { ActionFactory } from "../core/action-factory";
import { BaseWorker } from "../core/base-worker";
import type { ActionContext, WorkerAction } from "../core/types";
import { registerCategorizationActions } from "../../services/categorization/register";

/**
 * Worker for processing categorization tasks
 * Handles determining and saving categories and tags for notes
 */
export class CategorizationWorker extends BaseWorker<
  CategorizationJobData,
  CategorizationWorkerDependencies,
  CategorizationJobData
> {
  constructor(
    queue: Queue,
    container: IServiceContainer,
    actionFactory?: ActionFactory<
      CategorizationJobData,
      CategorizationWorkerDependencies,
      CategorizationJobData
    >
  ) {
    const dependencies = buildCategorizationDependencies(container);
    super(queue, dependencies, actionFactory, container);
  }

  /**
   * Get the operation name for this worker
   */
  protected getOperationName(): string {
    return "categorization";
  }

  /**
   * Register all categorization actions with the action factory
   */
  protected registerActions(): void {
    // Use centralized registration
    registerCategorizationActions(this.actionFactory);
  }

  /**
   * Create the categorization pipeline
   */
  protected createActionPipeline(
    data: CategorizationJobData,
    context: ActionContext
  ): WorkerAction<
    CategorizationJobData,
    CategorizationWorkerDependencies,
    CategorizationJobData
  >[] {
    console.log("[CATEGORIZATION_WORKER] Creating action pipeline...");
    console.log("[CATEGORIZATION_WORKER] Available actions:", this.actionFactory.getRegisteredActions());
    
    const pipeline = createCategorizationPipeline(
      this.actionFactory,
      this.dependencies,
      data,
      context
    );
    
    console.log("[CATEGORIZATION_WORKER] Created pipeline with", pipeline.length, "actions");
    return pipeline;
  }
}
