import { Queue } from "bullmq";
import {
  BaseWorker,
  createBaseDependenciesFromContainer,
} from "../core/base-worker";
import { ActionContext } from "../core/types";
import { registerSourceActions } from "./actions";
import { IServiceContainer } from "../../services/container";
import { WORKER_CONSTANTS, LOG_MESSAGES } from "../../config/constants";
import { formatLogMessage, measureExecutionTime } from "../../utils/utils";
import type { SourceWorkerDependencies, SourceJobData } from "./types";
import type { BaseAction } from "../core/base-action";

/**
 * Source Worker that extends BaseWorker for source processing
 */
export class SourceWorker extends BaseWorker<
  SourceJobData,
  SourceWorkerDependencies
> {
  protected registerActions(): void {
    registerSourceActions(this.actionFactory);
  }

  protected getOperationName(): string {
    return WORKER_CONSTANTS.NAMES.SOURCE;
  }

  protected createActionPipeline(
    _data: SourceJobData,
    _context: ActionContext
  ): BaseAction<unknown, unknown>[] {
    const actions: BaseAction<unknown, unknown>[] = [];

    // 1. Process source (with retry and error handling)
    actions.push(this.createWrappedAction("process_source", this.dependencies));

    // 2. Save source (with retry and error handling)
    actions.push(this.createWrappedAction("save_source", this.dependencies));

    // 3. Add "PROCESSING" status after source is created
    actions.push(
      this.createErrorHandledAction(
        "source_processing_status",
        this.dependencies
      )
    );

    // 4. Add "COMPLETED" status at the very end
    actions.push(
      this.createErrorHandledAction(
        "source_completed_status",
        this.dependencies
      )
    );

    return actions;
  }
}

/**
 * Factory function to create a source worker with dependencies from the service container
 */
export function createSourceWorker(
  queue: Queue,
  container: IServiceContainer
): SourceWorker {
  const dependencies: SourceWorkerDependencies = {
    // Base dependencies from helper methods
    ...createBaseDependenciesFromContainer(container),

    // Source-specific dependencies
    sourceProcessor: {
      processSource: async (data: Record<string, unknown>) => {
        const { result } = await measureExecutionTime(async () => {
          const noteId = (data.noteId as string) || "unknown";
          container.logger.log(
            formatLogMessage(LOG_MESSAGES.INFO.SOURCE_PROCESSING_START, {
              noteId,
            })
          );

          // TODO: Implement actual source processing
          const result = {
            success: true,
            processedData: {
              title: (data.title as string) || "Untitled Source",
              content: (data.content as string) || "",
              metadata: {
                type: "source",
                processedAt: new Date().toISOString(),
              },
            },
            processingTime: 50,
          };

          container.logger.log(
            formatLogMessage(LOG_MESSAGES.SUCCESS.SOURCE_PROCESSING_COMPLETED, {
              title: result.processedData.title,
            })
          );

          return result;
        }, "source_processing");

        return result;
      },
    },
    database: {
      saveSource: async (data: Record<string, unknown>) => {
        const { result } = await measureExecutionTime(async () => {
          const title = (data.title as string) || "Untitled";
          container.logger.log(
            formatLogMessage(LOG_MESSAGES.INFO.SOURCE_SAVING_START, {
              title,
            })
          );

          // TODO: Implement actual source saving
          const savedSource = {
            id: `source_${Date.now()}`,
            title: (data.title as string) || "Untitled Source",
            content: (data.content as string) || "",
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          container.logger.log(
            formatLogMessage(LOG_MESSAGES.SUCCESS.SOURCE_SAVED, {
              id: savedSource.id,
            })
          );

          return savedSource;
        }, "source_saving");

        return result;
      },
    },
  };

  return new SourceWorker(queue, dependencies);
}
