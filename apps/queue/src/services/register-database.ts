import { prisma } from "../config/database";
import type { ParsedHTMLFile } from "@peas/database";

export interface IDatabaseService {
  prisma: typeof prisma;
  createNote?: (file: ParsedHTMLFile) => Promise<unknown>;
  createNoteCompletionTracker?: (
    noteId: string,
    totalJobs: number
  ) => Promise<unknown>;
  updateNoteCompletionTracker?: (
    noteId: string,
    completedJobs: number
  ) => Promise<unknown>;
  checkNoteCompletion?: (noteId: string) => Promise<{
    isComplete: boolean;
    completedJobs: number;
    totalJobs: number;
  }>;
}

// In-memory job completion tracking
const jobCompletionTracker = new Map<
  string,
  {
    totalJobs: number;
    completedJobs: number;
    isComplete: boolean;
  }
>();

// Default database service implementation
export class DatabaseService implements IDatabaseService {
  get prisma() {
    return prisma;
  }

  get createNote() {
    // Import the createNote function from the database package
    return async (file: ParsedHTMLFile) => {
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
}

export function registerDatabase(): IDatabaseService {
  return new DatabaseService();
}
