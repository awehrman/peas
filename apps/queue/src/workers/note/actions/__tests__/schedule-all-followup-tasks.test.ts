import { describe, it, expect, beforeEach, vi } from "vitest";
import { ScheduleAllFollowupTasksAction } from "../schedule-all-followup-tasks";
import type { NotePipelineStage3 } from "../../types";
import type { ActionContext } from "../../../core/types";
import type { ScheduleAllFollowupTasksDeps } from "../schedule-all-followup-tasks";

describe("ScheduleAllFollowupTasksAction", () => {
  let action: ScheduleAllFollowupTasksAction;
  let mockDeps: ScheduleAllFollowupTasksDeps;
  let mockContext: ActionContext;

  beforeEach(() => {
    vi.clearAllMocks();
    action = new ScheduleAllFollowupTasksAction();
    mockDeps = {
      ingredientQueue: {
        add: vi.fn().mockResolvedValue({ id: "ingredient-job-123" }),
      },
      instructionQueue: {
        add: vi.fn().mockResolvedValue({ id: "instruction-job-123" }),
      },
      imageQueue: {
        add: vi.fn().mockResolvedValue({ id: "image-job-123" }),
      },
      sourceQueue: {
        add: vi.fn().mockResolvedValue({ id: "source-job-123" }),
      },
      addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
      logger: {
        log: vi.fn(),
      },
    };
    mockContext = {
      jobId: "test-job-123",
      retryCount: 0,
      queueName: "note-queue",
      operation: "schedule_all_followup_tasks",
      startTime: Date.now(),
      workerName: "test-worker",
      attemptNumber: 1,
    };
  });

  describe("execute", () => {
    it("should schedule all follow-up tasks successfully", async () => {
      const data: NotePipelineStage3 = {
        importId: "test-import-123",
        content: "test content",
        file: {
          title: "Test Recipe",
          contents: "test content",
          ingredients: [],
          instructions: [],
        },
        note: {
          id: "test-note-456",
          title: "Test Recipe",
          content: "test content",
          createdAt: new Date(),
          updatedAt: new Date(),
          parsedIngredientLines: [],
          parsedInstructionLines: [],
        },
      };

      const result = await action.execute(data, mockDeps, mockContext);

      expect(result).toEqual(data);
      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "[SCHEDULE_ALL_FOLLOWUP] Scheduling all follow-up tasks for note test-note-456"
      );
      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "[SCHEDULE_ALL_FOLLOWUP] Scheduled 0 tasks successfully, 0 failed for note test-note-456"
      );
    });

    it("should handle missing note gracefully", async () => {
      const data: NotePipelineStage3 = {
        importId: "test-import-123",
        content: "test content",
        file: {
          title: "Test Recipe",
          contents: "test content",
          ingredients: [],
          instructions: [],
        },
        note: {
          id: "test-note-456",
          title: null,
          content: "test content",
          createdAt: new Date(),
          updatedAt: new Date(),
          parsedIngredientLines: [],
          parsedInstructionLines: [],
        },
      };

      const result = await action.execute(data, mockDeps, mockContext);

      expect(result).toEqual(data);
      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "[SCHEDULE_ALL_FOLLOWUP] Scheduling all follow-up tasks for note test-note-456"
      );
    });

    it("should handle errors gracefully", async () => {
      const data: NotePipelineStage3 = {
        importId: "test-import-123",
        content: "test content",
        file: {
          title: "Test Recipe",
          contents: "test content",
          ingredients: [],
          instructions: [],
        },
        note: {
          id: "test-note-456",
          title: "Test Recipe",
          content: "test content",
          createdAt: new Date(),
          updatedAt: new Date(),
          parsedIngredientLines: [],
          parsedInstructionLines: [],
        },
      };

      const result = await action.execute(data, mockDeps, mockContext);

      expect(result).toEqual(data);
      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "[SCHEDULE_ALL_FOLLOWUP] Scheduled 0 tasks successfully, 0 failed for note test-note-456"
      );
    });

    it("should execute with timing wrapper", async () => {
      const data: NotePipelineStage3 = {
        importId: "test-import-123",
        content: "test content",
        file: {
          title: "Test Recipe",
          contents: "test content",
          ingredients: [],
          instructions: [],
        },
        note: {
          id: "test-note-456",
          title: "Test Recipe",
          content: "test content",
          createdAt: new Date(),
          updatedAt: new Date(),
          parsedIngredientLines: [],
          parsedInstructionLines: [],
        },
      };

      const result = await action.executeWithTiming(
        data,
        mockDeps,
        mockContext
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(data);
        expect(result.duration).toBeGreaterThanOrEqual(0);
      }
    });

    it("should handle errors with timing", async () => {
      const data: NotePipelineStage3 = {
        importId: "test-import-123",
        content: "test content",
        file: {
          title: "Test Recipe",
          contents: "test content",
          ingredients: [],
          instructions: [],
        },
        note: {
          id: "test-note-456",
          title: "Test Recipe",
          content: "test content",
          createdAt: new Date(),
          updatedAt: new Date(),
          parsedIngredientLines: [],
          parsedInstructionLines: [],
        },
      };

      // Mock the execute method to throw an error
      vi.spyOn(action, "execute").mockRejectedValue(new Error("Test error"));

      const result = await action.executeWithTiming(
        data,
        mockDeps,
        mockContext
      );

      expect(result.success).toBe(false);
      if (!result.success && result.error) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toBe("Test error");
        expect(result.duration).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
