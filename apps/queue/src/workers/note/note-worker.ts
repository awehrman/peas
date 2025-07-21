import { Queue } from "bullmq";
import {
  BaseWorker,
  createBaseDependenciesFromContainer,
} from "../core/base-worker";
import type { ActionContext } from "../core/types";

import { registerNoteActions } from "./actions";
import { ActionName } from "../../types";
import { IServiceContainer } from "../../services/container";
import { MissingDependencyError } from "../core/errors";
import { WORKER_CONSTANTS, LOG_MESSAGES } from "../../config/constants";
import { formatLogMessage, measureExecutionTime } from "../../utils/utils";
import type {
  NoteWorkerDependencies,
  NoteJobData,
  NoteWithParsedLines,
  NotePipelineStage1,
  NotePipelineStage2,
  NotePipelineStage3,
  NotePipelineStage4,
  NotePipelineAction,
  StatusEvent,
} from "./types";
import type { ParsedHtmlFile } from "./schema";

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
    return WORKER_CONSTANTS.NAMES.NOTE;
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

    // 1. Clean HTML (remove style and icons tags)
    // Input: NotePipelineStage1 -> Output: NotePipelineStage1 (cleaned)
    actions.push(
      this.createWrappedAction(ActionName.CLEAN_HTML, this.dependencies)
    );

    // 2. Parse HTML (with retry and error handling)
    // Input: NotePipelineStage1 -> Output: NotePipelineStage2
    actions.push(
      this.createWrappedAction(ActionName.PARSE_HTML, this.dependencies)
    );

    // 3. Save note (with retry and error handling)
    // Input: NotePipelineStage2 -> Output: NotePipelineStage3
    actions.push(
      this.createWrappedAction(ActionName.SAVE_NOTE, this.dependencies)
    );

    // 4. Schedule all follow-up processing tasks concurrently
    // This action will schedule instruction and ingredient processing jobs
    actions.push(
      this.createErrorHandledAction(
        ActionName.SCHEDULE_ALL_FOLLOWUP_TASKS,
        this.dependencies
      )
    );

    // Note: Final completion status is handled by individual completion status actions
    // in ingredient and instruction workers, so we don't need note_completed_status here

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

