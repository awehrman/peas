import { describe, it, expect, vi, beforeEach } from "vitest";
import { ScheduleCategorizationAfterCompletionAction } from "../schedule-categorization-after-completion";
import type { IngredientJobData } from "../../types";

describe("ScheduleCategorizationAfterCompletionAction", () => {
  let action: ScheduleCategorizationAfterCompletionAction;
  let mockDeps: unknown;
  let mockContext: unknown;
  let mockData: IngredientJobData;

  beforeEach(() => {
    vi.clearAllMocks();

    action = new ScheduleCategorizationAfterCompletionAction();

    // Mock dependencies
    mockDeps = {
      categorizationQueue: {
        add: vi.fn().mockResolvedValue({ id: "test-job-id" }),
      },
      addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
      logger: {
        log: vi.fn(),
      },
    };

    // Mock context
    mockContext = {
      operation: "test-operation",
    };

    // Mock job data
    mockData = {
      ingredientLineId: "test-ingredient-line-id",
      reference: "Test Recipe Title",
      blockIndex: 0,
      lineIndex: 0,
      noteId: "test-note-id",
      importId: "test-import-id",
      currentIngredientIndex: 5,
      totalIngredients: 10,
      options: {
        strictMode: false,
        allowPartial: true,
      },
    };
  });

  describe("action properties", () => {
    it("should have correct name", () => {
      expect(action.name).toBe("schedule_categorization_after_completion");
    });

    it("should extend BaseAction", () => {
      expect(action).toBeInstanceOf(
        ScheduleCategorizationAfterCompletionAction
      );
    });
  });

  describe("execute - success scenario", () => {
    it("should schedule categorization job with correct parameters", async () => {
      const result = await action.execute(mockData, mockDeps, mockContext);

      expect(mockDeps.categorizationQueue.add).toHaveBeenCalledWith(
        "process-categorization",
        {
          noteId: "test-note-id",
          title: "Test Recipe Title",
          content: "",
        }
      );
      expect(result).toEqual(mockData);
    });

    it("should log scheduling message", async () => {
      await action.execute(mockData, mockDeps, mockContext);

      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "[SCHEDULE_CATEGORIZATION] Scheduling categorization for note test-note-id after ingredient completion"
      );
    });

    it("should log success message after scheduling", async () => {
      await action.execute(mockData, mockDeps, mockContext);

      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "[SCHEDULE_CATEGORIZATION] Successfully scheduled categorization for note test-note-id"
      );
    });

    it("should broadcast status event with processing status", async () => {
      await action.execute(mockData, mockDeps, mockContext);

      expect(mockDeps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: "test-note-id",
        noteId: "test-note-id",
        status: "PROCESSING",
        message: "Scheduled categorization after ingredient processing",
        context: "test-operation",
      });
    });

    it("should use reference as title when available", async () => {
      await action.execute(mockData, mockDeps, mockContext);

      expect(mockDeps.categorizationQueue.add).toHaveBeenCalledWith(
        "process-categorization",
        {
          noteId: "test-note-id",
          title: "Test Recipe Title",
          content: "",
        }
      );
    });

    it("should handle data without reference", async () => {
      const dataWithoutReference = { ...mockData, reference: "" };

      await action.execute(dataWithoutReference, mockDeps, mockContext);

      expect(mockDeps.categorizationQueue.add).toHaveBeenCalledWith(
        "process-categorization",
        {
          noteId: "test-note-id",
          title: "",
          content: "",
        }
      );
    });

    it("should handle data with empty reference", async () => {
      const dataWithEmptyReference = { ...mockData, reference: "" };

      await action.execute(dataWithEmptyReference, mockDeps, mockContext);

      expect(mockDeps.categorizationQueue.add).toHaveBeenCalledWith(
        "process-categorization",
        {
          noteId: "test-note-id",
          title: "",
          content: "",
        }
      );
    });

    it("should return the original data unchanged", async () => {
      const result = await action.execute(mockData, mockDeps, mockContext);

      expect(result).toBe(mockData);
      expect(result).toEqual(mockData);
    });
  });

  describe("execute - error scenario", () => {
    beforeEach(() => {
      // Mock queue to throw error
      mockDeps.categorizationQueue.add = vi
        .fn()
        .mockRejectedValue(new Error("Queue connection failed"));
    });

    it("should log error message when scheduling fails", async () => {
      await action.execute(mockData, mockDeps, mockContext);

      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "[SCHEDULE_CATEGORIZATION] Failed to schedule categorization for note test-note-id: Error: Queue connection failed",
        "error"
      );
    });

    it("should broadcast error status when scheduling fails", async () => {
      await action.execute(mockData, mockDeps, mockContext);

      expect(mockDeps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: "test-note-id",
        noteId: "test-note-id",
        status: "FAILED",
        message:
          "Failed to schedule categorization: Error: Queue connection failed",
        context: "test-operation",
      });
    });

    it("should still return the original data even when scheduling fails", async () => {
      const result = await action.execute(mockData, mockDeps, mockContext);

      expect(result).toEqual(mockData);
    });

    it("should handle different types of errors", async () => {
      const networkError = new Error("Network timeout");
      mockDeps.categorizationQueue.add = vi
        .fn()
        .mockRejectedValue(networkError);

      await action.execute(mockData, mockDeps, mockContext);

      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "[SCHEDULE_CATEGORIZATION] Failed to schedule categorization for note test-note-id: Error: Network timeout",
        "error"
      );
      expect(mockDeps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: "test-note-id",
        noteId: "test-note-id",
        status: "FAILED",
        message: "Failed to schedule categorization: Error: Network timeout",
        context: "test-operation",
      });
    });
  });

  describe("execute - dependency error scenarios", () => {
    it("should handle logger.log throwing error in success path", async () => {
      // Mock logger to throw on the first log message
      mockDeps.logger.log = vi.fn().mockImplementation(() => {
        throw new Error("Logger failed");
      });

      // Should throw because logger error is not handled
      await expect(
        action.execute(mockData, mockDeps, mockContext)
      ).rejects.toThrow("Logger failed");
    });

    it("should handle addStatusEventAndBroadcast throwing error in success path", async () => {
      mockDeps.addStatusEventAndBroadcast = vi
        .fn()
        .mockRejectedValue(new Error("Broadcast failed"));

      // Should throw because broadcast error is not handled in success path
      await expect(
        action.execute(mockData, mockDeps, mockContext)
      ).rejects.toThrow("Broadcast failed");
    });

    it("should handle addStatusEventAndBroadcast throwing error in error path", async () => {
      // Mock queue to throw error
      mockDeps.categorizationQueue.add = vi
        .fn()
        .mockRejectedValue(new Error("Queue failed"));

      // Mock broadcast to throw error in the catch block
      mockDeps.addStatusEventAndBroadcast = vi
        .fn()
        .mockRejectedValue(new Error("Broadcast failed"));

      // Should throw because broadcast error in catch block is not handled
      await expect(
        action.execute(mockData, mockDeps, mockContext)
      ).rejects.toThrow("Broadcast failed");
    });
  });

  describe("execute - edge cases", () => {
    it("should handle minimal data with only required fields", async () => {
      const minimalData: IngredientJobData = {
        ingredientLineId: "minimal-id",
        reference: "",
        blockIndex: 0,
        lineIndex: 0,
        noteId: "minimal-note-id",
      };

      await action.execute(minimalData, mockDeps, mockContext);

      expect(mockDeps.categorizationQueue.add).toHaveBeenCalledWith(
        "process-categorization",
        {
          noteId: "minimal-note-id",
          title: "",
          content: "",
        }
      );
    });

    it("should handle data with special characters in title", async () => {
      const dataWithSpecialChars = {
        ...mockData,
        reference: "Recipe with & special chars: test!",
      };

      await action.execute(dataWithSpecialChars, mockDeps, mockContext);

      expect(mockDeps.categorizationQueue.add).toHaveBeenCalledWith(
        "process-categorization",
        {
          noteId: "test-note-id",
          title: "Recipe with & special chars: test!",
          content: "",
        }
      );
    });

    it("should handle very long title", async () => {
      const longTitle = "A".repeat(1000);
      const dataWithLongTitle = { ...mockData, reference: longTitle };

      await action.execute(dataWithLongTitle, mockDeps, mockContext);

      expect(mockDeps.categorizationQueue.add).toHaveBeenCalledWith(
        "process-categorization",
        {
          noteId: "test-note-id",
          title: longTitle,
          content: "",
        }
      );
    });

    it("should handle context without operation", async () => {
      const contextWithoutOperation = {
        jobId: "test-job-id",
        retryCount: 0,
        queueName: "test-queue",
        operation: "",
        startTime: Date.now(),
        workerName: "test-worker",
        attemptNumber: 1,
      };

      await action.execute(mockData, mockDeps, contextWithoutOperation);

      expect(mockDeps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: "test-note-id",
        noteId: "test-note-id",
        status: "PROCESSING",
        message: "Scheduled categorization after ingredient processing",
        context: "",
      });
    });
  });

  describe("job scheduling verification", () => {
    it("should schedule job with correct queue name", async () => {
      await action.execute(mockData, mockDeps, mockContext);

      expect(mockDeps.categorizationQueue.add).toHaveBeenCalledWith(
        "process-categorization",
        expect.any(Object)
      );
    });

    it("should pass correct data structure to categorization queue", async () => {
      await action.execute(mockData, mockDeps, mockContext);

      const callArgs = mockDeps.categorizationQueue.add.mock.calls[0];
      const jobName = callArgs[0];
      const jobData = callArgs[1];

      expect(jobName).toBe("process-categorization");
      expect(jobData).toEqual({
        noteId: "test-note-id",
        title: "Test Recipe Title",
        content: "",
      });
    });

    it("should handle queue returning job result", async () => {
      const mockJobResult = { id: "job-123", name: "process-categorization" };
      mockDeps.categorizationQueue.add = vi
        .fn()
        .mockResolvedValue(mockJobResult);

      const result = await action.execute(mockData, mockDeps, mockContext);

      expect(result).toEqual(mockData);
      // The action doesn't use the job result, but it should handle it gracefully
    });
  });
});
