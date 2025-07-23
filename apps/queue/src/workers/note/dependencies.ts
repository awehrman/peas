import { LOG_MESSAGES } from "../../config/constants";
import type { ParsedHtmlFile } from "../../services/actions/note/schema";
import type {
  NoteWithParsedLines,
  NoteWorkerDependencies,
} from "../../services/actions/note/types";
import type { IServiceContainer } from "../../services/container";
import { formatLogMessage, measureExecutionTime } from "../../utils/utils";
import { createBaseDependenciesFromContainer } from "../core/worker-dependencies";

// Type definitions for database service results
interface CompletionTrackerResult {
  isComplete: boolean;
  completedJobs: number;
  totalJobs: number;
}

// Extended database service interface for methods that may not be in the base interface
interface ExtendedDatabaseService {
  updateNoteCompletionTracker?: (
    noteId: string,
    completedJobs: number
  ) => Promise<unknown>;
  incrementNoteCompletionTracker?: (noteId: string) => Promise<unknown>;
  checkNoteCompletion?: (noteId: string) => Promise<CompletionTrackerResult>;
}

/**
 * Factory for parsing dependencies.
 */
function createParsingDependencies(container: IServiceContainer) {
  return {
    parseHTML: async (content: string): Promise<ParsedHtmlFile> => {
      const { result } = await measureExecutionTime(async () => {
        if (!container.parsers?.parseHTML) {
          throw new Error("parseHTML function not available");
        }
        container.logger.log(
          formatLogMessage(LOG_MESSAGES.INFO.NOTE_HTML_PARSING_START, {
            contentLength: content.length,
          }),
          "info",
          { contentLength: content.length }
        );
        const result = await container.parsers.parseHTML(content);
        container.logger.log(
          formatLogMessage(LOG_MESSAGES.SUCCESS.NOTE_HTML_PARSING_COMPLETED, {
            contentLength: content.length,
          }),
          "info",
          { contentLength: content.length }
        );
        return result as ParsedHtmlFile;
      }, "note_html_parsing");
      return result;
    },
  };
}

/**
 * Factory for database dependencies.
 */
