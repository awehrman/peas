import { describe, it, expect, beforeEach, vi } from "vitest";
import { registerDatabase } from "../../../services/register-database";
import type { IDatabaseService } from "../../../services";

describe("Job Completion Tracking", () => {
  let databaseService: IDatabaseService;

  beforeEach(() => {
    vi.clearAllMocks();
    databaseService = registerDatabase();
  });

  describe("Database Service Job Completion Tracking", () => {
    it("should create and update job completion tracker correctly", async () => {
      const noteId = "test-note-123";
      const totalJobs = 5;

      // Create completion tracker
      await databaseService.createNoteCompletionTracker!(noteId, totalJobs);

      // Check initial state
      const initialStatus = await databaseService.checkNoteCompletion!(noteId);
      expect(initialStatus.isComplete).toBe(false);
      expect(initialStatus.completedJobs).toBe(0);
      expect(initialStatus.totalJobs).toBe(totalJobs);

      // Update with first job completion
      await databaseService.updateNoteCompletionTracker!(noteId, 1);
      const status1 = await databaseService.checkNoteCompletion!(noteId);
      expect(status1.isComplete).toBe(false);
      expect(status1.completedJobs).toBe(1);
      expect(status1.totalJobs).toBe(totalJobs);

      // Update with second job completion
      await databaseService.updateNoteCompletionTracker!(noteId, 2);
      const status2 = await databaseService.checkNoteCompletion!(noteId);
      expect(status2.isComplete).toBe(false);
      expect(status2.completedJobs).toBe(2);
      expect(status2.totalJobs).toBe(totalJobs);

      // Update with final job completion
      await databaseService.updateNoteCompletionTracker!(noteId, 5);
      const finalStatus = await databaseService.checkNoteCompletion!(noteId);
      expect(finalStatus.isComplete).toBe(true);
      expect(finalStatus.completedJobs).toBe(5);
      expect(finalStatus.totalJobs).toBe(totalJobs);
    });

    it("should handle completion tracker for note with no jobs", async () => {
      const noteId = "test-note-no-jobs";

      // Check status for note with no tracker (should be considered complete)
      const status = await databaseService.checkNoteCompletion!(noteId);
      expect(status.isComplete).toBe(true);
      expect(status.completedJobs).toBe(0);
      expect(status.totalJobs).toBe(0);
    });

    it("should create tracker when updating non-existent note", async () => {
      const noteId = "test-note-new";
      const completedJobs = 3;

      // Update a note that doesn't have a tracker
      await databaseService.updateNoteCompletionTracker!(noteId, completedJobs);

      // Check that a tracker was created
      const status = await databaseService.checkNoteCompletion!(noteId);
      expect(status.isComplete).toBe(true);
      expect(status.completedJobs).toBe(completedJobs);
      expect(status.totalJobs).toBe(completedJobs);
    });

    it("should handle multiple notes independently", async () => {
      const note1Id = "test-note-1";
      const note2Id = "test-note-2";

      // Create trackers for both notes
      await databaseService.createNoteCompletionTracker!(note1Id, 3);
      await databaseService.createNoteCompletionTracker!(note2Id, 2);

      // Update note 1
      await databaseService.updateNoteCompletionTracker!(note1Id, 1);
      const status1 = await databaseService.checkNoteCompletion!(note1Id);
      expect(status1.isComplete).toBe(false);
      expect(status1.completedJobs).toBe(1);

      // Update note 2
      await databaseService.updateNoteCompletionTracker!(note2Id, 2);
      const status2 = await databaseService.checkNoteCompletion!(note2Id);
      expect(status2.isComplete).toBe(true);
      expect(status2.completedJobs).toBe(2);

      // Note 1 should still be incomplete
      const status1Again = await databaseService.checkNoteCompletion!(note1Id);
      expect(status1Again.isComplete).toBe(false);
      expect(status1Again.completedJobs).toBe(1);
    });
  });

  describe("Integration with Service Container", () => {
    it("should provide job completion tracking methods through service container", () => {
      // Test with the real database service
      const realDatabaseService = registerDatabase();

      // Verify the real database service has the required methods
      expect(realDatabaseService.createNoteCompletionTracker).toBeDefined();
      expect(realDatabaseService.updateNoteCompletionTracker).toBeDefined();
      expect(realDatabaseService.checkNoteCompletion).toBeDefined();
    });
  });
});
