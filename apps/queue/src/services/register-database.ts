import type { NoteWithParsedLines, ParsedHTMLFile } from "@peas/database";

import { prisma } from "../config/database";
import { createLogger } from "../utils/standardized-logger";

const logger = createLogger("DatabaseService");

export interface IDatabaseService {
  prisma: typeof prisma;
  createNote?: (file: ParsedHTMLFile) => Promise<NoteWithParsedLines>;
  createNoteCompletionTracker?: (
    noteId: string,
    totalJobs: number
  ) => Promise<Record<string, unknown>>;
  updateNoteCompletionTracker?: (
    noteId: string,
    completedJobs: number
  ) => Promise<Record<string, unknown>>;
  incrementNoteCompletionTracker?: (
    noteId: string
  ) => Promise<Record<string, unknown>>;
  checkNoteCompletion?: (noteId: string) => Promise<{
    isComplete: boolean;
    completedJobs: number;
    totalJobs: number;
  }>;
  getNoteTitle?: (noteId: string) => Promise<string | null>;
  updateInstructionLine?: (
    id: string,
    data: Record<string, unknown>
  ) => Promise<Record<string, unknown>>;
  createInstructionSteps?: (
    steps: Array<Record<string, unknown>>
  ) => Promise<Record<string, unknown>>;
}

// In-memory job completion tracker
// Maps noteId to completion status
interface JobCompletionTracker {
  totalJobs: number;
  completedJobs: number;
  isComplete: boolean;
}

const jobCompletionTracker = new Map<string, JobCompletionTracker>();

export class DatabaseService implements IDatabaseService {
  // Method to clear the tracker for testing purposes
  static clearJobCompletionTracker() {
    jobCompletionTracker.clear();
  }
  public prisma = prisma;

  get createNote() {
    return async (file: ParsedHTMLFile): Promise<NoteWithParsedLines> => {
      // Import the real createNote function from the database package
      const { createNote } = await import("@peas/database");
      return createNote(file);
    };
  }

  get createNoteCompletionTracker() {
    return async (
      noteId: string,
      totalJobs: number
    ): Promise<Record<string, unknown>> => {
      // Initialize tracking for this note
      jobCompletionTracker.set(noteId, {
        totalJobs,
        completedJobs: 0,
        isComplete: false,
      });
      logger.info("Created completion tracker", { noteId, totalJobs });
      return {};
    };
  }

  get updateNoteCompletionTracker() {
    return async (
      noteId: string,
      completedJobs: number
    ): Promise<Record<string, unknown>> => {
      const tracker = jobCompletionTracker.get(noteId);
      if (tracker) {
        // Update the completed jobs count (this represents the current job that just completed)
        tracker.completedJobs = completedJobs;
        tracker.isComplete = completedJobs >= tracker.totalJobs;
        logger.info("Updated completion tracker", {
          noteId,
          completedJobs,
          totalJobs: tracker.totalJobs,
          isComplete: tracker.isComplete,
        });
      } else {
        logger.info("No completion tracker found, creating fallback", {
          noteId,
          completedJobs,
        });
        // Create a tracker if one doesn't exist (fallback)
        jobCompletionTracker.set(noteId, {
          totalJobs: completedJobs,
          completedJobs: completedJobs,
          isComplete: true,
        });
      }
      return {};
    };
  }

  get incrementNoteCompletionTracker() {
    return async (noteId: string): Promise<Record<string, unknown>> => {
      const tracker = jobCompletionTracker.get(noteId);
      if (tracker) {
        // Only increment if we haven't already completed all jobs
        if (tracker.completedJobs < tracker.totalJobs) {
          tracker.completedJobs += 1;
          tracker.isComplete = tracker.completedJobs >= tracker.totalJobs;
          logger.info("Incremented completion tracker", {
            noteId,
            completedJobs: tracker.completedJobs,
            totalJobs: tracker.totalJobs,
            isComplete: tracker.isComplete,
          });
        } else {
          logger.info("Note already complete, skipping increment", {
            noteId,
            completedJobs: tracker.completedJobs,
            totalJobs: tracker.totalJobs,
          });
        }
      } else {
        logger.info(
          "No completion tracker found, creating fallback with 1 job",
          { noteId }
        );
        // Create a tracker if one doesn't exist (fallback)
        jobCompletionTracker.set(noteId, {
          totalJobs: 1,
          completedJobs: 1,
          isComplete: true,
        });
      }
      return {};
    };
  }

  get checkNoteCompletion() {
    return async (noteId: string) => {
      const tracker = jobCompletionTracker.get(noteId);

      if (!tracker) {
        logger.info("No completion tracker found, considering complete", {
          noteId,
        });
        return {
          isComplete: true,
          completedJobs: 0,
          totalJobs: 0,
        };
      }

      logger.info("Note completion status", {
        noteId,
        completedJobs: tracker.completedJobs,
        totalJobs: tracker.totalJobs,
        isComplete: tracker.isComplete,
      });

      return {
        isComplete: tracker.isComplete,
        completedJobs: tracker.completedJobs,
        totalJobs: tracker.totalJobs,
      };
    };
  }

  get getNoteTitle() {
    return async (noteId: string) => {
      try {
        const note = await this.prisma.note.findUnique({
          where: { id: noteId },
          select: { title: true },
        });
        return note?.title || null;
      } catch (error) {
        /* istanbul ignore next -- @preserve */
        logger.error("Error getting note title", {
          noteId,
          error: error instanceof Error ? error.message : String(error),
        });
        return null;
      }
    };
  }

  get updateInstructionLine() {
    return async (
      id: string,
      data: Record<string, unknown>
    ): Promise<Record<string, unknown>> => {
      // Simulate update
      return { id, ...data };
    };
  }

  get createInstructionSteps() {
    return async (
      steps: Array<Record<string, unknown>>
    ): Promise<Record<string, unknown>> => {
      // Simulate creation
      return { steps };
    };
  }
}

export function registerDatabase(): IDatabaseService {
  return new DatabaseService();
}