function createDatabaseDependencies(container: IServiceContainer) {
  return {
    createNote: async (file: ParsedHtmlFile): Promise<NoteWithParsedLines> => {
      const { result } = await measureExecutionTime(async () => {
        if (!container.database?.createNote) {
          throw new Error("createNote function not available");
        }
        container.logger.log(
          formatLogMessage(LOG_MESSAGES.INFO.NOTE_CREATION_START, {
            fileName: file.title || "unknown",
          }),
          "info",
          { fileName: file.title || "unknown" }
        );

        // Convert ParsedHtmlFile to the format expected by createNote
        const noteData = {
          title: file.title,
          html: file.contents, // Use contents as html
          imageUrl: file.image,
        };

        const result = await container.database.createNote(noteData);
        container.logger.log(
          formatLogMessage(LOG_MESSAGES.SUCCESS.NOTE_CREATION_COMPLETED, {
            fileName: file.title || "unknown",
          }),
          "info",
          { fileName: file.title || "unknown" }
        );

        // Convert the result to NoteWithParsedLines format
        const dbResult = result as Record<string, unknown>;
        const noteWithParsedLines: NoteWithParsedLines = {
          id: (dbResult.id as string) || "unknown",
          title: (dbResult.title as string | null) || file.title,
          content: file.contents,
          html: file.contents,
          imageUrl: file.image,
          createdAt: (dbResult.createdAt as Date) || new Date(),
          updatedAt: (dbResult.updatedAt as Date) || new Date(),
          parsedIngredientLines: file.ingredients.map((ing, index) => ({
            id: `ingredient-${index}`,
            reference: ing.reference,
            blockIndex: ing.blockIndex,
            lineIndex: ing.lineIndex,
          })),
          parsedInstructionLines: file.instructions.map((inst, index) => ({
            id: `instruction-${index}`,
            originalText: inst.reference,
            lineIndex: inst.lineIndex,
          })),
        };

        return noteWithParsedLines;
      }, "note_creation");
      return result;
    },
    createNoteCompletionTracker: async (noteId: string, totalJobs: number) => {
      const { result } = await measureExecutionTime(async () => {
        if (container.database.createNoteCompletionTracker) {
          container.logger.log(
            formatLogMessage(
              LOG_MESSAGES.INFO.NOTE_COMPLETION_TRACKER_CREATION,
              { noteId, totalJobs }
            ),
            "info",
            { noteId, totalJobs }
          );
          const result = await container.database.createNoteCompletionTracker(
            noteId,
            totalJobs
          );
          container.logger.log(
            formatLogMessage(
              LOG_MESSAGES.SUCCESS.NOTE_COMPLETION_TRACKER_CREATED,
              { noteId }
            ),
            "info",
            { noteId }
          );
          return result || { noteId, totalJobs, completedJobs: 0 };
        }
        return { noteId, totalJobs, completedJobs: 0 };
      }, "note_completion_tracker_creation");
      return result;
    },
    updateNoteCompletionTracker: async (
      noteId: string,
      completedJobs: number
    ) => {
      const { result } = await measureExecutionTime(async () => {
        // Check if the method exists on the database service
        const dbService = container.database as ExtendedDatabaseService;
        if (dbService.updateNoteCompletionTracker) {
          container.logger.log(
            formatLogMessage(LOG_MESSAGES.INFO.NOTE_COMPLETION_TRACKER_UPDATE, {
              noteId,
              completedJobs,
            }),
            "info",
            { noteId, completedJobs }
          );
          const result = await dbService.updateNoteCompletionTracker(
            noteId,
            completedJobs
          );
          container.logger.log(
            formatLogMessage(
              LOG_MESSAGES.SUCCESS.NOTE_COMPLETION_TRACKER_UPDATED,
              { noteId }
            ),
            "info",
            { noteId }
          );
          return result;
        }
        return Promise.resolve();
      }, "note_completion_tracker_update");
      return result;
    },
    incrementNoteCompletionTracker: async (noteId: string) => {
      const { result } = await measureExecutionTime(async () => {
        // Check if the method exists on the database service
        const dbService = container.database as ExtendedDatabaseService;
        if (dbService.incrementNoteCompletionTracker) {
          container.logger.log(
            formatLogMessage(
              LOG_MESSAGES.INFO.NOTE_COMPLETION_TRACKER_INCREMENT,
              { noteId }
            ),
            "info",
            { noteId }
          );
          const result = await dbService.incrementNoteCompletionTracker(noteId);
          container.logger.log(
            formatLogMessage(
              LOG_MESSAGES.SUCCESS.NOTE_COMPLETION_TRACKER_INCREMENTED,
              { noteId }
            ),
            "info",
            { noteId }
          );
          return result;
        }
        return Promise.resolve();
      }, "note_completion_tracker_increment");
      return result;
    },
    checkNoteCompletion: async (noteId: string) => {
      const { result } = await measureExecutionTime(async () => {
        // Check if the method exists on the database service
        const dbService = container.database as ExtendedDatabaseService;
        if (dbService.checkNoteCompletion) {
          container.logger.log(
            formatLogMessage(LOG_MESSAGES.INFO.NOTE_COMPLETION_CHECK, {
              noteId,
            }),
            "info",
            { noteId }
          );
          const result = await dbService.checkNoteCompletion(noteId);
          container.logger.log(
            formatLogMessage(LOG_MESSAGES.SUCCESS.NOTE_COMPLETION_CHECKED, {
              noteId,
              isComplete: result.isComplete ? "true" : "false",
            }),
            "info",
            { noteId, isComplete: result.isComplete ? "true" : "false" }
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
  };
}

/**
 * Factory for status dependencies.
 */
function createStatusDependencies(container: IServiceContainer) {
  return {
    addStatusEventAndBroadcast: async (
      event: Record<string, unknown>
    ): Promise<void> => {
      if (container.statusBroadcaster?.addStatusEventAndBroadcast) {
        await container.statusBroadcaster.addStatusEventAndBroadcast(event);
      }
      // Always return void
    },
  };
}

/**
 * Factory for creating all note worker dependencies.
 * Combines base, parsing, database, and status dependencies.
 */
export function createNoteWorkerDependencies(
  container: IServiceContainer
): NoteWorkerDependencies {
  return {
    ...createBaseDependenciesFromContainer(container),
    ...createParsingDependencies(container),
    ...createDatabaseDependencies(container),
    ...createStatusDependencies(container),
    // ingredientQueue: container.queues.ingredientQueue,
    // instructionQueue: container.queues.instructionQueue,
    // imageQueue: container.queues.imageQueue,
    // categorizationQueue: container.queues.categorizationQueue,
    // sourceQueue: container.queues.sourceQueue,
  };
}
