import type {
  CategorizationJobData,
  CategorizationWorkerDependencies,
} from "./dependencies";
import { buildCategorizationDependencies } from "./dependencies";
import { createCategorizationPipeline } from "./pipeline";

import type { Queue } from "bullmq";

// Import categorization actions synchronously
import { DetermineCategoryAction } from "../../services/categorization/actions/determine-category/action";
import { DetermineTagsAction } from "../../services/categorization/actions/determine-tags/action";
import { SaveCategoryAction } from "../../services/categorization/actions/save-category/action";
import { SaveTagsAction } from "../../services/categorization/actions/save-tags/action";
import type { IServiceContainer } from "../../services/container";
import { ActionName } from "../../types";
import { ActionFactory } from "../core/action-factory";
import { BaseWorker } from "../core/base-worker";
import type { ActionContext, WorkerAction } from "../core/types";

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
    // Import and register categorization actions
    this.registerCategorizationActions();
  }

  /**
   * Register categorization-specific actions
   */
  private registerCategorizationActions(): void {
    console.log("[CATEGORIZATION_WORKER] Registering categorization actions...");
    
    // Import actions synchronously to ensure they're registered before pipeline creation
    this.actionFactory.register(
      ActionName.DETERMINE_CATEGORY,
      () => new DetermineCategoryAction()
    );
    console.log("[CATEGORIZATION_WORKER] Registered DETERMINE_CATEGORY action");

    this.actionFactory.register(
      ActionName.SAVE_CATEGORY,
      () => new SaveCategoryAction()
    );
    console.log("[CATEGORIZATION_WORKER] Registered SAVE_CATEGORY action");

    this.actionFactory.register(
      ActionName.DETERMINE_TAGS,
      () => new DetermineTagsAction()
    );
    console.log("[CATEGORIZATION_WORKER] Registered DETERMINE_TAGS action");

    this.actionFactory.register(
      ActionName.SAVE_TAGS,
      () => new SaveTagsAction()
    );
    console.log("[CATEGORIZATION_WORKER] Registered SAVE_TAGS action");
    
    console.log("[CATEGORIZATION_WORKER] All categorization actions registered");
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
