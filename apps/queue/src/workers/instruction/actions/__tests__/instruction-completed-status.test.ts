import { describe, it, expect, beforeEach, vi } from "vitest";
import { InstructionCompletedStatusAction } from "../instruction-completed-status";
import type {
  InstructionCompletedStatusData,
  InstructionCompletedStatusDeps,
} from "../instruction-completed-status";
import type { ActionContext } from "../../../core/types";

describe("InstructionCompletedStatusAction", () => {
  let action: InstructionCompletedStatusAction;
  let mockDeps: InstructionCompletedStatusDeps;
  let mockContext: ActionContext;

  beforeEach(() => {
    vi.clearAllMocks();
    action = new InstructionCompletedStatusAction();
    mockDeps = {
      addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
    };
    mockContext = {
      jobId: "test-job-123",
      retryCount: 0,
      queueName: "instruction-queue",
      operation: "instruction-completed-status",
      startTime: Date.now(),
      workerName: "test-worker",
      attemptNumber: 1,
    };
  });

  describe("execute", () => {
    it("should broadcast completed status for final instruction", async () => {
      const data: InstructionCompletedStatusData = {
        noteId: "test-note-123",
        instructionLineId: "test-line-456",
        originalText: "Mix ingredients",
        lineIndex: 0,
        importId: "test-import-789",
        currentInstructionIndex: 5,
        totalInstructions: 5,
        parseStatus: "CORRECT",
        success: true,
        stepsSaved: 1,
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
          instructionLineId: "test-line-456",
          parseStatus: "CORRECT",
          isComplete: true,
        },
      });
    });

    it("should broadcast processing status for non-final instruction", async () => {
      const data: InstructionCompletedStatusData = {
        noteId: "test-note-123",
        instructionLineId: "test-line-456",
        originalText: "Mix ingredients",
        lineIndex: 0,
        importId: "test-import-789",
        currentInstructionIndex: 2,
        totalInstructions: 5,
        parseStatus: "CORRECT",
        success: true,
        stepsSaved: 1,
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
          instructionLineId: "test-line-456",
          parseStatus: "CORRECT",
          isComplete: false,
        },
      });
    });

    it("should handle missing importId", async () => {
      const data: InstructionCompletedStatusData = {
        noteId: "test-note-123",
        instructionLineId: "test-line-456",
        originalText: "Mix ingredients",
        lineIndex: 0,
        // Missing importId
        currentInstructionIndex: 2,
        totalInstructions: 5,
        parseStatus: "CORRECT",
        success: true,
        stepsSaved: 1,
      };

      const result = await action.execute(data, mockDeps, mockContext);

      expect(result).toEqual(data);
      expect(mockDeps.addStatusEventAndBroadcast).not.toHaveBeenCalled();
    });

    it("should handle missing currentInstructionIndex", async () => {
      const data: InstructionCompletedStatusData = {
        noteId: "test-note-123",
        instructionLineId: "test-line-456",
        originalText: "Mix ingredients",
        lineIndex: 0,
        importId: "test-import-789",
        // Missing currentInstructionIndex
        totalInstructions: 5,
        parseStatus: "CORRECT",
        success: true,
        stepsSaved: 1,
      };

      const result = await action.execute(data, mockDeps, mockContext);

      expect(result).toEqual(data);
      expect(mockDeps.addStatusEventAndBroadcast).not.toHaveBeenCalled();
    });

    it("should handle missing totalInstructions", async () => {
      const data: InstructionCompletedStatusData = {
        noteId: "test-note-123",
        instructionLineId: "test-line-456",
        originalText: "Mix ingredients",
        lineIndex: 0,
        importId: "test-import-789",
        currentInstructionIndex: 2,
        // Missing totalInstructions
        parseStatus: "CORRECT",
        success: true,
        stepsSaved: 1,
      };

      const result = await action.execute(data, mockDeps, mockContext);

      expect(result).toEqual(data);
      expect(mockDeps.addStatusEventAndBroadcast).not.toHaveBeenCalled();
    });

    it("should handle non-numeric currentInstructionIndex", async () => {
      const data: InstructionCompletedStatusData = {
        noteId: "test-note-123",
        instructionLineId: "test-line-456",
        originalText: "Mix ingredients",
        lineIndex: 0,
        importId: "test-import-789",
        currentInstructionIndex: "not-a-number" as unknown as number,
        totalInstructions: 5,
        parseStatus: "CORRECT",
        success: true,
        stepsSaved: 1,
      };

      const result = await action.execute(data, mockDeps, mockContext);

      expect(result).toEqual(data);
      expect(mockDeps.addStatusEventAndBroadcast).not.toHaveBeenCalled();
    });

    it("should handle non-numeric totalInstructions", async () => {
      const data: InstructionCompletedStatusData = {
        noteId: "test-note-123",
        instructionLineId: "test-line-456",
        originalText: "Mix ingredients",
        lineIndex: 0,
        importId: "test-import-789",
        currentInstructionIndex: 2,
        totalInstructions: "not-a-number" as unknown as number,
        parseStatus: "CORRECT",
        success: true,
        stepsSaved: 1,
      };

      const result = await action.execute(data, mockDeps, mockContext);

      expect(result).toEqual(data);
      expect(mockDeps.addStatusEventAndBroadcast).not.toHaveBeenCalled();
    });

    it("should handle missing parseStatus", async () => {
      const data: InstructionCompletedStatusData = {
        noteId: "test-note-123",
        instructionLineId: "test-line-456",
        originalText: "Mix ingredients",
        lineIndex: 0,
        importId: "test-import-789",
        currentInstructionIndex: 2,
        totalInstructions: 5,
        // Missing parseStatus
        success: true,
        stepsSaved: 1,
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
          instructionLineId: "test-line-456",
          parseStatus: "UNKNOWN",
          isComplete: false,
        },
      });
    });

    it("should handle single instruction completion", async () => {
      const data: InstructionCompletedStatusData = {
        noteId: "test-note-123",
        instructionLineId: "test-line-456",
        originalText: "Mix ingredients",
        lineIndex: 0,
        importId: "test-import-789",
        currentInstructionIndex: 1,
        totalInstructions: 1,
        parseStatus: "CORRECT",
        success: true,
        stepsSaved: 1,
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
          instructionLineId: "test-line-456",
          parseStatus: "CORRECT",
          isComplete: true,
        },
      });
    });

    it("should handle large instruction counts", async () => {
      const data: InstructionCompletedStatusData = {
        noteId: "test-note-123",
        instructionLineId: "test-line-456",
        originalText: "Mix ingredients",
        lineIndex: 0,
        importId: "test-import-789",
        currentInstructionIndex: 50,
        totalInstructions: 100,
        parseStatus: "CORRECT",
        success: true,
        stepsSaved: 1,
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
          instructionLineId: "test-line-456",
          parseStatus: "CORRECT",
          isComplete: false,
        },
      });
    });

    it("should handle error status", async () => {
      const data: InstructionCompletedStatusData = {
        noteId: "test-note-123",
        instructionLineId: "test-line-456",
        originalText: "Invalid instruction",
        lineIndex: 0,
        importId: "test-import-789",
        currentInstructionIndex: 2,
        totalInstructions: 5,
        parseStatus: "ERROR",
        success: false,
        stepsSaved: 0,
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
          instructionLineId: "test-line-456",
          parseStatus: "ERROR",
          isComplete: false,
        },
      });
    });

    it("should handle error in status broadcast", async () => {
      const data: InstructionCompletedStatusData = {
        noteId: "test-note-123",
        instructionLineId: "test-line-456",
        originalText: "Mix ingredients",
        lineIndex: 0,
        importId: "test-import-789",
        currentInstructionIndex: 2,
        totalInstructions: 5,
        parseStatus: "CORRECT",
        success: true,
        stepsSaved: 1,
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
      const data: InstructionCompletedStatusData = {
        noteId: "test-note-123",
        instructionLineId: "test-line-456",
        originalText: "Mix ingredients",
        lineIndex: 0,
        importId: "test-import-789",
        currentInstructionIndex: 2,
        totalInstructions: 5,
        parseStatus: "CORRECT",
        success: true,
        stepsSaved: 1,
      };

      const result = await action.executeWithTiming(
        data,
        mockDeps,
        mockContext
      );

      expect(result.success).toBe(true);
      if (result.success) {
        const resultData = result.data as InstructionCompletedStatusData;
        expect(resultData).toEqual(data);
        expect(result.duration).toBeGreaterThanOrEqual(0);
      }
    });

    it("should handle errors with timing wrapper", async () => {
      const data: InstructionCompletedStatusData = {
        noteId: "test-note-123",
        instructionLineId: "test-line-456",
        originalText: "Mix ingredients",
        lineIndex: 0,
        importId: "test-import-789",
        currentInstructionIndex: 2,
        totalInstructions: 5,
        parseStatus: "CORRECT",
        success: true,
        stepsSaved: 1,
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
      const data: InstructionCompletedStatusData = {
        noteId: "test-note-123",
        instructionLineId: "test-line-456",
        originalText: "Mix ingredients",
        lineIndex: 0,
        importId: "test-import-789",
        currentInstructionIndex: 0,
        totalInstructions: 0,
        parseStatus: "CORRECT",
        success: true,
        stepsSaved: 1,
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
          instructionLineId: "test-line-456",
          parseStatus: "CORRECT",
          isComplete: true,
        },
      });
    });

    it("should handle options in data", async () => {
      const data: InstructionCompletedStatusData = {
        noteId: "test-note-123",
        instructionLineId: "test-line-456",
        originalText: "Mix ingredients",
        lineIndex: 0,
        importId: "test-import-789",
        currentInstructionIndex: 2,
        totalInstructions: 5,
        parseStatus: "CORRECT",
        success: true,
        stepsSaved: 1,
        options: {
          normalizeText: true,
          extractTiming: true,
        },
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
          instructionLineId: "test-line-456",
          parseStatus: "CORRECT",
          isComplete: false,
        },
      });
    });
  });
});
