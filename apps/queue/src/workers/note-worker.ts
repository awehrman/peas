import { Queue } from "bullmq";
import {
  BaseWorker,
  BaseWorkerDependencies,
  BaseJobData,
} from "./core/base-worker";
import { BaseAction } from "./actions/core/base-action";
import { ActionContext } from "./actions/core/types";
import { registerNoteActions } from "./actions/note";
import { IServiceContainer } from "../services/container";
import { MissingDependencyError } from "./core/errors";

export interface NoteWorkerDependencies extends BaseWorkerDependencies {
  // Core dependencies
  parseHTML: (content: string) => Promise<any>;
  createNote: (file: any) => Promise<any>;

  // Queue dependencies
  ingredientQueue: Queue;
  instructionQueue: Queue;
  imageQueue: Queue;
  categorizationQueue: Queue;
}

export interface NoteJobData extends BaseJobData {
  content: string;
}

/**
 * Note Worker that extends BaseWorker for note processing
 */
export class NoteWorker extends BaseWorker<
  NoteJobData,
  NoteWorkerDependencies
> {
  protected registerActions(): void {
    // Register note actions - this is safe to call multiple times
    // as the factory will handle duplicate registrations gracefully
    registerNoteActions(this.actionFactory);
  }

  protected getOperationName(): string {
    return "note_processing";
  }

  protected createActionPipeline(
    data: NoteJobData,
    _context: ActionContext
  ): BaseAction<any, any>[] {
    const actions: BaseAction<any, any>[] = [];

    // Add standard status actions if we have a noteId
    this.addStatusActions(actions, data);

    // 1. Parse HTML (with retry and error handling)
    actions.push(this.createWrappedAction("parse_html", this.dependencies));

    // 2. Save note (with retry and error handling)
    actions.push(this.createWrappedAction("save_note", this.dependencies));

    // 3. Schedule follow-up processing tasks (with error handling only, no retry)
    const scheduleActions = [
      "schedule_categorization",
      "schedule_images",
      "schedule_ingredients",
      "schedule_instructions",
    ];

    scheduleActions.forEach((actionName) => {
      actions.push(
        this.createErrorHandledAction(actionName, this.dependencies)
      );
    });

    return actions;
  }
}

/**
 * Factory function to create a note worker with dependencies from the service container
 */
export function createNoteWorker(
  queue: Queue,
  container: IServiceContainer
): NoteWorker {
  // Validate required dependencies
  if (!container.parsers?.parseHTML) {
    throw new MissingDependencyError(
      "parseHTML function is required",
      "note_processing",
      "parseHTML"
    );
  }

  if (!container.database?.createNote) {
    throw new MissingDependencyError(
      "createNote function is required",
      "note_processing",
      "createNote"
    );
  }

  const dependencies: NoteWorkerDependencies = {
    // Base dependencies
    addStatusEventAndBroadcast:
      container.statusBroadcaster?.addStatusEventAndBroadcast ||
      (() => Promise.resolve()),
    ErrorHandler: container.errorHandler?.errorHandler || {
      withErrorHandling: async (operation) => operation(),
    },
    logger: container.logger,

    // Note-specific dependencies
    parseHTML: container.parsers.parseHTML,
    createNote: container.database.createNote,
    ingredientQueue: container.queues.ingredientQueue,
    instructionQueue: container.queues.instructionQueue,
    imageQueue: container.queues.imageQueue,
    categorizationQueue: container.queues.categorizationQueue,
  };

  return new NoteWorker(queue, dependencies);
}
