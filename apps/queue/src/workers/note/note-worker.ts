import { Queue } from "bullmq";
import {
  BaseWorker,
  createBaseDependenciesFromContainer,
} from "../core/base-worker";
import type { ActionContext } from "../core/types";

import { registerNoteActions } from "./actions";
import { IServiceContainer } from "../../services/container";
import { MissingDependencyError } from "../core/errors";
import type {
  NoteWorkerDependencies,
  NoteJobData,
  NoteWithParsedLines,
  ParsedHtmlFile,
  NotePipelineStage1,
  NotePipelineStage2,
  NotePipelineStage3,
  NotePipelineStage4,
  NotePipelineAction,
} from "./types";

// ============================================================================
// ENHANCED WORKER CLASS
// ============================================================================

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
    _data: NotePipelineStage1,
    _context: ActionContext
  ): NotePipelineAction[] {
    const actions: NotePipelineAction[] = [];

    // 1. Parse HTML (with retry and error handling)
    // Input: NotePipelineStage1 -> Output: NotePipelineStage2
    actions.push(this.createWrappedAction("parse_html", this.dependencies));

    // 2. Save note (with retry and error handling)
    // Input: NotePipelineStage2 -> Output: NotePipelineStage3
    actions.push(this.createWrappedAction("save_note", this.dependencies));

    // 3. Add "PROCESSING" status after note is created
    // Input: NotePipelineStage3 -> Output: NotePipelineStage3
    actions.push(
      this.createErrorHandledAction("add_processing_status", this.dependencies)
    );

    // 4. Schedule follow-up processing tasks (COMMENTED OUT FOR SIMPLIFIED TESTING)
    // const scheduleActions = [
    //   "schedule_source",
    //   "schedule_images",
    //   "schedule_ingredients",
    //   "schedule_instructions",
    // ] as const;

    // scheduleActions.forEach((actionName) => {
    //   actions.push(
    //     this.createErrorHandledAction(actionName, this.dependencies)
    //   );
    // });

    // 5. Add "COMPLETED" status at the very end
    // Input: NotePipelineStage3 -> Output: NotePipelineStage3
    actions.push(
      this.createErrorHandledAction("add_completed_status", this.dependencies)
    );

    return actions;
  }

  /**
   * Type-safe method to get the expected output type of the pipeline
   */
  public getExpectedOutputType(): NotePipelineStage3 {
    // This method is for type checking only - it should never be called at runtime
    throw new Error("This method is for type checking only");
  }

  /**
   * Get the current pipeline stage type for a given stage number
   */
  public getPipelineStageType<T extends 1 | 2 | 3 | 4>(
    _stage: T
  ): T extends 1
    ? NotePipelineStage1
    : T extends 2
      ? NotePipelineStage2
      : T extends 3
        ? NotePipelineStage3
        : NotePipelineStage4 {
    // This method is for type checking only - it should never be called at runtime
    throw new Error("This method is for type checking only");
  }
}

// ============================================================================
// FACTORY FUNCTION WITH ENHANCED TYPES
// ============================================================================

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

// ============================================================================
// ENHANCED DEPENDENCY CREATION
// ============================================================================

/**
 * Static helper to create note-specific dependencies from a container
 */
function createNoteDependenciesFromContainer(container: IServiceContainer): {
  parseHTML: (content: string) => Promise<ParsedHtmlFile>;
  createNote: (file: ParsedHtmlFile) => Promise<NoteWithParsedLines>;
  ingredientQueue: Queue;
  instructionQueue: Queue;
  imageQueue: Queue;
  categorizationQueue: Queue;
  sourceQueue: Queue;
} {
  return {
    parseHTML: async (content: string): Promise<ParsedHtmlFile> => {
      if (!container.parsers?.parseHTML) {
        throw new Error("parseHTML function not available");
      }
      const result = await container.parsers.parseHTML(content);
      return result as ParsedHtmlFile;
    },
    createNote: async (file: ParsedHtmlFile): Promise<NoteWithParsedLines> => {
      if (!container.database?.createNote) {
        throw new Error("createNote function not available");
      }
      const result = await container.database.createNote(file);
      return result as NoteWithParsedLines;
    },
    ingredientQueue: container.queues.ingredientQueue,
    instructionQueue: container.queues.instructionQueue,
    imageQueue: container.queues.imageQueue,
    categorizationQueue: container.queues.categorizationQueue,
    sourceQueue: container.queues.sourceQueue,
  };
}
