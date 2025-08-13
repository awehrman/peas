import type {
  CategorizationJobData,
  CategorizationWorkerDependencies,
} from "./dependencies";
import { buildCategorizationDependencies } from "./dependencies";
import { createCategorizationPipeline } from "./pipeline";

import type { Queue } from "bullmq";

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
    // Import actions dynamically to avoid circular dependencies
    import(
      "../../services/categorization/actions/determine-category/action"
    ).then(({ DetermineCategoryAction }) => {
      this.actionFactory.register(
        ActionName.DETERMINE_CATEGORY,
        () => new DetermineCategoryAction()
      );
    });

    import("../../services/categorization/actions/save-category/action").then(
      ({ SaveCategoryAction }) => {
        this.actionFactory.register(
          ActionName.SAVE_CATEGORY,
          () => new SaveCategoryAction()
        );
      }
    );

    import("../../services/categorization/actions/determine-tags/action").then(
      ({ DetermineTagsAction }) => {
        this.actionFactory.register(
          ActionName.DETERMINE_TAGS,
          () => new DetermineTagsAction()
        );
      }
    );

    import("../../services/categorization/actions/save-tags/action").then(
      ({ SaveTagsAction }) => {
        this.actionFactory.register(
          ActionName.SAVE_TAGS,
          () => new SaveTagsAction()
        );
      }
    );
  }

  /**
   * Create the categorization pipeline
   */
  protected createPipeline(
    data: CategorizationJobData,
    context: ActionContext
  ): WorkerAction<
    CategorizationJobData,
    CategorizationWorkerDependencies,
    CategorizationJobData
  >[] {
    return createCategorizationPipeline(
      this.actionFactory,
      this.dependencies,
      data,
      context
    );
  }
}
