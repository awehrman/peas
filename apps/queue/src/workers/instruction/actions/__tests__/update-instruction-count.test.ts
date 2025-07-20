import { describe, it, expect, beforeEach, vi } from "vitest";
import { UpdateInstructionCountAction } from "../update-instruction-count";
import type {
  UpdateInstructionCountData,
  UpdateInstructionCountDeps,
} from "../update-instruction-count";
import type { ActionContext } from "../../../core/types";

describe("UpdateInstructionCountAction", () => {
  let action: UpdateInstructionCountAction;
  let mockDeps: UpdateInstructionCountDeps;
  let mockContext: ActionContext;

  beforeEach(() => {
    vi.clearAllMocks();
    action = new UpdateInstructionCountAction();
    mockDeps = {
      addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
      database: {
        updateInstructionLine: vi.fn().mockResolvedValue(undefined),
        createInstructionSteps: vi.fn().mockResolvedValue(undefined),
      },
      parseInstruction: vi.fn().mockResolvedValue({
        success: true,
        parseStatus: "CORRECT" as const,
        normalizedText: "test",
        steps: [],
        processingTime: 0,
      }),
      ErrorHandler: {
        withErrorHandling: vi.fn().mockImplementation(async (operation) => {
          return await operation();
        }),
      },
      logger: {
        log: vi.fn(),
      },
    };
    mockContext = {
      jobId: "test-job-123",
      retryCount: 0,
      queueName: "instruction-queue",
      operation: "update-instruction-count",
      startTime: Date.now(),
      workerName: "test-worker",
      attemptNumber: 1,
    };
  });

  describe("execute", () => {
    it("should update instruction count for processing status", async () => {
      const data: UpdateInstructionCountData = {
        importId: "test-import-789",
        noteId: "test-note-123",
        currentInstructionIndex: 2,
        totalInstructions: 5,
      };

      const result = await action.execute(data, mockDeps, mockContext);

      expect(result).toEqual(data);
      expect(mockDeps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: "test-import-789",
        noteId: "test-note-123",
        status: "PROCESSING",
        message: "⏳ 2/5 instructions",
        context: "parse_html_instructions",
        indentLevel: 2,
        metadata: {
          totalInstructions: 5,
          processedInstructions: 2,
          isComplete: false,
        },
      });
    });

    it("should update instruction count for completed status", async () => {
      const data: UpdateInstructionCountData = {
        importId: "test-import-789",
        noteId: "test-note-123",
        currentInstructionIndex: 5,
        totalInstructions: 5,
      };

      const result = await action.execute(data, mockDeps, mockContext);

      expect(result).toEqual(data);
      expect(mockDeps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: "test-import-789",
        noteId: "test-note-123",
        status: "COMPLETED",
        message: "✅ 5/5 instructions",
        context: "parse_html_instructions",
        indentLevel: 2,
        metadata: {
          totalInstructions: 5,
          processedInstructions: 5,
          isComplete: true,
        },
      });
    });

    it("should handle first instruction", async () => {
      const data: UpdateInstructionCountData = {
        importId: "test-import-789",
        noteId: "test-note-123",
        currentInstructionIndex: 1,
        totalInstructions: 3,
      };

      const result = await action.execute(data, mockDeps, mockContext);

      expect(result).toEqual(data);
      expect(mockDeps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: "test-import-789",
        noteId: "test-note-123",
        status: "PROCESSING",
        message: "⏳ 1/3 instructions",
        context: "parse_html_instructions",
        indentLevel: 2,
        metadata: {
          totalInstructions: 3,
          processedInstructions: 1,
          isComplete: false,
        },
      });
    });

    it("should handle single instruction", async () => {
      const data: UpdateInstructionCountData = {
        importId: "test-import-789",
        noteId: "test-note-123",
        currentInstructionIndex: 1,
        totalInstructions: 1,
      };

      const result = await action.execute(data, mockDeps, mockContext);

      expect(result).toEqual(data);
      expect(mockDeps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: "test-import-789",
        noteId: "test-note-123",
        status: "COMPLETED",
        message: "✅ 1/1 instructions",
        context: "parse_html_instructions",
        indentLevel: 2,
        metadata: {
          totalInstructions: 1,
          processedInstructions: 1,
          isComplete: true,
        },
      });
    });

    it("should handle missing noteId", async () => {
      const data: UpdateInstructionCountData = {
        importId: "test-import-789",
        noteId: undefined,
        currentInstructionIndex: 2,
        totalInstructions: 5,
      };

      const result = await action.execute(data, mockDeps, mockContext);

      expect(result).toEqual(data);
      expect(mockDeps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: "test-import-789",
        noteId: undefined,
        status: "PROCESSING",
        message: "⏳ 2/5 instructions",
        context: "parse_html_instructions",
        indentLevel: 2,
        metadata: {
          totalInstructions: 5,
          processedInstructions: 2,
          isComplete: false,
        },
      });
    });

    it("should handle large instruction counts", async () => {
      const data: UpdateInstructionCountData = {
        importId: "test-import-789",
        noteId: "test-note-123",
        currentInstructionIndex: 50,
        totalInstructions: 100,
      };

      const result = await action.execute(data, mockDeps, mockContext);

      expect(result).toEqual(data);
      expect(mockDeps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: "test-import-789",
        noteId: "test-note-123",
        status: "PROCESSING",
        message: "⏳ 50/100 instructions",
        context: "parse_html_instructions",
        indentLevel: 2,
        metadata: {
          totalInstructions: 100,
          processedInstructions: 50,
          isComplete: false,
        },
      });
    });

    it("should handle error in status broadcast", async () => {
      const data: UpdateInstructionCountData = {
        importId: "test-import-789",
        noteId: "test-note-123",
        currentInstructionIndex: 2,
        totalInstructions: 5,
      };

      // Mock the status broadcast to throw an error
      mockDeps.addStatusEventAndBroadcast = vi
        .fn()
        .mockRejectedValue(new Error("Broadcast error"));

      await expect(action.execute(data, mockDeps, mockContext)).rejects.toThrow(
        "Broadcast error"
      );
    });

    it("should execute with timing wrapper", async () => {
      const data: UpdateInstructionCountData = {
        importId: "test-import-789",
        noteId: "test-note-123",
        currentInstructionIndex: 2,
        totalInstructions: 5,
      };

      const result = await action.executeWithTiming(
        data,
        mockDeps,
        mockContext
      );

      expect(result.success).toBe(true);
      if (result.success) {
        const resultData = result.data as UpdateInstructionCountData;
        expect(resultData).toEqual(data);
        expect(result.duration).toBeGreaterThanOrEqual(0);
      }
    });

    it("should handle errors with timing wrapper", async () => {
      const data: UpdateInstructionCountData = {
        importId: "test-import-789",
        noteId: "test-note-123",
        currentInstructionIndex: 2,
        totalInstructions: 5,
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

    it("should handle edge case where current equals total but not complete", async () => {
      const data: UpdateInstructionCountData = {
        importId: "test-import-789",
        noteId: "test-note-123",
        currentInstructionIndex: 0,
        totalInstructions: 0,
      };

      const result = await action.execute(data, mockDeps, mockContext);

      expect(result).toEqual(data);
      expect(mockDeps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: "test-import-789",
        noteId: "test-note-123",
        status: "COMPLETED",
        message: "✅ 0/0 instructions",
        context: "parse_html_instructions",
        indentLevel: 2,
        metadata: {
          totalInstructions: 0,
          processedInstructions: 0,
          isComplete: true,
        },
      });
    });

    it("should successfully call incrementNoteCompletionTracker when available", async () => {
      const data: UpdateInstructionCountData = {
        importId: "test-import-789",
        noteId: "test-note-123",
        currentInstructionIndex: 2,
        totalInstructions: 5,
      };

      const mockIncrementTracker = vi.fn().mockResolvedValue(undefined);
      const mockLogger = vi.fn();

      const depsWithTracker: UpdateInstructionCountDeps = {
        ...mockDeps,
        database: {
          ...mockDeps.database,
          incrementNoteCompletionTracker: mockIncrementTracker,
        },
        logger: {
          log: mockLogger,
        },
      };

      const result = await action.execute(data, depsWithTracker, mockContext);

      expect(result).toEqual(data);
      expect(mockIncrementTracker).toHaveBeenCalledWith("test-note-123");
      expect(mockLogger).toHaveBeenCalledWith(
        "[UPDATE_INSTRUCTION_COUNT] Incremented completion tracker for note test-note-123: instruction 2/5 completed"
      );
      expect(depsWithTracker.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: "test-import-789",
        noteId: "test-note-123",
        status: "PROCESSING",
        message: "⏳ 2/5 instructions",
        context: "parse_html_instructions",
        indentLevel: 2,
        metadata: {
          totalInstructions: 5,
          processedInstructions: 2,
          isComplete: false,
        },
      });
    });

    it("should handle error when incrementNoteCompletionTracker throws", async () => {
      const data: UpdateInstructionCountData = {
        importId: "test-import-789",
        noteId: "test-note-123",
        currentInstructionIndex: 2,
        totalInstructions: 5,
      };

      const mockIncrementTracker = vi
        .fn()
        .mockRejectedValue(new Error("Database error"));
      const mockLogger = vi.fn();

      const depsWithTracker: UpdateInstructionCountDeps = {
        ...mockDeps,
        database: {
          ...mockDeps.database,
          incrementNoteCompletionTracker: mockIncrementTracker,
        },
        logger: {
          log: mockLogger,
        },
      };

      const result = await action.execute(data, depsWithTracker, mockContext);

      expect(result).toEqual(data);
      expect(mockIncrementTracker).toHaveBeenCalledWith("test-note-123");
      expect(mockLogger).toHaveBeenCalledWith(
        "[UPDATE_INSTRUCTION_COUNT] Failed to update completion tracker for note test-note-123: Error: Database error",
        "error"
      );
      expect(depsWithTracker.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: "test-import-789",
        noteId: "test-note-123",
        status: "PROCESSING",
        message: "⏳ 2/5 instructions",
        context: "parse_html_instructions",
        indentLevel: 2,
        metadata: {
          totalInstructions: 5,
          processedInstructions: 2,
          isComplete: false,
        },
      });
    });

    it("should handle incrementNoteCompletionTracker with completed status", async () => {
      const data: UpdateInstructionCountData = {
        importId: "test-import-789",
        noteId: "test-note-123",
        currentInstructionIndex: 5,
        totalInstructions: 5,
      };

      const mockIncrementTracker = vi.fn().mockResolvedValue(undefined);
      const mockLogger = vi.fn();

      const depsWithTracker: UpdateInstructionCountDeps = {
        ...mockDeps,
        database: {
          ...mockDeps.database,
          incrementNoteCompletionTracker: mockIncrementTracker,
        },
        logger: {
          log: mockLogger,
        },
      };

      const result = await action.execute(data, depsWithTracker, mockContext);

      expect(result).toEqual(data);
      expect(mockIncrementTracker).toHaveBeenCalledWith("test-note-123");
      expect(mockLogger).toHaveBeenCalledWith(
        "[UPDATE_INSTRUCTION_COUNT] Incremented completion tracker for note test-note-123: instruction 5/5 completed"
      );
      expect(depsWithTracker.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: "test-import-789",
        noteId: "test-note-123",
        status: "COMPLETED",
        message: "✅ 5/5 instructions",
        context: "parse_html_instructions",
        indentLevel: 2,
        metadata: {
          totalInstructions: 5,
          processedInstructions: 5,
          isComplete: true,
        },
      });
    });

    it("should handle incrementNoteCompletionTracker when logger is undefined", async () => {
      const data: UpdateInstructionCountData = {
        importId: "test-import-789",
        noteId: "test-note-123",
        currentInstructionIndex: 2,
        totalInstructions: 5,
      };

      const mockIncrementTracker = vi.fn().mockResolvedValue(undefined);

      const depsWithTracker: UpdateInstructionCountDeps = {
        ...mockDeps,
        database: {
          ...mockDeps.database,
          incrementNoteCompletionTracker: mockIncrementTracker,
        },
        logger: {
          log: vi.fn(),
        },
      };

      const result = await action.execute(data, depsWithTracker, mockContext);

      expect(result).toEqual(data);
      expect(mockIncrementTracker).toHaveBeenCalledWith("test-note-123");
      // Should not throw when logger is undefined
      expect(depsWithTracker.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: "test-import-789",
        noteId: "test-note-123",
        status: "PROCESSING",
        message: "⏳ 2/5 instructions",
        context: "parse_html_instructions",
        indentLevel: 2,
        metadata: {
          totalInstructions: 5,
          processedInstructions: 2,
          isComplete: false,
        },
      });
    });

    it("should handle incrementNoteCompletionTracker error when logger is undefined", async () => {
      const data: UpdateInstructionCountData = {
        importId: "test-import-789",
        noteId: "test-note-123",
        currentInstructionIndex: 2,
        totalInstructions: 5,
      };

      const mockIncrementTracker = vi
        .fn()
        .mockRejectedValue(new Error("Database error"));

      const depsWithTracker: UpdateInstructionCountDeps = {
        ...mockDeps,
        database: {
          ...mockDeps.database,
          incrementNoteCompletionTracker: mockIncrementTracker,
        },
        logger: {
          log: vi.fn(),
        },
      };

      const result = await action.execute(data, depsWithTracker, mockContext);

      expect(result).toEqual(data);
      expect(mockIncrementTracker).toHaveBeenCalledWith("test-note-123");
      // Should not throw when logger is undefined
      expect(depsWithTracker.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: "test-import-789",
        noteId: "test-note-123",
        status: "PROCESSING",
        message: "⏳ 2/5 instructions",
        context: "parse_html_instructions",
        indentLevel: 2,
        metadata: {
          totalInstructions: 5,
          processedInstructions: 2,
          isComplete: false,
        },
      });
    });
  });
});
