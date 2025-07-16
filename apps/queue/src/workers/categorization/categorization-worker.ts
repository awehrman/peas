import { Queue } from "bullmq";
import { BaseWorker } from "../core/base-worker";
import { ActionContext } from "../core/types";
import {
  ProcessCategorizationAction,
  SaveCategorizationAction,
} from "./actions";
import { IServiceContainer } from "../../services/container";
import type {
  CategorizationWorkerDependencies,
  CategorizationJobData,
} from "./types";
import type { BaseAction } from "../core/base-action";

// Using imported types from ./types.ts

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
  ): BaseAction<unknown, unknown>[] {
    const actions: BaseAction<unknown, unknown>[] = [];

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

    // Categorization-specific dependencies
    categorizer: {
      categorizeRecipe: async (data: any) => {
        container.logger.log(
          `[CATEGORIZATION] Categorizing recipe for note ${data.noteId || "unknown"}`
        );
        // TODO: Implement actual categorization
        const result = {
          success: true,
          categories: ["main-dish", "dinner"],
          tags: ["quick", "healthy"],
          confidence: 0.85,
          processingTime: 50,
        };
        container.logger.log(
          `[CATEGORIZATION] Categorization completed: ${result.categories.join(", ")} (confidence: ${result.confidence})`
        );
        return result;
      },
    },
    database: {
      updateNoteCategories: async (noteId: string, categories: string[]) => {
        container.logger.log(
          `[CATEGORIZATION] Updating note ${noteId} with categories: ${categories.join(", ")}`
        );
        // TODO: Implement actual database update
        const result = { noteId, categories };
        container.logger.log(
          `[CATEGORIZATION] Successfully updated note ${noteId} with categories`
        );
        return result;
      },
      updateNoteTags: async (noteId: string, tags: string[]) => {
        container.logger.log(
          `[CATEGORIZATION] Updating note ${noteId} with tags: ${tags.join(", ")}`
        );
        // TODO: Implement actual database update
        const result = { noteId, tags };
        container.logger.log(
          `[CATEGORIZATION] Successfully updated note ${noteId} with tags`
        );
        return result;
      },
    },
  };

  return new CategorizationWorker(queue, dependencies);
}
