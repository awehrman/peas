import { describe, it, expect, beforeEach, vi } from "vitest";
import { ScheduleInstructionsAction } from "../schedule-instructions";
import type { ScheduleInstructionsDeps } from "../../types";
import type { NotePipelineStage3 } from "../../types";
import type { ActionContext } from "../../../core/types";

describe("ScheduleInstructionsAction", () => {
  let action: ScheduleInstructionsAction;
  let mockDeps: ScheduleInstructionsDeps;
  let mockContext: ActionContext;

  beforeEach(() => {
    vi.clearAllMocks();
    action = new ScheduleInstructionsAction();
    mockDeps = {
      instructionQueue: {
        add: vi.fn().mockResolvedValue({ id: "instruction-job-123" }),
      },
      logger: {
        log: vi.fn(),
      },
    };
    mockContext = {
      jobId: "test-job-123",
      retryCount: 0,
      queueName: "note-queue",
      operation: "schedule_instructions",
      startTime: Date.now(),
      workerName: "test-worker",
      attemptNumber: 1,
    };
  });

  describe("execute", () => {
    it("should schedule instruction lines with tracking information", async () => {
      const data: NotePipelineStage3 = {
        importId: "test-import-456",
        noteId: "test-note-123",
        content: "test content",
        file: {
          title: "Test Recipe",
          contents: "test content",
          ingredients: [],
          instructions: [],
        },
        note: {
          id: "test-note-123",
          title: "Test Recipe",
          content: "Test content",
          createdAt: new Date(),
          updatedAt: new Date(),
          parsedIngredientLines: [],
          parsedInstructionLines: [
            {
              id: "instruction-1",
              originalText: "Mix ingredients in a bowl",
              lineIndex: 0,
            },
            {
              id: "instruction-2",
              originalText: "Bake at 350°F for 30 minutes",
              lineIndex: 1,
            },
            {
              id: "instruction-3",
              originalText: "Let cool before serving",
              lineIndex: 2,
            },
          ],
        },
      };

      const result = await action.execute(data, mockDeps, mockContext);

      expect(result).toEqual(data);
      expect(mockDeps.instructionQueue.add).toHaveBeenCalledTimes(3);

      // Check first instruction job
      expect(mockDeps.instructionQueue.add).toHaveBeenNthCalledWith(
        1,
        "process-instruction-line",
        {
          noteId: "test-note-123",
          importId: "test-import-456",
          instructionLineId: "instruction-1",
          originalText: "Mix ingredients in a bowl",
          lineIndex: 0,
          currentInstructionIndex: 1,
          totalInstructions: 3,
        }
      );

      // Check second instruction job
      expect(mockDeps.instructionQueue.add).toHaveBeenNthCalledWith(
        2,
        "process-instruction-line",
        {
          noteId: "test-note-123",
          importId: "test-import-456",
          instructionLineId: "instruction-2",
          originalText: "Bake at 350°F for 30 minutes",
          lineIndex: 1,
          currentInstructionIndex: 2,
          totalInstructions: 3,
        }
      );

      // Check third instruction job
      expect(mockDeps.instructionQueue.add).toHaveBeenNthCalledWith(
        3,
        "process-instruction-line",
        {
          noteId: "test-note-123",
          importId: "test-import-456",
          instructionLineId: "instruction-3",
          originalText: "Let cool before serving",
          lineIndex: 2,
          currentInstructionIndex: 3,
          totalInstructions: 3,
        }
      );

      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "[SCHEDULE_INSTRUCTIONS] Scheduled 3 instruction jobs for note test-note-123"
      );
    });

    it("should handle empty instruction lines", async () => {
      const data: NotePipelineStage3 = {
        importId: "test-import-456",
        noteId: "test-note-123",
        content: "test content",
        file: {
          title: "Test Recipe",
          contents: "test content",
          ingredients: [],
          instructions: [],
        },
        note: {
          id: "test-note-123",
          title: "Test Recipe",
          content: "Test content",
          createdAt: new Date(),
          updatedAt: new Date(),
          parsedIngredientLines: [],
          parsedInstructionLines: [],
        },
      };

      const result = await action.execute(data, mockDeps, mockContext);

      expect(result).toEqual(data);
      expect(mockDeps.instructionQueue.add).not.toHaveBeenCalled();
      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "[SCHEDULE_INSTRUCTIONS] Scheduled 0 instruction jobs for note test-note-123"
      );
    });

    it("should handle undefined instruction lines", async () => {
      const data = {
        importId: "test-import-456",
        noteId: "test-note-123",
        content: "test content",
        file: {
          title: "Test Recipe",
          contents: "test content",
          ingredients: [],
          instructions: [],
        },
        note: {
          id: "test-note-123",
          title: "Test Recipe",
          content: "Test content",
          createdAt: new Date(),
          updatedAt: new Date(),
          parsedIngredientLines: [],
          parsedInstructionLines: [
            {
              id: "instruction-1",
              originalText: "Mix ingredients in a bowl",
              lineIndex: 0,
            },
            undefined, // Simulate undefined instruction line
            {
              id: "instruction-3",
              originalText: "Let cool before serving",
              lineIndex: 2,
            },
          ],
        },
      } as NotePipelineStage3;

      const result = await action.execute(data, mockDeps, mockContext);

      expect(result).toEqual(data);
      expect(mockDeps.instructionQueue.add).toHaveBeenCalledTimes(2); // Should skip undefined line
      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "[SCHEDULE_INSTRUCTIONS] Scheduled 3 instruction jobs for note test-note-123"
      );
    });

    it("should handle missing note", async () => {
      const data: NotePipelineStage3 = {
        importId: "test-import-456",
        noteId: "test-note-123",
        content: "test content",
        file: {
          title: "Test Recipe",
          contents: "test content",
          ingredients: [],
          instructions: [],
        },
        note: {
          id: "test-note-123",
          title: "Test Recipe",
          content: "Test content",
          createdAt: new Date(),
          updatedAt: new Date(),
          parsedIngredientLines: [],
          parsedInstructionLines: [],
        },
      };

      const result = await action.execute(data, mockDeps, mockContext);

      expect(result).toEqual(data);
      expect(mockDeps.instructionQueue.add).not.toHaveBeenCalled();
      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "[SCHEDULE_INSTRUCTIONS] Scheduled 0 instruction jobs for note test-note-123"
      );
    });

    it("should handle single instruction line", async () => {
      const data: NotePipelineStage3 = {
        importId: "test-import-456",
        noteId: "test-note-123",
        content: "test content",
        file: {
          title: "Test Recipe",
          contents: "test content",
          ingredients: [],
          instructions: [],
        },
        note: {
          id: "test-note-123",
          title: "Test Recipe",
          content: "Test content",
          createdAt: new Date(),
          updatedAt: new Date(),
          parsedIngredientLines: [],
          parsedInstructionLines: [
            {
              id: "instruction-1",
              originalText: "Mix all ingredients together",
              lineIndex: 0,
            },
          ],
        },
      };

      const result = await action.execute(data, mockDeps, mockContext);

      expect(result).toEqual(data);
      expect(mockDeps.instructionQueue.add).toHaveBeenCalledTimes(1);
      expect(mockDeps.instructionQueue.add).toHaveBeenCalledWith(
        "process-instruction-line",
        {
          noteId: "test-note-123",
          importId: "test-import-456",
          instructionLineId: "instruction-1",
          originalText: "Mix all ingredients together",
          lineIndex: 0,
          currentInstructionIndex: 1,
          totalInstructions: 1,
        }
      );
      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "[SCHEDULE_INSTRUCTIONS] Scheduled 1 instruction jobs for note test-note-123"
      );
    });

    it("should handle instruction lines with special characters", async () => {
      const data: NotePipelineStage3 = {
        importId: "test-import-456",
        noteId: "test-note-123",
        content: "test content",
        file: {
          title: "Test Recipe",
          contents: "test content",
          ingredients: [],
          instructions: [],
        },
        note: {
          id: "test-note-123",
          title: "Test Recipe",
          content: "Test content",
          createdAt: new Date(),
          updatedAt: new Date(),
          parsedIngredientLines: [],
          parsedInstructionLines: [
            {
              id: "instruction-1",
              originalText: "Preheat oven to 350°F (175°C)",
              lineIndex: 0,
            },
            {
              id: "instruction-2",
              originalText: "Mix 2 cups flour + 1 cup sugar",
              lineIndex: 1,
            },
          ],
        },
      };

      const result = await action.execute(data, mockDeps, mockContext);

      expect(result).toEqual(data);
      expect(mockDeps.instructionQueue.add).toHaveBeenCalledTimes(2);
      expect(mockDeps.instructionQueue.add).toHaveBeenNthCalledWith(
        1,
        "process-instruction-line",
        {
          noteId: "test-note-123",
          importId: "test-import-456",
          instructionLineId: "instruction-1",
          originalText: "Preheat oven to 350°F (175°C)",
          lineIndex: 0,
          currentInstructionIndex: 1,
          totalInstructions: 2,
        }
      );
      expect(mockDeps.instructionQueue.add).toHaveBeenNthCalledWith(
        2,
        "process-instruction-line",
        {
          noteId: "test-note-123",
          importId: "test-import-456",
          instructionLineId: "instruction-2",
          originalText: "Mix 2 cups flour + 1 cup sugar",
          lineIndex: 1,
          currentInstructionIndex: 2,
          totalInstructions: 2,
        }
      );
    });

    it("should handle queue errors gracefully", async () => {
      const data: NotePipelineStage3 = {
        importId: "test-import-456",
        noteId: "test-note-123",
        content: "test content",
        file: {
          title: "Test Recipe",
          contents: "test content",
          ingredients: [],
          instructions: [],
        },
        note: {
          id: "test-note-123",
          title: "Test Recipe",
          content: "Test content",
          createdAt: new Date(),
          updatedAt: new Date(),
          parsedIngredientLines: [],
          parsedInstructionLines: [
            {
              id: "instruction-1",
              originalText: "Mix ingredients",
              lineIndex: 0,
            },
          ],
        },
      };

      // Mock queue to throw an error
      const mockAdd = vi
        .fn()
        .mockRejectedValue(new Error("Queue connection failed"));
      mockDeps.instructionQueue.add = mockAdd;

      await expect(action.execute(data, mockDeps, mockContext)).rejects.toThrow(
        "Queue connection failed"
      );

      expect(mockAdd).toHaveBeenCalledTimes(1);
    });

    it("should execute with timing wrapper", async () => {
      const data: NotePipelineStage3 = {
        importId: "test-import-456",
        noteId: "test-note-123",
        content: "test content",
        file: {
          title: "Test Recipe",
          contents: "test content",
          ingredients: [],
          instructions: [],
        },
        note: {
          id: "test-note-123",
          title: "Test Recipe",
          content: "Test content",
          createdAt: new Date(),
          updatedAt: new Date(),
          parsedIngredientLines: [],
          parsedInstructionLines: [
            {
              id: "instruction-1",
              originalText: "Mix ingredients",
              lineIndex: 0,
            },
          ],
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
        importId: "test-import-456",
        noteId: "test-note-123",
        content: "test content",
        file: {
          title: "Test Recipe",
          contents: "test content",
          ingredients: [],
          instructions: [],
        },
        note: {
          id: "test-note-123",
          title: "Test Recipe",
          content: "Test content",
          createdAt: new Date(),
          updatedAt: new Date(),
          parsedIngredientLines: [],
          parsedInstructionLines: [
            {
              id: "instruction-1",
              originalText: "Mix ingredients",
              lineIndex: 0,
            },
          ],
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
