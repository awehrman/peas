import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StructuredLogger } from "../../../../../types";
import { waitForCategorization } from "../../../../note/actions/wait-for-categorization/service";

// Mock dependencies
vi.mock("../../../../note/actions/track-completion/service", () => ({
  getIngredientCompletionStatus: vi.fn(),
}));

vi.mock("../../../../categorization/schedule-categorization", () => ({
  scheduleCategorizationJob: vi.fn(),
}));

vi.mock("@peas/database", () => ({
  getNoteCategories: vi.fn(),
  getNoteTags: vi.fn(),
  getQueueJobByNoteId: vi.fn(),
}));

describe("WaitForCategorization Service", () => {
  let mockLogger: StructuredLogger;
  let mockStatusBroadcaster: {
    addStatusEventAndBroadcast: (
      event: Record<string, unknown>
    ) => Promise<Record<string, unknown>>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockLogger = {
      log: vi.fn(),
    } as unknown as StructuredLogger;

    mockStatusBroadcaster = {
      addStatusEventAndBroadcast: vi.fn().mockResolvedValue({}),
    };

    // Mock setTimeout to resolve immediately
    vi.spyOn(global, "setTimeout").mockImplementation(
      (callback: () => void) => {
        callback();
        return {} as ReturnType<typeof setTimeout>;
      }
    );
  });

  describe("waitForCategorization", () => {
    it("should return early when noteId is not provided", async () => {
      const result = await waitForCategorization("", "test-import", mockLogger);

      expect(result.success).toBe(false);
      expect(result.categorizationScheduled).toBe(false);
      expect(result.retryCount).toBe(0);
      expect(result.maxRetries).toBe(30);
      expect(result.hasCategorization).toBe(false);
      expect(result.hasTags).toBe(false);
      expect(result.categoriesCount).toBe(0);
      expect(result.tagsCount).toBe(0);
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[WAIT_FOR_CATEGORIZATION] No noteId available, skipping wait"
      );
    });

    it("should log start message when noteId is provided", async () => {
      // Mock ingredient completion status to be incomplete
      const { getIngredientCompletionStatus } = await import(
        "../../../../note/actions/track-completion/service"
      );
      vi.mocked(getIngredientCompletionStatus).mockReturnValue({
        completedIngredients: 0,
        totalIngredients: 5,
        progress: "0/5",
        isComplete: false,
      });

      await waitForCategorization("test-note", "test-import", mockLogger);

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[WAIT_FOR_CATEGORIZATION] Waiting for categorization to complete for note: test-note"
      );
    });

    it("should return proper result structure", async () => {
      // Mock ingredient completion status to be incomplete
      const { getIngredientCompletionStatus } = await import(
        "../../../../note/actions/track-completion/service"
      );
      vi.mocked(getIngredientCompletionStatus).mockReturnValue({
        completedIngredients: 0,
        totalIngredients: 5,
        progress: "0/5",
        isComplete: false,
      });

      const result = await waitForCategorization(
        "test-note",
        "test-import",
        mockLogger,
        mockStatusBroadcaster
      );

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("categorizationScheduled");
      expect(result).toHaveProperty("retryCount");
      expect(result).toHaveProperty("maxRetries");
      expect(result).toHaveProperty("hasCategorization");
      expect(result).toHaveProperty("hasTags");
      expect(result).toHaveProperty("categoriesCount");
      expect(result).toHaveProperty("tagsCount");
    });

    it("should schedule categorization when ingredients are complete", async () => {
      // Mock ingredient completion status to be complete
      const { getIngredientCompletionStatus } = await import(
        "../../../../note/actions/track-completion/service"
      );
      vi.mocked(getIngredientCompletionStatus).mockReturnValue({
        completedIngredients: 5,
        totalIngredients: 5,
        progress: "5/5",
        isComplete: true,
      });

      // Mock successful categorization scheduling
      const { scheduleCategorizationJob } = await import(
        "../../../../categorization/schedule-categorization"
      );
      vi.mocked(scheduleCategorizationJob).mockResolvedValue();

      // Mock database queries to return empty results
      const { getNoteCategories, getNoteTags } = await import("@peas/database");
      vi.mocked(getNoteCategories).mockResolvedValue([]);
      vi.mocked(getNoteTags).mockResolvedValue([]);

      const result = await waitForCategorization(
        "test-note",
        "test-import",
        mockLogger,
        mockStatusBroadcaster
      );

      expect(scheduleCategorizationJob).toHaveBeenCalledWith(
        "test-note",
        "test-import",
        mockLogger,
        mockStatusBroadcaster,
        "test-note-categorization-from-note-worker"
      );
      expect(result.categorizationScheduled).toBe(true);
      expect(result.success).toBe(false); // Still false because no categories/tags found
    });

    it("should handle scheduling failure gracefully", async () => {
      // Mock ingredient completion status to be complete
      const { getIngredientCompletionStatus } = await import(
        "../../../../note/actions/track-completion/service"
      );
      vi.mocked(getIngredientCompletionStatus).mockReturnValue({
        completedIngredients: 5,
        totalIngredients: 5,
        progress: "5/5",
        isComplete: true,
      });

      // Mock failed categorization scheduling
      const { scheduleCategorizationJob } = await import(
        "../../../../categorization/schedule-categorization"
      );
      vi.mocked(scheduleCategorizationJob).mockRejectedValue(
        new Error("Scheduling failed")
      );

      const result = await waitForCategorization(
        "test-note",
        "test-import",
        mockLogger,
        mockStatusBroadcaster
      );

      expect(result.categorizationScheduled).toBe(false);
      expect(result.success).toBe(false);
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[WAIT_FOR_CATEGORIZATION] Failed to schedule categorization for note test-note: Error: Scheduling failed"
      );
    });

    it("should handle scheduling error and continue waiting", async () => {
      // Mock ingredient completion status to be complete
      const { getIngredientCompletionStatus } = await import(
        "../../../../note/actions/track-completion/service"
      );
      vi.mocked(getIngredientCompletionStatus).mockReturnValue({
        completedIngredients: 5,
        totalIngredients: 5,
        progress: "5/5",
        isComplete: true,
      });

      // Mock failed categorization scheduling
      const { scheduleCategorizationJob } = await import(
        "../../../../categorization/schedule-categorization"
      );
      vi.mocked(scheduleCategorizationJob).mockRejectedValue(
        new Error("Queue connection failed")
      );

      // Mock QueueJob to return no jobs initially, then a completed job
      const { getQueueJobByNoteId } = await import("@peas/database");
      vi.mocked(getQueueJobByNoteId)
        .mockResolvedValueOnce([]) // First call returns no jobs
        .mockResolvedValueOnce([
          {
            id: "job-123",
            jobId: "bull-job-456",
            type: "PROCESS_CATEGORIZATION",
            status: "COMPLETED",
            noteId: "test-note",
            data: {},
            errorMessage: null,
            errorCode: null,
            errorDetails: null,
            retryCount: 0,
            maxRetries: 3,
            startedAt: new Date(),
            completedAt: new Date(),
            ingredientLineId: null,
            instructionLineId: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]); // Second call returns completed job

      const result = await waitForCategorization(
        "test-note",
        "test-import",
        mockLogger,
        mockStatusBroadcaster
      );

      expect(result.categorizationScheduled).toBe(false);
      expect(result.success).toBe(true); // Should succeed because QueueJob was found completed
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[WAIT_FOR_CATEGORIZATION] Failed to schedule categorization for note test-note: Error: Queue connection failed"
      );
    });

    it("should return success when categories are found", async () => {
      // Mock ingredient completion status to be complete
      const { getIngredientCompletionStatus } = await import(
        "../../../../note/actions/track-completion/service"
      );
      vi.mocked(getIngredientCompletionStatus).mockReturnValue({
        completedIngredients: 5,
        totalIngredients: 5,
        progress: "5/5",
        isComplete: true,
      });

      // Mock successful categorization scheduling
      const { scheduleCategorizationJob } = await import(
        "../../../../categorization/schedule-categorization"
      );
      vi.mocked(scheduleCategorizationJob).mockResolvedValue();

      // Mock QueueJob to return a completed categorization job
      const { getQueueJobByNoteId } = await import("@peas/database");
      vi.mocked(getQueueJobByNoteId).mockResolvedValue([
        {
          id: "job-123",
          jobId: "bull-job-456",
          type: "PROCESS_CATEGORIZATION",
          status: "COMPLETED",
          noteId: "test-note",
          data: {},
          errorMessage: null,
          errorCode: null,
          errorDetails: null,
          retryCount: 0,
          maxRetries: 3,
          startedAt: new Date(),
          completedAt: new Date(),
          ingredientLineId: null,
          instructionLineId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await waitForCategorization(
        "test-note",
        "test-import",
        mockLogger,
        mockStatusBroadcaster
      );

      expect(result.success).toBe(true);
      expect(result.categorizationScheduled).toBe(false); // Not scheduled because QueueJob was already completed
      expect(result.hasCategorization).toBe(true);
      expect(result.hasTags).toBe(true);
      expect(result.categoriesCount).toBe(1);
      expect(result.tagsCount).toBe(1);
      expect(result.retryCount).toBe(1);
    });

    it("should return success when only tags are found", async () => {
      // Mock ingredient completion status to be complete
      const { getIngredientCompletionStatus } = await import(
        "../../../../note/actions/track-completion/service"
      );
      vi.mocked(getIngredientCompletionStatus).mockReturnValue({
        completedIngredients: 5,
        totalIngredients: 5,
        progress: "5/5",
        isComplete: true,
      });

      // Mock successful categorization scheduling
      const { scheduleCategorizationJob } = await import(
        "../../../../categorization/schedule-categorization"
      );
      vi.mocked(scheduleCategorizationJob).mockResolvedValue();

      // Mock QueueJob to return a completed categorization job
      const { getQueueJobByNoteId } = await import("@peas/database");
      vi.mocked(getQueueJobByNoteId).mockResolvedValue([
        {
          id: "job-123",
          jobId: "bull-job-456",
          type: "PROCESS_CATEGORIZATION",
          status: "COMPLETED",
          noteId: "test-note",
          data: {},
          errorMessage: null,
          errorCode: null,
          errorDetails: null,
          retryCount: 0,
          maxRetries: 3,
          startedAt: new Date(),
          completedAt: new Date(),
          ingredientLineId: null,
          instructionLineId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await waitForCategorization(
        "test-note",
        "test-import",
        mockLogger,
        mockStatusBroadcaster
      );

      expect(result.success).toBe(true);
      expect(result.categorizationScheduled).toBe(false); // Not scheduled because QueueJob was already completed
      expect(result.hasCategorization).toBe(true);
      expect(result.hasTags).toBe(true);
      expect(result.categoriesCount).toBe(1);
      expect(result.tagsCount).toBe(1);
    });

    it("should handle database errors gracefully", async () => {
      // Arrange
      const noteId = "test-note-123";
      const importId = "test-import-456";
      const mockLogger = {
        log: vi.fn(),
      } as unknown as StructuredLogger;
      const mockStatusBroadcaster = {
        addStatusEventAndBroadcast: vi.fn().mockResolvedValue({}),
      };

      // Mock ingredient completion status to be incomplete
      const { getIngredientCompletionStatus } = await import(
        "../../../../note/actions/track-completion/service"
      );
      vi.mocked(getIngredientCompletionStatus).mockReturnValue({
        completedIngredients: 0,
        totalIngredients: 5,
        progress: "0/5",
        isComplete: false,
      });

      // Mock QueueJob function to throw an error
      const { getQueueJobByNoteId } = await import("@peas/database");
      vi.mocked(getQueueJobByNoteId).mockRejectedValue(
        new Error("Database connection failed")
      );

      // Act
      const result = await waitForCategorization(
        noteId,
        importId,
        mockLogger,
        mockStatusBroadcaster
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.categorizationScheduled).toBe(false);
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining("Error checking QueueJob status")
      );
    });

    it("should timeout after max retries", async () => {
      // Mock ingredient completion status to be complete
      const { getIngredientCompletionStatus } = await import(
        "../../../../note/actions/track-completion/service"
      );
      vi.mocked(getIngredientCompletionStatus).mockReturnValue({
        completedIngredients: 5,
        totalIngredients: 5,
        progress: "5/5",
        isComplete: true,
      });

      // Mock successful categorization scheduling
      const { scheduleCategorizationJob } = await import(
        "../../../../categorization/schedule-categorization"
      );
      vi.mocked(scheduleCategorizationJob).mockResolvedValue();

      // Mock QueueJob to return no jobs (causing timeout)
      const { getQueueJobByNoteId } = await import("@peas/database");
      vi.mocked(getQueueJobByNoteId).mockResolvedValue([]);

      const result = await waitForCategorization(
        "test-note",
        "test-import",
        mockLogger,
        mockStatusBroadcaster
      );

      expect(result.success).toBe(false);
      expect(result.categorizationScheduled).toBe(true);
      expect(result.retryCount).toBe(30);
      expect(result.maxRetries).toBe(30);
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[WAIT_FOR_CATEGORIZATION] Timeout waiting for categorization for note test-note. Continuing anyway."
      );
    });
  });
});
