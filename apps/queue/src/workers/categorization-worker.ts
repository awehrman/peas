import { Queue } from "bullmq";
import {
  BaseWorker,
  BaseWorkerDependencies,
  BaseJobData,
} from "./core/base-worker";
import { BaseAction } from "./actions/core/base-action";
import { ActionContext } from "./actions/core/types";
import {
  ProcessCategorizationAction,
  SaveCategorizationAction,
} from "./actions/categorization";
import { IServiceContainer } from "../services/container";

export type CategorizationWorkerDependencies = BaseWorkerDependencies;

export interface CategorizationJobData extends BaseJobData {
  title?: string;
  content: string;
  ingredients?: string[];
  instructions?: string[];
}

/**
 * Categorization Worker that extends BaseWorker for categorization processing
 */
export class CategorizationWorker extends BaseWorker<
  CategorizationJobData,
  CategorizationWorkerDependencies
> {
  protected registerActions(): void {
    // Register categorization actions
    this.actionFactory.register(
      "process_categorization",
      () => new ProcessCategorizationAction()
    );
    this.actionFactory.register(
      "save_categorization",
      () => new SaveCategorizationAction()
    );
  }

  protected getOperationName(): string {
    return "categorization_processing";
  }

  protected createActionPipeline(
    data: CategorizationJobData,
    _context: ActionContext
  ): BaseAction<any, any>[] {
    const actions: BaseAction<any, any>[] = [];

    // Add standard status actions if we have a noteId
    this.addStatusActions(actions, data);

    // 1. Process categorization (with retry and error handling)
    actions.push(
      this.createWrappedAction("process_categorization", this.dependencies)
    );

    // 2. Save categorization (with retry and error handling)
    actions.push(
      this.createWrappedAction("save_categorization", this.dependencies)
    );

    return actions;
  }
}

/**
 * Factory function to create a categorization worker with dependencies from the service container
 */
export function createCategorizationWorker(
  queue: Queue,
  container: IServiceContainer
): CategorizationWorker {
  const dependencies: CategorizationWorkerDependencies = {
    // Base dependencies
    addStatusEventAndBroadcast:
      container.statusBroadcaster?.addStatusEventAndBroadcast ||
      (() => Promise.resolve()),
    ErrorHandler: container.errorHandler?.errorHandler || {
      withErrorHandling: async (operation) => operation(),
    },
    logger: container.logger,
  };

  return new CategorizationWorker(queue, dependencies);
}
