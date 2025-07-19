import { describe, it, expect, vi, beforeEach } from "vitest";
import { ScheduleAllFollowupTasksAction } from "../schedule-all-followup-tasks";
import type { NotePipelineStage3 } from "../../types";
import type { ActionContext } from "../../../core/types";

describe("ScheduleAllFollowupTasksAction", () => {
  let action: ScheduleAllFollowupTasksAction;
  let mockDeps: any;
  let mockContext: ActionContext;
  let mockData: NotePipelineStage3;

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

    mockData = {
      importId: "import-123",
      content: "test content",
      file: {
        title: "Test Recipe",
        contents: "test content",
        ingredients: [
          {
            reference: "2 cups flour",
            blockIndex: 0,
            lineIndex: 0,
          },
        ],
        instructions: [
          {
            reference: "Mix ingredients",
            lineIndex: 0,
          },
        ],
      },
      note: {
        id: "note-456",
        title: "My Cool Recipe",
        content: "test content",
        createdAt: new Date(),
        updatedAt: new Date(),
        parsedIngredientLines: [
          {
            id: "ingredient-line-1",
            reference: "2 cups flour",
            blockIndex: 0,
            lineIndex: 0,
          },
        ],
        parsedInstructionLines: [
          {
            id: "instruction-line-1",
            originalText: "Mix ingredients",
            lineIndex: 0,
          },
        ],
      },
    };
  });

  describe("Constructor", () => {
    it("should create action with correct name", () => {
      expect(action.name).toBe("schedule_all_followup_tasks");
    });
  });

  describe("execute", () => {
    it("should schedule instruction processing successfully", async () => {
      const result = await action.execute(mockData, mockDeps, mockContext);

      // Should return the input data unchanged
      expect(result).toEqual(mockData);

      // Should log the start message
      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "[SCHEDULE_ALL_FOLLOWUP] Scheduling all follow-up tasks for note note-456"
      );

      // Should log the completion message
      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "[SCHEDULE_ALL_FOLLOWUP] Scheduled 0 tasks successfully, 0 failed for note note-456"
      );

      // Note: Instruction scheduling is now handled by the schedule-instructions action
      // which is called separately in the note worker pipeline
    });

    it("should handle instruction queue failure gracefully", async () => {
      const queueError = new Error("Queue connection failed");
      mockDeps.instructionQueue.add.mockRejectedValue(queueError);

      const result = await action.execute(mockData, mockDeps, mockContext);

      // Should return the input data unchanged
      expect(result).toEqual(mockData);

      // Should log the completion message with failure count
      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "[SCHEDULE_ALL_FOLLOWUP] Scheduled 0 tasks successfully, 0 failed for note note-456"
      );

      // Note: Instruction scheduling is now handled by the schedule-instructions action
      // which is called separately in the note worker pipeline
    });

    it("should handle empty instruction lines", async () => {
      const dataWithEmptyInstructions = {
        ...mockData,
        note: {
          ...mockData.note,
          parsedInstructionLines: [],
        },
      };

      const result = await action.execute(
        dataWithEmptyInstructions,
        mockDeps,
        mockContext
      );

      // Should return the input data unchanged
      expect(result).toEqual(dataWithEmptyInstructions);

      // Should log the completion message
      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "[SCHEDULE_ALL_FOLLOWUP] Scheduled 0 tasks successfully, 0 failed for note note-456"
      );

      // Note: Instruction scheduling is now handled by the schedule-instructions action
      // which is called separately in the note worker pipeline
    });

    it("should not schedule other queues (source, image, ingredient) when commented out", async () => {
      await action.execute(mockData, mockDeps, mockContext);

      // Should not call any queues since they are all commented out
      expect(mockDeps.sourceQueue.add).not.toHaveBeenCalled();
      expect(mockDeps.imageQueue.add).not.toHaveBeenCalled();
      expect(mockDeps.ingredientQueue.add).not.toHaveBeenCalled();
      expect(mockDeps.instructionQueue.add).not.toHaveBeenCalled();
    });

    it("should handle multiple instruction lines", async () => {
      const dataWithMultipleInstructions = {
        ...mockData,
        note: {
          ...mockData.note,
          parsedInstructionLines: [
            {
              id: "instruction-line-1",
              originalText: "Mix ingredients",
              lineIndex: 0,
            },
            {
              id: "instruction-line-2",
              originalText: "Bake at 350F",
              lineIndex: 1,
            },
          ],
        },
      };

      await action.execute(dataWithMultipleInstructions, mockDeps, mockContext);

      // Should log the completion message
      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "[SCHEDULE_ALL_FOLLOWUP] Scheduled 0 tasks successfully, 0 failed for note note-456"
      );

      // Note: Instruction scheduling is now handled by the schedule-instructions action
      // which is called separately in the note worker pipeline
    });
  });

  describe("executeWithTiming", () => {
    it("should execute with timing and return result", async () => {
      // Add a small delay to ensure duration > 0
      const originalExecute = action.execute.bind(action);
      action.execute = vi
        .fn()
        .mockImplementation(async (data, deps, context) => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return originalExecute(data, deps, context);
        });

      const result = await action.executeWithTiming(
        mockData,
        mockDeps,
        mockContext
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockData);
        expect(result.duration).toBeGreaterThan(0);
      }
    });

    it("should handle errors with timing", async () => {
      // Mock the execute method to throw an error after a delay
      const executeError = new Error("Test error");
      action.execute = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        throw executeError;
      });

      const result = await action.executeWithTiming(
        mockData,
        mockDeps,
        mockContext
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(executeError);
        expect(result.duration).toBeGreaterThan(0);
      }
    });
  });
});
