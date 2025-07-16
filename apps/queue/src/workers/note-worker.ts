import { Queue } from "bullmq";
import {
  BaseWorker,
  createBaseDependenciesFromContainer,
} from "./core/base-worker";
import { BaseAction } from "./actions/core/base-action";

import { registerNoteActions } from "./actions/note";
import { IServiceContainer } from "../services/container";
import { MissingDependencyError } from "./core/errors";
import type {
  NoteWorkerDependencies,
  NoteJobData,
  NoteWithParsedLines,
  ActionPipeline,
  ActionContext,
} from "./types";
import type { ParsedHTMLFile } from "../types";

// Define the data flow types for the note pipeline stages
type NotePipelineInput = NoteJobData;
type NotePipelineOutput = NoteJobData & {
  file: ParsedHTMLFile;
  note: NoteWithParsedLines;
};

export class NoteWorker extends BaseWorker<
  NoteJobData,
  NoteWorkerDependencies
> {
  protected registerActions(): void {
    registerNoteActions(this.actionFactory);
  }

  protected getOperationName(): string {
    return "note_processing";
  }

  public validateDependencies(): void {
    if (!this.container?.parsers?.parseHTML) {
      throw new MissingDependencyError(
        "parseHTML function is required",
        "note_processing",
        "parseHTML"
      );
    }

    if (!this.container?.database?.createNote) {
      throw new MissingDependencyError(
        "createNote function is required",
        "note_processing",
        "createNote"
      );
    }
  }

  protected createActionPipeline(
    _data: NotePipelineInput,
    _context: ActionContext
  ): ActionPipeline<NotePipelineInput, NotePipelineOutput> {
    const actions: BaseAction<unknown, unknown>[] = [];

    // 1. Parse HTML (with retry and error handling)
    // Input: NoteJobData -> Output: NoteJobData & { file: ParsedHTMLFile }
    actions.push(this.createWrappedAction("parse_html", this.dependencies));

    // 2. Save note (with retry and error handling)
    // Input: NoteJobData & { file: ParsedHTMLFile } -> Output: NoteJobData & { file: ParsedHTMLFile, note: NoteWithParsedLines }
    actions.push(this.createWrappedAction("save_note", this.dependencies));

    // 3. Add "PROCESSING" status after note is created
    // Input: NoteJobData & { file: ParsedHTMLFile, note: NoteWithParsedLines } -> Output: same
    actions.push(
      this.createErrorHandledAction("add_processing_status", this.dependencies)
    );

    // 4. Schedule follow-up processing tasks (with error handling only, no retry)
    // const scheduleActions = [
    //   "schedule_categorization",
    //   "schedule_images",
    //   "schedule_ingredients",
    //   "schedule_instructions",
    // ];

    // scheduleActions.forEach((actionName) => {
    //   actions.push(
    //     this.createErrorHandledAction(actionName, this.dependencies)
    //   );
    // });

    // 5. Add "COMPLETED" status at the very end
    // Input: NoteJobData & { file: ParsedHTMLFile, note: NoteWithParsedLines } -> Output: same
    actions.push(
      this.createErrorHandledAction("add_completed_status", this.dependencies)
    );

    return actions as ActionPipeline<NotePipelineInput, NotePipelineOutput>;
  }

  /**
   * Type-safe method to get the expected output type of the pipeline
   */
  public getExpectedOutputType(): NotePipelineOutput {
    // This method is for type checking only - it should never be called at runtime
    throw new Error("This method is for type checking only");
  }
}

export function createNoteWorker(
  queue: Queue,
  container: IServiceContainer
): NoteWorker {
  const dependencies: NoteWorkerDependencies = {
    // Base dependencies from helper methods
    ...createBaseDependenciesFromContainer(container),
    // Note-specific dependencies
    ...createNoteDependenciesFromContainer(container),
  };

  const worker = new NoteWorker(queue, dependencies, undefined, container);
  worker.validateDependencies();
  return worker;
}

/**
 * Static helper to create note-specific dependencies from a container
 */
function createNoteDependenciesFromContainer(container: IServiceContainer) {
  return {
    parseHTML: async (content: string) => {
      if (!container.parsers?.parseHTML) {
        throw new Error("parseHTML function not available");
      }
      const result = await container.parsers.parseHTML(content);
      return result;
    },
    createNote: async (file: ParsedHTMLFile) => {
      if (!container.database?.createNote) {
        throw new Error("createNote function not available");
      }
      const result = await container.database.createNote(file);
      return result;
    },
    ingredientQueue: container.queues.ingredientQueue,
    instructionQueue: container.queues.instructionQueue,
    imageQueue: container.queues.imageQueue,
    categorizationQueue: container.queues.categorizationQueue,
    sourceQueue: container.queues.sourceQueue,
  };
}
