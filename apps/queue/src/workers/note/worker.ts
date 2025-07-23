import { createNoteWorkerDependencies } from "./dependencies";
import { createNotePipeline } from "./pipeline";

import { Queue } from "bullmq";

import { WORKER_CONSTANTS } from "../../config/constants";
import { registerNoteActions } from "../../services/actions/note";
import type {
  NotePipelineData,
  NoteWorkerDependencies,
} from "../../services/actions/note/types";
import { IServiceContainer } from "../../services/container";
import type { ActionFactory } from "../core/action-factory";
import { BaseWorker } from "../core/base-worker";
import type { ActionContext, WorkerAction } from "../core/types";

/**
 * Worker responsible for processing note jobs.
 * Orchestrates the note action pipeline.
 */
export class NoteWorker extends BaseWorker<
  NotePipelineData,
  NoteWorkerDependencies,
  NotePipelineData
> {
  /**
   * Registers all note-related actions with the action factory.
   */
  protected registerActions(): void {
    registerNoteActions(
      this.actionFactory as ActionFactory<
        NotePipelineData,
        NoteWorkerDependencies,
        NotePipelineData
      >
    );
  }

  /**
   * Returns the operation name for this worker (used in logging and status).
   */
  protected getOperationName(): string {
    return WORKER_CONSTANTS.NAMES.NOTE;
  }

  /**
   * Helper to create a retryable, error-handled action for the pipeline.
   * @param name - Action name
   * @param deps - Dependencies
   */
  public createWrappedAction(
    name: string,
    deps: NoteWorkerDependencies
  ): WorkerAction<NotePipelineData, NoteWorkerDependencies, NotePipelineData> {
    return this.createRetryableErrorHandledAction(name, deps);
  }

  /**
   * Helper to create an error-handled-only action for the pipeline.
   * @param name - Action name
   * @param deps - Dependencies
   */
  public createErrorHandledAction(
    name: string,
    deps: NoteWorkerDependencies
  ): WorkerAction<NotePipelineData, NoteWorkerDependencies, NotePipelineData> {
    return this.createErrorHandledActionOnly(name, deps);
  }

  /**
   * Builds the action pipeline for a given note job.
   * Delegates to createNotePipeline with the required dependencies.
   */
  protected createActionPipeline(
    _data: NotePipelineData,
    _context: ActionContext
  ) {
    return createNotePipeline({
      createWrappedAction: this.createWrappedAction.bind(this),
      createErrorHandledAction: this.createErrorHandledAction.bind(this),
      dependencies: this.dependencies,
    });
  }
}

/**
 * Factory function for creating a NoteWorker.
 * @param queue - BullMQ queue
 * @param container - Service container
 * @returns NoteWorker instance
 */
export function createNoteWorker(
  queue: Queue,
  container: IServiceContainer
): NoteWorker {
  const dependencies = createNoteWorkerDependencies(container);
  return new NoteWorker(queue, dependencies);
}