function createNoteDependenciesFromContainer(container: IServiceContainer): {
  parseHTML: (content: string) => Promise<ParsedHtmlFile>;
  createNote: (file: ParsedHtmlFile) => Promise<NoteWithParsedLines>;
  ingredientQueue: Queue;
  instructionQueue: Queue;
  imageQueue: Queue;
  categorizationQueue: Queue;
  sourceQueue: Queue;
  addStatusEventAndBroadcast: (event: StatusEvent) => Promise<unknown>;
  database: {
    createNoteCompletionTracker: (
      noteId: string,
      totalJobs: number
    ) => Promise<unknown>;
    updateNoteCompletionTracker: (
      noteId: string,
      completedJobs: number
    ) => Promise<unknown>;
    incrementNoteCompletionTracker: (noteId: string) => Promise<unknown>;
    checkNoteCompletion: (noteId: string) => Promise<{
      isComplete: boolean;
      completedJobs: number;
      totalJobs: number;
    }>;
  };
} {
  return {
    parseHTML: async (content: string): Promise<ParsedHtmlFile> => {
      const { result } = await measureExecutionTime(async () => {
        if (!container.parsers?.parseHTML) {
          throw new Error("parseHTML function not available");
        }

        container.logger.log(
          formatLogMessage(LOG_MESSAGES.INFO.NOTE_HTML_PARSING_START, {
            contentLength: content.length,
          })
        );

        const result = await container.parsers.parseHTML(content);

        container.logger.log(
          formatLogMessage(LOG_MESSAGES.SUCCESS.NOTE_HTML_PARSING_COMPLETED, {
            contentLength: content.length,
          })
        );

        return result as ParsedHtmlFile;
      }, "note_html_parsing");

      return result;
    },
    createNote: async (file: ParsedHtmlFile): Promise<NoteWithParsedLines> => {
      const { result } = await measureExecutionTime(async () => {
        if (!container.database?.createNote) {
          throw new Error("createNote function not available");
        }

        container.logger.log(
          formatLogMessage(LOG_MESSAGES.INFO.NOTE_CREATION_START, {
            fileName: file.title || "unknown",
          })
        );

        const result = await container.database.createNote(file);

        container.logger.log(
          formatLogMessage(LOG_MESSAGES.SUCCESS.NOTE_CREATION_COMPLETED, {
            fileName: file.title || "unknown",
          })
        );

        return result as NoteWithParsedLines;
      }, "note_creation");

      return result;
    },
    ingredientQueue: container.queues.ingredientQueue,
    instructionQueue: container.queues.instructionQueue,
    imageQueue: container.queues.imageQueue,
    categorizationQueue: container.queues.categorizationQueue,
    sourceQueue: container.queues.sourceQueue,
    addStatusEventAndBroadcast: async (event: StatusEvent) => {
      if (container.statusBroadcaster?.addStatusEventAndBroadcast) {
        return container.statusBroadcaster.addStatusEventAndBroadcast(event);
      } else {
        return Promise.resolve();
      }
    },
    database: {
      createNoteCompletionTracker: async (
        noteId: string,
        totalJobs: number
      ) => {
        const { result } = await measureExecutionTime(async () => {
          if (container.database.createNoteCompletionTracker) {
            container.logger.log(
              formatLogMessage(
                LOG_MESSAGES.INFO.NOTE_COMPLETION_TRACKER_CREATION,
                {
                  noteId,
                  totalJobs,
                }
              )
            );

            const result = await container.database.createNoteCompletionTracker(
              noteId,
              totalJobs
            );

            container.logger.log(
              formatLogMessage(
                LOG_MESSAGES.SUCCESS.NOTE_COMPLETION_TRACKER_CREATED,
                {
                  noteId,
                }
              )
            );

            return result;
          }
          return Promise.resolve();
        }, "note_completion_tracker_creation");

        return result;
      },
      updateNoteCompletionTracker: async (
        noteId: string,
        completedJobs: number
      ) => {
        const { result } = await measureExecutionTime(async () => {
          if (container.database.updateNoteCompletionTracker) {
            container.logger.log(
              formatLogMessage(
                LOG_MESSAGES.INFO.NOTE_COMPLETION_TRACKER_UPDATE,
                {
                  noteId,
                  completedJobs,
                }
              )
            );

            const result = await container.database.updateNoteCompletionTracker(
              noteId,
              completedJobs
            );

            container.logger.log(
              formatLogMessage(
                LOG_MESSAGES.SUCCESS.NOTE_COMPLETION_TRACKER_UPDATED,
                {
                  noteId,
                }
              )
            );

            return result;
          }
          return Promise.resolve();
        }, "note_completion_tracker_update");

        return result;
      },
      incrementNoteCompletionTracker: async (noteId: string) => {
        const { result } = await measureExecutionTime(async () => {
          if (container.database.incrementNoteCompletionTracker) {
            container.logger.log(
              formatLogMessage(
                LOG_MESSAGES.INFO.NOTE_COMPLETION_TRACKER_INCREMENT,
                {
                  noteId,
                }
              )
            );

            const result =
              await container.database.incrementNoteCompletionTracker(noteId);

            container.logger.log(
              formatLogMessage(
                LOG_MESSAGES.SUCCESS.NOTE_COMPLETION_TRACKER_INCREMENTED,
                {
                  noteId,
                }
              )
            );

            return result;
          }
          return Promise.resolve();
        }, "note_completion_tracker_increment");

        return result;
      },
      checkNoteCompletion: async (noteId: string) => {
        const { result } = await measureExecutionTime(async () => {
          if (container.database.checkNoteCompletion) {
            container.logger.log(
              formatLogMessage(LOG_MESSAGES.INFO.NOTE_COMPLETION_CHECK, {
                noteId,
              })
            );

            const result = await container.database.checkNoteCompletion(noteId);

            container.logger.log(
              formatLogMessage(LOG_MESSAGES.SUCCESS.NOTE_COMPLETION_CHECKED, {
                noteId,
                isComplete: result.isComplete ? "true" : "false",
              })
            );

            return result;
          }
          // Fallback if database service doesn't have the method
          return {
            isComplete: true,
            completedJobs: 0,
            totalJobs: 0,
          };
        }, "note_completion_check");

        return result;
      },
    },
  };
}
