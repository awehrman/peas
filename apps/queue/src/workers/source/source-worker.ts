import { Queue } from "bullmq";
import { BaseWorker } from "../core/base-worker";
import { ActionContext } from "../core/types";
import { ProcessSourceAction, SaveSourceAction } from "./actions";
import { AddProcessingStatusAction, AddCompletedStatusAction } from "./actions";
import { IServiceContainer } from "../../services/container";
import type { SourceWorkerDependencies, SourceJobData } from "./types";
import type { BaseAction } from "../core/base-action";
import type { NoteStatus } from "@peas/database";

/**
 * Source Worker that extends BaseWorker for source processing
 */
export class SourceWorker extends BaseWorker<
  SourceJobData,
  SourceWorkerDependencies
> {
  protected registerActions(): void {
    // Register source actions
    this.actionFactory.register(
      "process_source",
      () => new ProcessSourceAction()
    );
    this.actionFactory.register("save_source", () => new SaveSourceAction());
    this.actionFactory.register(
      "source_processing_status",
      () => new AddProcessingStatusAction()
    );
    this.actionFactory.register(
      "source_completed_status",
      () => new AddCompletedStatusAction()
    );
  }

  protected getOperationName(): string {
    return "source_processing";
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
    // Base dependencies
    addStatusEventAndBroadcast: async (event: {
      noteId: string;
      status: NoteStatus;
      message?: string;
      context?: string;
      currentCount?: number;
      totalCount?: number;
    }) => {
      console.log(
        "[SOURCE_WORKER] addStatusEventAndBroadcast called with:",
        event
      );
      console.log(
        "[SOURCE_WORKER] container.statusBroadcaster:",
        container.statusBroadcaster
      );
      console.log(
        "[SOURCE_WORKER] container.statusBroadcaster.addStatusEventAndBroadcast:",
        container.statusBroadcaster?.addStatusEventAndBroadcast
      );

      if (container.statusBroadcaster?.addStatusEventAndBroadcast) {
        return container.statusBroadcaster.addStatusEventAndBroadcast(event);
      } else {
        console.log("[SOURCE_WORKER] Using fallback function");
        return Promise.resolve();
      }
    },
    ErrorHandler: container.errorHandler?.errorHandler || {
      withErrorHandling: async (operation) => operation(),
    },
    logger: container.logger,

    // Source-specific dependencies
    sourceProcessor: {
      processSource: async (data: Record<string, unknown>) => {
        container.logger.log(
          `[SOURCE] Processing source for note ${(data.noteId as string) || "unknown"}`
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
          `[SOURCE] Source processing completed: ${result.processedData.title}`
        );
        return result;
      },
    },
    database: {
      saveSource: async (data: Record<string, unknown>) => {
        container.logger.log(
          `[SOURCE] Saving source: ${(data.title as string) || "Untitled"}`
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
          `[SOURCE] Source saved successfully: ${savedSource.id}`
        );
        return savedSource;
      },
    },
  };

  return new SourceWorker(queue, dependencies);
}
