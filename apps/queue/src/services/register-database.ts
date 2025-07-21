import type { ParsedHTMLFile } from "@peas/database";

import { prisma } from "../config/database";
import { PatternTracker } from "../workers/shared/pattern-tracker";

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
      console.log(
        `[DATABASE] Created completion tracker for note ${noteId} with ${totalJobs} jobs`
      );
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
        console.log(
          `[DATABASE] Updated completion tracker for note ${noteId}: ${completedJobs}/${tracker.totalJobs} jobs completed (${tracker.isComplete ? "COMPLETE" : "INCOMPLETE"})`
        );
      } else {
        console.log(
          `[DATABASE] No completion tracker found for note ${noteId}, creating one with ${completedJobs} completed jobs`
        );
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
          console.log(
            `[DATABASE] Incremented completion tracker for note ${noteId}: ${tracker.completedJobs}/${tracker.totalJobs} jobs completed (${tracker.isComplete ? "COMPLETE" : "INCOMPLETE"})`
          );
        } else {
          console.log(
            `[DATABASE] Note ${noteId} already complete (${tracker.completedJobs}/${tracker.totalJobs}), skipping increment`
          );
        }
      } else {
        console.log(
          `[DATABASE] No completion tracker found for note ${noteId}, creating one with 1 completed job`
        );
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
        console.log(
          `[DATABASE] No completion tracker found for note ${noteId}, considering complete`
        );
        return {
          isComplete: true,
          completedJobs: 0,
          totalJobs: 0,
        };
      }

      console.log(
        `[DATABASE] Note ${noteId}: ${tracker.completedJobs}/${tracker.totalJobs} jobs complete (${tracker.isComplete ? "COMPLETE" : "INCOMPLETE"})`
      );

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
        console.log(
          `[DATABASE] Error getting note title for ${noteId}: ${error}`
        );
        return null;
      }
    };
  }
}

export function registerDatabase(): IDatabaseService {
  return new DatabaseService();
}
