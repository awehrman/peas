import { Queue } from "bullmq";
import {
  BaseWorker,
  createBaseDependenciesFromContainer,
} from "../core/base-worker";
import { ActionContext } from "../core/types";
import { registerCategorizationActions } from "./actions";
import { IServiceContainer } from "../../services/container";
import { WORKER_CONSTANTS, LOG_MESSAGES } from "../../config/constants";
import { formatLogMessage, measureExecutionTime } from "../../utils/utils";
import type {
  CategorizationWorkerDependencies,
  CategorizationJobData,
  CategorizationInput,
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
    registerCategorizationActions(this.actionFactory);
  }

  protected getOperationName(): string {
    return WORKER_CONSTANTS.NAMES.CATEGORIZATION;
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
    // Base dependencies from helper methods
    ...createBaseDependenciesFromContainer(container),

    // Categorization-specific dependencies
    categorizer: {
      categorizeRecipe: async (data: CategorizationInput) => {
        const { result } = await measureExecutionTime(async () => {
          container.logger.log(
            formatLogMessage(LOG_MESSAGES.INFO.CATEGORIZATION_START, {
              title: data.title || "untitled",
            })
          );

          // TODO: Implement actual categorization
          const result = {
            success: true,
            categories: ["main-dish", "dinner"],
            tags: ["quick", "healthy"],
            processingTime: 50,
          };

          container.logger.log(
            formatLogMessage(LOG_MESSAGES.SUCCESS.CATEGORIZATION_COMPLETED, {
              categories: result.categories.join(", "),
            })
          );

          return result;
        }, "categorization_processing");

        return result;
      },
    },
    database: {
      updateNoteCategories: async (noteId: string, categories: string[]) => {
        const { result } = await measureExecutionTime(async () => {
          container.logger.log(
            formatLogMessage(LOG_MESSAGES.INFO.CATEGORIZATION_DATABASE_UPDATE, {
              noteId,
              categories: categories.join(", "),
            })
          );

          // TODO: Implement actual database update
          const result = { noteId, categories };

          container.logger.log(
            formatLogMessage(
              LOG_MESSAGES.SUCCESS.CATEGORIZATION_DATABASE_UPDATED,
              {
                noteId,
              }
            )
          );

          return result;
        }, "categorization_database_update");

        return result;
      },
      updateNoteTags: async (noteId: string, tags: string[]) => {
        const { result } = await measureExecutionTime(async () => {
          container.logger.log(
            formatLogMessage(LOG_MESSAGES.INFO.CATEGORIZATION_TAGS_UPDATE, {
              noteId,
              tags: tags.join(", "),
            })
          );

          // TODO: Implement actual database update
          const result = { noteId, tags };

          container.logger.log(
            formatLogMessage(LOG_MESSAGES.SUCCESS.CATEGORIZATION_TAGS_UPDATED, {
              noteId,
            })
          );

          return result;
        }, "categorization_tags_update");

        return result;
      },
    },
  };

  return new CategorizationWorker(queue, dependencies);
}
