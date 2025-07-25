import type { ParsedHTMLFile } from "@peas/database";

import { prisma } from "../config/database";
import { PatternTracker } from "../workers/shared/pattern-tracker";
import { createLogger } from "../utils/standardized-logger";

const logger = createLogger("DatabaseService");

export interface IDatabaseService {
  prisma: typeof prisma;
  patternTracker: PatternTracker;
  createNote?: (file: ParsedHTMLFile) => Promise<unknown>;
  createNoteCompletionTracker?: (
    noteId: string,
    totalJobs: number
  ) => Promise<unknown>;
  updateNoteCompletionTracker?: (
    noteId: string,
    completedJobs: number
  ) => Promise<unknown>;
  incrementNoteCompletionTracker?: (noteId: string) => Promise<unknown>;
  checkNoteCompletion?: (noteId: string) => Promise<{
    isComplete: boolean;
    completedJobs: number;
    totalJobs: number;
  }>;
  getNoteTitle?: (noteId: string) => Promise<string | null>;
  updateInstructionLine?: (
    id: string,
    data: Record<string, unknown>
  ) => Promise<unknown>;
  createInstructionSteps?: (
    steps: Array<Record<string, unknown>>
  ) => Promise<unknown>;
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
  public prisma = prisma;
  public patternTracker = new PatternTracker(prisma);

  get createNote() {
    return async (file: ParsedHTMLFile) => {
      // Import the real createNote function from the database package
      const { createNote } = await import("@peas/database");
      return createNote(file);
    };
  }

  get createNoteCompletionTracker() {
    return async (noteId: string, totalJobs: number) => {
      // Initialize tracking for this note
      jobCompletionTracker.set(noteId, {
        totalJobs,
        completedJobs: 0,
        isComplete: false,
      });
      logger.info("Created completion tracker", { noteId, totalJobs });
      return Promise.resolve();
    };
  }

  get updateNoteCompletionTracker() {
    return async (noteId: string, completedJobs: number) => {
      const tracker = jobCompletionTracker.get(noteId);
      if (tracker) {
        // Update the completed jobs count (this represents the current job that just completed)
        tracker.completedJobs = completedJobs;
        tracker.isComplete = completedJobs >= tracker.totalJobs;
        logger.info("Updated completion tracker", { 
          noteId, 
          completedJobs, 
          totalJobs: tracker.totalJobs, 
          isComplete: tracker.isComplete 
        });
      } else {
        logger.info("No completion tracker found, creating fallback", { noteId, completedJobs });
        // Create a tracker if one doesn't exist (fallback)
        jobCompletionTracker.set(noteId, {
          totalJobs: completedJobs,
          completedJobs: completedJobs,
          isComplete: true,
        });
      }
      return Promise.resolve();
    };
  }

  get incrementNoteCompletionTracker() {
    return async (noteId: string) => {
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
            isComplete: tracker.isComplete 
          });
        } else {
          logger.info("Note already complete, skipping increment", { 
            noteId, 
            completedJobs: tracker.completedJobs, 
            totalJobs: tracker.totalJobs 
          });
        }
      } else {
        logger.info("No completion tracker found, creating fallback with 1 job", { noteId });
        // Create a tracker if one doesn't exist (fallback)
        jobCompletionTracker.set(noteId, {
          totalJobs: 1,
          completedJobs: 1,
          isComplete: true,
        });
      }
      return Promise.resolve();
    };
  }

  get checkNoteCompletion() {
    return async (noteId: string) => {
      const tracker = jobCompletionTracker.get(noteId);

      if (!tracker) {
        logger.info("No completion tracker found, considering complete", { noteId });
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
        isComplete: tracker.isComplete 
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
        logger.error("Error getting note title", { 
          noteId, 
          error: error instanceof Error ? error.message : String(error) 
        });
        return null;
      }
    };
  }
}

export function registerDatabase(): IDatabaseService {
  return new DatabaseService();
}
