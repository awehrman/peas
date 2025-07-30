import { buildNoteWorkerDependencies } from "./dependencies";
import { createNotePipeline } from "./pipeline";

import { Queue } from "bullmq";

import { IServiceContainer } from "../../services/container";
import { registerNoteActions } from "../../services/note/register";
import type {
  NotePipelineData,
  NoteWorkerDependencies,
} from "../../types/notes";
import { ActionFactory } from "../core/action-factory";
import { BaseWorker } from "../core/base-worker";
import type { ActionContext, WorkerAction } from "../core/types";

/**
 * NoteWorker class that extends BaseWorker for processing note jobs
 */
export class NoteWorker extends BaseWorker<
  NotePipelineData,
  NoteWorkerDependencies,
  NotePipelineData
> {
  protected actionFactory: ActionFactory<
    NotePipelineData,
    NoteWorkerDependencies,
    NotePipelineData
  >;

  constructor(
    queue: Queue,
    dependencies: NoteWorkerDependencies,
    actionFactory: ActionFactory<
      NotePipelineData,
      NoteWorkerDependencies,
      NotePipelineData
    >,
    container: IServiceContainer
  ) {
    super(queue, dependencies, actionFactory, container);
    this.actionFactory = actionFactory;
    this.registerActions();
  }

  /**
   * Register actions specific to note processing
   * This is where all note-related actions are registered with the factory
   */
  protected registerActions(): void {
    // Register all note actions using the centralized registration function
    registerNoteActions(this.actionFactory);
  }

  /**
   * Get the operation name for this worker
   */
  protected getOperationName(): string {
    return "note-worker";
  }

  /**
   * Create the action pipeline for note processing
   */
  protected createActionPipeline(
    data: NotePipelineData,
    context: ActionContext
  ): WorkerAction<
    NotePipelineData,
    NoteWorkerDependencies,
    NotePipelineData
  >[] {
    return createNotePipeline(
      this.actionFactory,
      this.dependencies,
      data,
      context
    );
  }
}

/**
 * Create a note worker instance
 */
export function createNoteWorker(
  queue: Queue,
  container: IServiceContainer
): NoteWorker {
  const dependencies = buildNoteWorkerDependencies(container);
  const actionFactory = new ActionFactory<
    NotePipelineData,
    NoteWorkerDependencies,
    NotePipelineData
  >();

  return new NoteWorker(queue, dependencies, actionFactory, container);
}
