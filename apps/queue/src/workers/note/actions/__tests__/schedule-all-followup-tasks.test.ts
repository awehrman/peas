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
      database: {
        createNoteCompletionTracker: vi.fn().mockResolvedValue(undefined),
        updateNoteCompletionTracker: vi.fn().mockResolvedValue(undefined),
        checkNoteCompletion: vi.fn().mockResolvedValue(true),
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
        "[SCHEDULE_ALL_FOLLOWUP] Total jobs to track: 0 (0 ingredients, 0 instructions)"
      );
      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "[SCHEDULE_ALL_FOLLOWUP] Scheduled 0 tasks successfully, 0 failed for note test-note-456"
      );
    });

    it("should schedule ingredient and instruction tasks when data is present", async () => {
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
          parsedIngredientLines: [
            {
              id: "ingredient-1",
              reference: "2 cups flour",
              blockIndex: 0,
              lineIndex: 0,
            },
            {
              id: "ingredient-2",
              reference: "1 cup sugar",
              blockIndex: 0,
              lineIndex: 1,
            },
          ],
          parsedInstructionLines: [
            {
              id: "instruction-1",
              originalText: "Mix flour and sugar",
              lineIndex: 0,
            },
            {
              id: "instruction-2",
              originalText: "Bake at 350F",
              lineIndex: 1,
            },
          ],
        },
      };

      const result = await action.execute(data, mockDeps, mockContext);

      expect(result).toEqual(data);

      // Verify ingredient jobs were scheduled
      expect(mockDeps.ingredientQueue.add).toHaveBeenCalledTimes(2);
      expect(mockDeps.ingredientQueue.add).toHaveBeenCalledWith(
        "process_ingredient_line",
        {
          noteId: "test-note-456",
          importId: "test-import-123",
          ingredientLineId: "ingredient-1",
          reference: "2 cups flour",
          blockIndex: 0,
          lineIndex: 0,
          currentIngredientIndex: 1,
          totalIngredients: 2,
        }
      );
      expect(mockDeps.ingredientQueue.add).toHaveBeenCalledWith(
        "process_ingredient_line",
        {
          noteId: "test-note-456",
          importId: "test-import-123",
          ingredientLineId: "ingredient-2",
          reference: "1 cup sugar",
          blockIndex: 0,
          lineIndex: 1,
          currentIngredientIndex: 2,
          totalIngredients: 2,
        }
      );

      // Verify instruction jobs were scheduled
      expect(mockDeps.instructionQueue.add).toHaveBeenCalledTimes(2);
      expect(mockDeps.instructionQueue.add).toHaveBeenCalledWith(
        "process-instruction-line",
        {
          noteId: "test-note-456",
          importId: "test-import-123",
          instructionLineId: "instruction-1",
          originalText: "Mix flour and sugar",
          lineIndex: 0,
          currentInstructionIndex: 1,
          totalInstructions: 2,
        }
      );
      expect(mockDeps.instructionQueue.add).toHaveBeenCalledWith(
        "process-instruction-line",
        {
          noteId: "test-note-456",
          importId: "test-import-123",
          instructionLineId: "instruction-2",
          originalText: "Bake at 350F",
          lineIndex: 1,
          currentInstructionIndex: 2,
          totalInstructions: 2,
        }
      );

      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "[SCHEDULE_ALL_FOLLOWUP] Total jobs to track: 4 (2 ingredients, 2 instructions)"
      );
      expect(
        mockDeps.database.createNoteCompletionTracker
      ).toHaveBeenCalledWith("test-note-456", 4);
      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "[SCHEDULE_ALL_FOLLOWUP] Created completion tracker for note test-note-456 with 4 total jobs"
      );
      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "[SCHEDULE_ALL_FOLLOWUP] Scheduled 4 tasks successfully, 0 failed for note test-note-456"
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

    it("should handle partial failures gracefully", async () => {
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
          parsedIngredientLines: [
            {
              id: "ingredient-1",
              reference: "2 cups flour",
              blockIndex: 0,
              lineIndex: 0,
            },
          ],
          parsedInstructionLines: [
            {
              id: "instruction-1",
              originalText: "Mix ingredients",
              lineIndex: 0,
            },
          ],
        },
      };

      // Mock ingredient queue to fail on first call, succeed on second
      const mockIngredientAdd = vi
        .fn()
        .mockRejectedValueOnce(new Error("Queue error"))
        .mockResolvedValueOnce({ id: "ingredient-job-123" });
      mockDeps.ingredientQueue.add = mockIngredientAdd;

      const result = await action.execute(data, mockDeps, mockContext);

      expect(result).toEqual(data);
      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "[SCHEDULE_ALL_FOLLOWUP] Failed to schedule ingredient 1: Error: Queue error",
        "error"
      );
      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "[SCHEDULE_ALL_FOLLOWUP] Scheduled 1 tasks successfully, 1 failed for note test-note-456"
      );
    });

    it("should skip undefined ingredient and instruction lines", async () => {
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
          parsedIngredientLines: [
            {
              id: "ingredient-1",
              reference: "2 cups flour",
              blockIndex: 0,
              lineIndex: 0,
            },
            null as unknown as {
              id: string;
              reference: string;
              blockIndex: number;
              lineIndex: number;
            }, // This should be skipped
            {
              id: "ingredient-3",
              reference: "1 cup sugar",
              blockIndex: 0,
              lineIndex: 2,
            },
          ],
          parsedInstructionLines: [
            {
              id: "instruction-1",
              originalText: "Mix ingredients",
              lineIndex: 0,
            },
            null as unknown as {
              id: string;
              originalText: string;
              lineIndex: number;
            }, // This should be skipped
          ],
        },
      };

      const result = await action.execute(data, mockDeps, mockContext);

      expect(result).toEqual(data);

      // Should only schedule 2 ingredient jobs (skipping undefined)
      expect(mockDeps.ingredientQueue.add).toHaveBeenCalledTimes(2);

      // Should only schedule 1 instruction job (skipping undefined)
      expect(mockDeps.instructionQueue.add).toHaveBeenCalledTimes(1);

      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "[SCHEDULE_ALL_FOLLOWUP] Scheduled 3 tasks successfully, 0 failed for note test-note-456"
      );
    });

    it("should handle instruction queue failures", async () => {
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
          parsedInstructionLines: [
            {
              id: "instruction-1",
              originalText: "Mix ingredients",
              lineIndex: 0,
            },
            {
              id: "instruction-2",
              originalText: "Bake at 350F",
              lineIndex: 1,
            },
          ],
        },
      };

      // Mock instruction queue to fail on first call, succeed on second
      const mockInstructionAdd = vi
        .fn()
        .mockRejectedValueOnce(new Error("Instruction queue error"))
        .mockResolvedValueOnce({ id: "instruction-job-123" });
      mockDeps.instructionQueue.add = mockInstructionAdd;

      const result = await action.execute(data, mockDeps, mockContext);

      expect(result).toEqual(data);
      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "[SCHEDULE_ALL_FOLLOWUP] Failed to schedule instruction 1: Error: Instruction queue error",
        "error"
      );
      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "[SCHEDULE_ALL_FOLLOWUP] Scheduled 1 tasks successfully, 1 failed for note test-note-456"
      );
    });

    it("should handle both ingredient and instruction queue failures", async () => {
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
          parsedIngredientLines: [
            {
              id: "ingredient-1",
              reference: "2 cups flour",
              blockIndex: 0,
              lineIndex: 0,
            },
          ],
          parsedInstructionLines: [
            {
              id: "instruction-1",
              originalText: "Mix ingredients",
              lineIndex: 0,
            },
          ],
        },
      };

      // Mock both queues to fail
      mockDeps.ingredientQueue.add = vi
        .fn()
        .mockRejectedValue(new Error("Ingredient queue error"));
      mockDeps.instructionQueue.add = vi
        .fn()
        .mockRejectedValue(new Error("Instruction queue error"));

      const result = await action.execute(data, mockDeps, mockContext);

      expect(result).toEqual(data);
      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "[SCHEDULE_ALL_FOLLOWUP] Failed to schedule ingredient 1: Error: Ingredient queue error",
        "error"
      );
      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "[SCHEDULE_ALL_FOLLOWUP] Failed to schedule instruction 1: Error: Instruction queue error",
        "error"
      );
      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "[SCHEDULE_ALL_FOLLOWUP] Scheduled 0 tasks successfully, 2 failed for note test-note-456"
      );
    });

    it("should handle note with undefined parsedIngredientLines", async () => {
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
          parsedIngredientLines: undefined as unknown as [],
          parsedInstructionLines: [
            {
              id: "instruction-1",
              originalText: "Mix ingredients",
              lineIndex: 0,
            },
          ],
        },
      };

      const result = await action.execute(data, mockDeps, mockContext);

      expect(result).toEqual(data);
      expect(mockDeps.ingredientQueue.add).not.toHaveBeenCalled();
      expect(mockDeps.instructionQueue.add).toHaveBeenCalledTimes(1);
      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "[SCHEDULE_ALL_FOLLOWUP] Total jobs to track: 1 (0 ingredients, 1 instructions)"
      );
    });

    it("should handle note with undefined parsedInstructionLines", async () => {
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
          parsedIngredientLines: [
            {
              id: "ingredient-1",
              reference: "2 cups flour",
              blockIndex: 0,
              lineIndex: 0,
            },
          ],
          parsedInstructionLines: undefined as unknown as [],
        },
      };

      const result = await action.execute(data, mockDeps, mockContext);

      expect(result).toEqual(data);
      expect(mockDeps.ingredientQueue.add).toHaveBeenCalledTimes(1);
      expect(mockDeps.instructionQueue.add).not.toHaveBeenCalled();
      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "[SCHEDULE_ALL_FOLLOWUP] Total jobs to track: 1 (1 ingredients, 0 instructions)"
      );
    });

    it("should not create completion tracker when totalJobs is 0", async () => {
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
      expect(
        mockDeps.database.createNoteCompletionTracker
      ).not.toHaveBeenCalled();
      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "[SCHEDULE_ALL_FOLLOWUP] Total jobs to track: 0 (0 ingredients, 0 instructions)"
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

  describe("private methods", () => {
    it("should create ingredient scheduling promises correctly", async () => {
      const note = {
        id: "test-note-456",
        title: "Test Recipe",
        content: "test content",
        createdAt: new Date(),
        updatedAt: new Date(),
        parsedIngredientLines: [
          {
            id: "ingredient-1",
            reference: "2 cups flour",
            blockIndex: 0,
            lineIndex: 0,
          },
        ],
        parsedInstructionLines: [],
      };

      const importId = "test-import-123";

      // Access private method using type assertion
      const createPromises = (
        action as unknown as {
          createIngredientSchedulingPromises: (
            note: NotePipelineStage3["note"],
            importId: string,
            deps: ScheduleAllFollowupTasksDeps
          ) => Promise<unknown>[];
        }
      ).createIngredientSchedulingPromises.bind(action);
      const promises = createPromises(note, importId, mockDeps);

      expect(promises).toHaveLength(1);

      // Execute the promise to verify it works
      const results = await Promise.all(promises);
      expect(results).toHaveLength(1);
      expect(mockDeps.ingredientQueue.add).toHaveBeenCalledWith(
        "process_ingredient_line",
        {
          noteId: "test-note-456",
          importId: "test-import-123",
          ingredientLineId: "ingredient-1",
          reference: "2 cups flour",
          blockIndex: 0,
          lineIndex: 0,
          currentIngredientIndex: 1,
          totalIngredients: 1,
        }
      );
    });

    it("should create instruction scheduling promises correctly", async () => {
      const note = {
        id: "test-note-456",
        title: "Test Recipe",
        content: "test content",
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
      };

      const importId = "test-import-123";

      // Access private method using type assertion
      const createPromises = (
        action as unknown as {
          createInstructionSchedulingPromises: (
            note: NotePipelineStage3["note"],
            importId: string,
            deps: ScheduleAllFollowupTasksDeps
          ) => Promise<unknown>[];
        }
      ).createInstructionSchedulingPromises.bind(action);
      const promises = createPromises(note, importId, mockDeps);

      expect(promises).toHaveLength(1);

      // Execute the promise to verify it works
      const results = await Promise.all(promises);
      expect(results).toHaveLength(1);
      expect(mockDeps.instructionQueue.add).toHaveBeenCalledWith(
        "process-instruction-line",
        {
          noteId: "test-note-456",
          importId: "test-import-123",
          instructionLineId: "instruction-1",
          originalText: "Mix ingredients",
          lineIndex: 0,
          currentInstructionIndex: 1,
          totalInstructions: 1,
        }
      );
    });

    it("should log scheduling results correctly", () => {
      const results = [1, 2, null, 3, null]; // 3 successful, 2 failed
      const noteId = "test-note-456";

      // Access private method using type assertion
      const logResults = (
        action as unknown as {
          logSchedulingResults: (
            results: unknown[],
            noteId: string,
            deps: ScheduleAllFollowupTasksDeps
          ) => void;
        }
      ).logSchedulingResults.bind(action);
      logResults(results, noteId, mockDeps);

      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "[SCHEDULE_ALL_FOLLOWUP] Scheduled 3 tasks successfully, 2 failed for note test-note-456"
      );
    });

    it("should handle ingredient scheduling promise rejection", async () => {
      const note = {
        id: "test-note-456",
        title: "Test Recipe",
        content: "test content",
        createdAt: new Date(),
        updatedAt: new Date(),
        parsedIngredientLines: [
          {
            id: "ingredient-1",
            reference: "2 cups flour",
            blockIndex: 0,
            lineIndex: 0,
          },
        ],
        parsedInstructionLines: [],
      };

      const importId = "test-import-123";

      // Mock ingredient queue to reject
      mockDeps.ingredientQueue.add = vi
        .fn()
        .mockRejectedValue(new Error("Ingredient queue error"));

      // Access private method using type assertion
      const createPromises = (
        action as unknown as {
          createIngredientSchedulingPromises: (
            note: NotePipelineStage3["note"],
            importId: string,
            deps: ScheduleAllFollowupTasksDeps
          ) => Promise<unknown>[];
        }
      ).createIngredientSchedulingPromises.bind(action);
      const promises = createPromises(note, importId, mockDeps);

      expect(promises).toHaveLength(1);

      // Execute the promise to verify error handling
      const results = await Promise.all(promises);
      expect(results).toHaveLength(1);
      expect(results[0]).toBe(null);
      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "[SCHEDULE_ALL_FOLLOWUP] Failed to schedule ingredient 1: Error: Ingredient queue error",
        "error"
      );
    });

    it("should handle instruction scheduling promise rejection", async () => {
      const note = {
        id: "test-note-456",
        title: "Test Recipe",
        content: "test content",
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
      };

      const importId = "test-import-123";

      // Mock instruction queue to reject
      mockDeps.instructionQueue.add = vi
        .fn()
        .mockRejectedValue(new Error("Instruction queue error"));

      // Access private method using type assertion
      const createPromises = (
        action as unknown as {
          createInstructionSchedulingPromises: (
            note: NotePipelineStage3["note"],
            importId: string,
            deps: ScheduleAllFollowupTasksDeps
          ) => Promise<unknown>[];
        }
      ).createInstructionSchedulingPromises.bind(action);
      const promises = createPromises(note, importId, mockDeps);

      expect(promises).toHaveLength(1);

      // Execute the promise to verify error handling
      const results = await Promise.all(promises);
      expect(results).toHaveLength(1);
      expect(results[0]).toBe(null);
      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "[SCHEDULE_ALL_FOLLOWUP] Failed to schedule instruction 1: Error: Instruction queue error",
        "error"
      );
    });
  });
});
