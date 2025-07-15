import { Queue } from "bullmq";
import { BaseWorker } from "./core/base-worker";
import { BaseAction } from "./actions/core/base-action";
import { ActionContext } from "./actions/core/types";
import { registerNoteActions } from "./actions/note";
import { IServiceContainer } from "../services/container";
import { MissingDependencyError } from "./core/errors";
import type { NoteWorkerDependencies, NoteJobData } from "./types";

// Using imported types from ./types.ts

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
    _data: NoteJobData,
    _context: ActionContext
  ): BaseAction<any, any>[] {
    const actions: BaseAction<any, any>[] = [];

    // 1. Parse HTML (with retry and error handling)
    actions.push(this.createWrappedAction("parse_html", this.dependencies));

    // 2. Save note (with retry and error handling)
    actions.push(this.createWrappedAction("save_note", this.dependencies));

    // 3. Add "PROCESSING" status after note is created
    actions.push(
      this.createErrorHandledAction("add_processing_status", this.dependencies)
    );

    // 4. Schedule follow-up processing tasks (with error handling only, no retry)
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

    // 5. Add "COMPLETED" status at the very end
    actions.push(
      this.createErrorHandledAction("add_completed_status", this.dependencies)
    );

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
    addStatusEventAndBroadcast: async (event: any) => {
      console.log(
        "[NOTE_WORKER] addStatusEventAndBroadcast called with:",
        event
      );
      console.log(
        "[NOTE_WORKER] container.statusBroadcaster:",
        container.statusBroadcaster
      );
      console.log(
        "[NOTE_WORKER] container.statusBroadcaster.addStatusEventAndBroadcast:",
        container.statusBroadcaster?.addStatusEventAndBroadcast
      );

      if (container.statusBroadcaster?.addStatusEventAndBroadcast) {
        return container.statusBroadcaster.addStatusEventAndBroadcast(event);
      } else {
        console.log("[NOTE_WORKER] Using fallback function");
        return Promise.resolve();
      }
    },
    ErrorHandler: container.errorHandler?.errorHandler || {
      withErrorHandling: async (operation) => operation(),
    },
    logger: container.logger,

    // Note-specific dependencies
    parseHTML: async (content: string) => {
      container.logger.log(
        `[NOTE] Parsing HTML content (${content.length} characters)`
      );
      if (!container.parsers?.parseHTML) {
        throw new Error("parseHTML function not available");
      }
      const result = await container.parsers.parseHTML(content);
      container.logger.log(`[NOTE] Parsed: ${result.title || "Untitled"}`);
      return result;
    },
    createNote: async (file: any) => {
      container.logger.log(`[NOTE] Creating note: ${file.title || "Untitled"}`);
      if (!container.database?.createNote) {
        throw new Error("createNote function not available");
      }
      const result = await container.database.createNote(file);
      container.logger.log(`[NOTE] Created with ID: ${result.id}`);
      return result;
    },
    ingredientQueue: container.queues.ingredientQueue,
    instructionQueue: container.queues.instructionQueue,
    imageQueue: container.queues.imageQueue,
    categorizationQueue: container.queues.categorizationQueue,
  };

  return new NoteWorker(queue, dependencies);
}
