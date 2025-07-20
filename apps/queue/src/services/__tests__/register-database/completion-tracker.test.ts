import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DatabaseService } from "../../register-database";

// Mock the prisma client
vi.mock("../../config/database", () => ({
  prisma: {
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    note: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// Mock the PatternTracker
vi.mock("../../workers/shared/pattern-tracker", () => ({
  PatternTracker: vi.fn().mockImplementation(() => ({
    trackPattern: vi.fn(),
  })),
}));

describe("DatabaseService Completion Tracker", () => {
  let databaseService: DatabaseService;

  beforeEach(() => {
    databaseService = new DatabaseService();
    vi.clearAllMocks();
    // Clear console.log calls
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe("createNoteCompletionTracker", () => {
    it("should create a new completion tracker", async () => {
      const createTrackerFn = databaseService.createNoteCompletionTracker;
      expect(createTrackerFn).toBeDefined();

      await expect(createTrackerFn!("test-note-id", 5)).resolves.not.toThrow();

      // Verify the tracker was created by checking completion status
      const checkCompletionFn = databaseService.checkNoteCompletion;
      const completion = await checkCompletionFn!("test-note-id");

      expect(completion).toEqual({
        isComplete: false,
        completedJobs: 0,
        totalJobs: 5,
      });
    });

    it("should handle zero total jobs", async () => {
      const createTrackerFn = databaseService.createNoteCompletionTracker;
      await expect(createTrackerFn!("test-note-id", 0)).resolves.not.toThrow();

      const checkCompletionFn = databaseService.checkNoteCompletion;
      const completion = await checkCompletionFn!("test-note-id");

      expect(completion).toEqual({
        isComplete: false,
        completedJobs: 0,
        totalJobs: 0,
      });
    });

    it("should handle negative total jobs", async () => {
      const createTrackerFn = databaseService.createNoteCompletionTracker;
      await expect(createTrackerFn!("test-note-id", -5)).resolves.not.toThrow();

      const checkCompletionFn = databaseService.checkNoteCompletion;
      const completion = await checkCompletionFn!("test-note-id");

      expect(completion).toEqual({
        isComplete: false,
        completedJobs: 0,
        totalJobs: -5,
      });
    });

    it("should overwrite existing tracker", async () => {
      const createTrackerFn = databaseService.createNoteCompletionTracker;

      // Create initial tracker
      await createTrackerFn!("test-note-id", 3);

      // Create new tracker with different values
      await createTrackerFn!("test-note-id", 7);

      const checkCompletionFn = databaseService.checkNoteCompletion;
      const completion = await checkCompletionFn!("test-note-id");

      expect(completion).toEqual({
        isComplete: false,
        completedJobs: 0,
        totalJobs: 7,
      });
    });

    it("should handle multiple trackers", async () => {
      const createTrackerFn = databaseService.createNoteCompletionTracker;

      await createTrackerFn!("note-1", 3);
      await createTrackerFn!("note-2", 5);
      await createTrackerFn!("note-3", 1);

      const checkCompletionFn = databaseService.checkNoteCompletion;

      const completion1 = await checkCompletionFn!("note-1");
      const completion2 = await checkCompletionFn!("note-2");
      const completion3 = await checkCompletionFn!("note-3");

      expect(completion1).toEqual({
        isComplete: false,
        completedJobs: 0,
        totalJobs: 3,
      });
      expect(completion2).toEqual({
        isComplete: false,
        completedJobs: 0,
        totalJobs: 5,
      });
      expect(completion3).toEqual({
        isComplete: false,
        completedJobs: 0,
        totalJobs: 1,
      });
    });
  });

  describe("updateNoteCompletionTracker", () => {
    it("should update existing tracker", async () => {
      const createTrackerFn = databaseService.createNoteCompletionTracker;
      const updateTrackerFn = databaseService.updateNoteCompletionTracker;

      // Create tracker first
      await createTrackerFn!("test-note-id", 5);

      // Update with completed jobs
      await updateTrackerFn!("test-note-id", 3);

      const checkCompletionFn = databaseService.checkNoteCompletion;
      const completion = await checkCompletionFn!("test-note-id");

      expect(completion).toEqual({
        isComplete: false,
        completedJobs: 3,
        totalJobs: 5,
      });
    });

    it("should mark as complete when completed jobs >= total jobs", async () => {
      const createTrackerFn = databaseService.createNoteCompletionTracker;
      const updateTrackerFn = databaseService.updateNoteCompletionTracker;

      await createTrackerFn!("test-note-id", 5);
      await updateTrackerFn!("test-note-id", 5);

      const checkCompletionFn = databaseService.checkNoteCompletion;
      const completion = await checkCompletionFn!("test-note-id");

      expect(completion).toEqual({
        isComplete: true,
        completedJobs: 5,
        totalJobs: 5,
      });
    });

    it("should mark as complete when completed jobs > total jobs", async () => {
      const createTrackerFn = databaseService.createNoteCompletionTracker;
      const updateTrackerFn = databaseService.updateNoteCompletionTracker;

      await createTrackerFn!("test-note-id", 5);
      await updateTrackerFn!("test-note-id", 7);

      const checkCompletionFn = databaseService.checkNoteCompletion;
      const completion = await checkCompletionFn!("test-note-id");

      expect(completion).toEqual({
        isComplete: true,
        completedJobs: 7,
        totalJobs: 5,
      });
    });

    it("should create tracker if none exists", async () => {
      const updateTrackerFn = databaseService.updateNoteCompletionTracker;

      await updateTrackerFn!("new-note-id", 3);

      const checkCompletionFn = databaseService.checkNoteCompletion;
      const completion = await checkCompletionFn!("new-note-id");

      expect(completion).toEqual({
        isComplete: true,
        completedJobs: 3,
        totalJobs: 3,
      });
    });

    it("should handle zero completed jobs", async () => {
      const createTrackerFn = databaseService.createNoteCompletionTracker;
      const updateTrackerFn = databaseService.updateNoteCompletionTracker;

      await createTrackerFn!("test-note-id", 5);
      await updateTrackerFn!("test-note-id", 0);

      const checkCompletionFn = databaseService.checkNoteCompletion;
      const completion = await checkCompletionFn!("test-note-id");

      expect(completion).toEqual({
        isComplete: false,
        completedJobs: 0,
        totalJobs: 5,
      });
    });

    it("should handle negative completed jobs", async () => {
      const createTrackerFn = databaseService.createNoteCompletionTracker;
      const updateTrackerFn = databaseService.updateNoteCompletionTracker;

      await createTrackerFn!("test-note-id", 5);
      await updateTrackerFn!("test-note-id", -2);

      const checkCompletionFn = databaseService.checkNoteCompletion;
      const completion = await checkCompletionFn!("test-note-id");

      expect(completion).toEqual({
        isComplete: false,
        completedJobs: -2,
        totalJobs: 5,
      });
    });
  });

  describe("incrementNoteCompletionTracker", () => {
    it("should increment existing tracker", async () => {
      const createTrackerFn = databaseService.createNoteCompletionTracker;
      const incrementTrackerFn = databaseService.incrementNoteCompletionTracker;

      await createTrackerFn!("test-note-id", 5);
      await incrementTrackerFn!("test-note-id");

      const checkCompletionFn = databaseService.checkNoteCompletion;
      const completion = await checkCompletionFn!("test-note-id");

      expect(completion).toEqual({
        isComplete: false,
        completedJobs: 1,
        totalJobs: 5,
      });
    });

    it("should not increment if already complete", async () => {
      const createTrackerFn = databaseService.createNoteCompletionTracker;
      const incrementTrackerFn = databaseService.incrementNoteCompletionTracker;

      await createTrackerFn!("test-note-id", 2);
      await incrementTrackerFn!("test-note-id"); // 1/2
      await incrementTrackerFn!("test-note-id"); // 2/2 - complete
      await incrementTrackerFn!("test-note-id"); // Should not increment

      const checkCompletionFn = databaseService.checkNoteCompletion;
      const completion = await checkCompletionFn!("test-note-id");

      expect(completion).toEqual({
        isComplete: true,
        completedJobs: 2,
        totalJobs: 2,
      });
    });

    it("should create tracker if none exists", async () => {
      const incrementTrackerFn = databaseService.incrementNoteCompletionTracker;

      await incrementTrackerFn!("increment-note-id");

      const checkCompletionFn = databaseService.checkNoteCompletion;
      const completion = await checkCompletionFn!("increment-note-id");

      expect(completion).toEqual({
        isComplete: true,
        completedJobs: 1,
        totalJobs: 1,
      });
    });

    it("should handle multiple increments", async () => {
      const createTrackerFn = databaseService.createNoteCompletionTracker;
      const incrementTrackerFn = databaseService.incrementNoteCompletionTracker;

      await createTrackerFn!("test-note-id", 3);
      await incrementTrackerFn!("test-note-id"); // 1/3
      await incrementTrackerFn!("test-note-id"); // 2/3
      await incrementTrackerFn!("test-note-id"); // 3/3 - complete

      const checkCompletionFn = databaseService.checkNoteCompletion;
      const completion = await checkCompletionFn!("test-note-id");

      expect(completion).toEqual({
        isComplete: true,
        completedJobs: 3,
        totalJobs: 3,
      });
    });

    it("should handle edge case where completed equals total", async () => {
      const createTrackerFn = databaseService.createNoteCompletionTracker;
      const incrementTrackerFn = databaseService.incrementNoteCompletionTracker;

      await createTrackerFn!("test-note-id", 1);
      await incrementTrackerFn!("test-note-id"); // 1/1 - complete

      const checkCompletionFn = databaseService.checkNoteCompletion;
      const completion = await checkCompletionFn!("test-note-id");

      expect(completion).toEqual({
        isComplete: true,
        completedJobs: 1,
        totalJobs: 1,
      });
    });
  });

  describe("checkNoteCompletion", () => {
    it("should return completion status for existing tracker", async () => {
      const createTrackerFn = databaseService.createNoteCompletionTracker;
      const checkCompletionFn = databaseService.checkNoteCompletion;

      await createTrackerFn!("test-note-id", 5);

      const completion = await checkCompletionFn!("test-note-id");

      expect(completion).toEqual({
        isComplete: false,
        completedJobs: 0,
        totalJobs: 5,
      });
    });

    it("should return complete status when no tracker exists", async () => {
      const checkCompletionFn = databaseService.checkNoteCompletion;

      const completion = await checkCompletionFn!("non-existent-note");

      expect(completion).toEqual({
        isComplete: true,
        completedJobs: 0,
        totalJobs: 0,
      });
    });

    it("should return correct status after updates", async () => {
      const createTrackerFn = databaseService.createNoteCompletionTracker;
      const updateTrackerFn = databaseService.updateNoteCompletionTracker;
      const checkCompletionFn = databaseService.checkNoteCompletion;

      await createTrackerFn!("test-note-id", 5);
      await updateTrackerFn!("test-note-id", 3);

      const completion = await checkCompletionFn!("test-note-id");

      expect(completion).toEqual({
        isComplete: false,
        completedJobs: 3,
        totalJobs: 5,
      });
    });

    it("should return complete status when all jobs done", async () => {
      const createTrackerFn = databaseService.createNoteCompletionTracker;
      const updateTrackerFn = databaseService.updateNoteCompletionTracker;
      const checkCompletionFn = databaseService.checkNoteCompletion;

      await createTrackerFn!("test-note-id", 5);
      await updateTrackerFn!("test-note-id", 5);

      const completion = await checkCompletionFn!("test-note-id");

      expect(completion).toEqual({
        isComplete: true,
        completedJobs: 5,
        totalJobs: 5,
      });
    });

    it("should handle multiple notes independently", async () => {
      const createTrackerFn = databaseService.createNoteCompletionTracker;
      const updateTrackerFn = databaseService.updateNoteCompletionTracker;
      const checkCompletionFn = databaseService.checkNoteCompletion;

      await createTrackerFn!("note-1", 3);
      await createTrackerFn!("note-2", 5);

      await updateTrackerFn!("note-1", 2);
      await updateTrackerFn!("note-2", 5);

      const completion1 = await checkCompletionFn!("note-1");
      const completion2 = await checkCompletionFn!("note-2");

      expect(completion1).toEqual({
        isComplete: false,
        completedJobs: 2,
        totalJobs: 3,
      });
      expect(completion2).toEqual({
        isComplete: true,
        completedJobs: 5,
        totalJobs: 5,
      });
    });
  });

  describe("Integration Tests", () => {
    it("should handle complete workflow", async () => {
      const createTrackerFn = databaseService.createNoteCompletionTracker;
      const incrementTrackerFn = databaseService.incrementNoteCompletionTracker;
      const checkCompletionFn = databaseService.checkNoteCompletion;

      // Create tracker
      await createTrackerFn!("test-note-id", 3);

      // Check initial status
      let completion = await checkCompletionFn!("test-note-id");
      expect(completion).toEqual({
        isComplete: false,
        completedJobs: 0,
        totalJobs: 3,
      });

      // Increment jobs
      await incrementTrackerFn!("test-note-id");
      completion = await checkCompletionFn!("test-note-id");
      expect(completion).toEqual({
        isComplete: false,
        completedJobs: 1,
        totalJobs: 3,
      });

      await incrementTrackerFn!("test-note-id");
      completion = await checkCompletionFn!("test-note-id");
      expect(completion).toEqual({
        isComplete: false,
        completedJobs: 2,
        totalJobs: 3,
      });

      await incrementTrackerFn!("test-note-id");
      completion = await checkCompletionFn!("test-note-id");
      expect(completion).toEqual({
        isComplete: true,
        completedJobs: 3,
        totalJobs: 3,
      });

      // Try to increment after completion
      await incrementTrackerFn!("test-note-id");
      completion = await checkCompletionFn!("test-note-id");
      expect(completion).toEqual({
        isComplete: true,
        completedJobs: 3,
        totalJobs: 3,
      });
    });

    it("should handle concurrent operations", async () => {
      const createTrackerFn = databaseService.createNoteCompletionTracker;
      const incrementTrackerFn = databaseService.incrementNoteCompletionTracker;
      const checkCompletionFn = databaseService.checkNoteCompletion;

      await createTrackerFn!("test-note-id", 2);

      // Perform concurrent increments
      await Promise.all([
        incrementTrackerFn!("test-note-id"),
        incrementTrackerFn!("test-note-id"),
      ]);

      const completion = await checkCompletionFn!("test-note-id");
      expect(completion).toEqual({
        isComplete: true,
        completedJobs: 2,
        totalJobs: 2,
      });
    });
  });
});
