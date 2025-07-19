import { describe, it, expect, beforeEach, vi } from "vitest";
import { SaveInstructionLineAction } from "../save-instruction-line";
import type { SaveInstructionLineInput } from "../save-instruction-line";
import type { InstructionWorkerDependencies } from "../../types";
import type { ActionContext } from "../../../core/types";

describe("SaveInstructionLineAction", () => {
  let action: SaveInstructionLineAction;
  let mockDeps: InstructionWorkerDependencies;
  let mockContext: ActionContext;

  beforeEach(() => {
    vi.clearAllMocks();
    action = new SaveInstructionLineAction();
    mockDeps = {
      logger: {
        log: vi.fn(),
      },
      database: {
        updateInstructionLine: vi.fn().mockResolvedValue({ id: "test-id" }),
        createInstructionSteps: vi.fn().mockResolvedValue([]),
      },
      parseInstruction: vi.fn().mockResolvedValue({
        success: true,
        parseStatus: "CORRECT",
        normalizedText: "test",
        steps: [],
        processingTime: 0,
      }),
      addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
      ErrorHandler: {
        withErrorHandling: vi.fn().mockImplementation(async (op) => op()),
      },
    };
    mockContext = {
      jobId: "test-job-123",
      retryCount: 0,
      queueName: "instruction-queue",
      operation: "save-instruction-line",
      startTime: Date.now(),
      workerName: "test-worker",
      attemptNumber: 1,
    };
  });

  describe("execute", () => {
    it("should save instruction line successfully with steps", async () => {
      const input: SaveInstructionLineInput = {
        noteId: "test-note-123",
        instructionLineId: "test-line-456",
        originalText: "Mix ingredients in a bowl",
        lineIndex: 0,
        success: true,
        parseStatus: "CORRECT",
        normalizedText: "mix ingredients in a bowl.",
        steps: [
          {
            stepNumber: 1,
            action: "Mix ingredients in a bowl",
          },
        ],
        processingTime: 30,
        importId: "test-import-789",
        currentInstructionIndex: 1,
        totalInstructions: 5,
      };

      const result = await action.execute(input, mockDeps, mockContext);

      expect(result.success).toBe(true);
      expect(result.stepsSaved).toBe(1);
      expect(result.parseStatus).toBe("CORRECT");
      expect(result.importId).toBe("test-import-789");
      expect(result.noteId).toBe("test-note-123");
      expect(result.currentInstructionIndex).toBe(1);
      expect(result.totalInstructions).toBe(5);
      expect(result.instructionLineId).toBe("test-line-456");
      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "Saving instruction line data for note test-note-123: instructionLineId=test-line-456, parseStatus=CORRECT, stepsCount=1"
      );
    });

    it("should save instruction line without steps", async () => {
      const input: SaveInstructionLineInput = {
        noteId: "test-note-123",
        instructionLineId: "test-line-456",
        originalText: "Invalid instruction",
        lineIndex: 0,
        success: false,
        parseStatus: "INCORRECT",
        normalizedText: "invalid instruction.",
        steps: undefined,
        processingTime: 10,
      };

      const result = await action.execute(input, mockDeps, mockContext);

      expect(result.success).toBe(false);
      expect(result.stepsSaved).toBe(0);
      expect(result.parseStatus).toBe("INCORRECT");
      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "Saving instruction line data for note test-note-123: instructionLineId=test-line-456, parseStatus=INCORRECT, stepsCount=0"
      );
    });

    it("should save instruction line with multiple steps", async () => {
      const input: SaveInstructionLineInput = {
        noteId: "test-note-123",
        instructionLineId: "test-line-456",
        originalText: "Mix ingredients. Bake for 30 minutes.",
        lineIndex: 0,
        success: true,
        parseStatus: "CORRECT",
        normalizedText: "mix ingredients. bake for 30 minutes.",
        steps: [
          {
            stepNumber: 1,
            action: "Mix ingredients",
          },
          {
            stepNumber: 2,
            action: "Bake for 30 minutes",
            duration: "30 minutes",
          },
        ],
        processingTime: 45,
        importId: "test-import-789",
        currentInstructionIndex: 2,
        totalInstructions: 3,
      };

      const result = await action.execute(input, mockDeps, mockContext);

      expect(result.success).toBe(true);
      expect(result.stepsSaved).toBe(2);
      expect(result.parseStatus).toBe("CORRECT");
      expect(result.currentInstructionIndex).toBe(2);
      expect(result.totalInstructions).toBe(3);
      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "Saving instruction line data for note test-note-123: instructionLineId=test-line-456, parseStatus=CORRECT, stepsCount=2"
      );
    });

    it("should save instruction line with error status", async () => {
      const input: SaveInstructionLineInput = {
        noteId: "test-note-123",
        instructionLineId: "test-line-456",
        originalText: "",
        lineIndex: 0,
        success: false,
        parseStatus: "ERROR",
        errorMessage: "Empty instruction",
        processingTime: 0,
      };

      const result = await action.execute(input, mockDeps, mockContext);

      expect(result.success).toBe(false);
      expect(result.stepsSaved).toBe(0);
      expect(result.parseStatus).toBe("ERROR");
      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        "Saving instruction line data for note test-note-123: instructionLineId=test-line-456, parseStatus=ERROR, stepsCount=0"
      );
    });

    it("should handle missing logger dependency", async () => {
      const input: SaveInstructionLineInput = {
        noteId: "test-note-123",
        instructionLineId: "test-line-456",
        originalText: "Mix ingredients",
        lineIndex: 0,
        success: true,
        parseStatus: "CORRECT",
        normalizedText: "mix ingredients.",
        steps: [],
        processingTime: 20,
      };

      const depsWithoutLogger = {
        ...mockDeps,
        logger: undefined,
      } as unknown as InstructionWorkerDependencies;

      const result = await action.execute(
        input,
        depsWithoutLogger,
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.stepsSaved).toBe(0);
      expect(result.parseStatus).toBe("CORRECT");
      // Should still work without logger
    });

    it("should handle error during save operation", async () => {
      const input: SaveInstructionLineInput = {
        noteId: "test-note-123",
        instructionLineId: "test-line-456",
        originalText: "Mix ingredients",
        lineIndex: 0,
        success: true,
        parseStatus: "CORRECT",
        normalizedText: "mix ingredients.",
        steps: [],
        processingTime: 20,
      };

      // Mock logger to throw an error
      mockDeps.logger.log = vi.fn().mockImplementation(() => {
        throw new Error("Save error");
      });

      await expect(
        action.execute(input, mockDeps, mockContext)
      ).rejects.toThrow("Failed to save instruction line: Error: Save error");
    });

    it("should execute with timing wrapper", async () => {
      const input: SaveInstructionLineInput = {
        noteId: "test-note-123",
        instructionLineId: "test-line-456",
        originalText: "Mix ingredients",
        lineIndex: 0,
        success: true,
        parseStatus: "CORRECT",
        normalizedText: "mix ingredients.",
        steps: [],
        processingTime: 20,
      };

      const result = await action.executeWithTiming(
        input,
        mockDeps,
        mockContext
      );

      expect(result.success).toBe(true);
      if (result.success) {
        const data = result.data as {
          success: boolean;
          stepsSaved: number;
          parseStatus: string;
        };
        expect(data.success).toBe(true);
        expect(data.stepsSaved).toBe(0);
        expect(data.parseStatus).toBe("CORRECT");
        expect(result.duration).toBeGreaterThanOrEqual(0);
      }
    });

    it("should handle errors with timing wrapper", async () => {
      const input: SaveInstructionLineInput = {
        noteId: "test-note-123",
        instructionLineId: "test-line-456",
        originalText: "Mix ingredients",
        lineIndex: 0,
        success: true,
        parseStatus: "CORRECT",
        normalizedText: "mix ingredients.",
        steps: [],
        processingTime: 20,
      };

      // Mock the execute method to throw an error
      vi.spyOn(action, "execute").mockRejectedValue(new Error("Test error"));

      const result = await action.executeWithTiming(
        input,
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

    it("should pass through tracking information correctly", async () => {
      const input: SaveInstructionLineInput = {
        noteId: "test-note-123",
        instructionLineId: "test-line-456",
        originalText: "Mix ingredients",
        lineIndex: 0,
        success: true,
        parseStatus: "CORRECT",
        normalizedText: "mix ingredients.",
        steps: [],
        processingTime: 20,
        importId: "test-import-789",
        currentInstructionIndex: 3,
        totalInstructions: 10,
      };

      const result = await action.execute(input, mockDeps, mockContext);

      expect(result.importId).toBe("test-import-789");
      expect(result.noteId).toBe("test-note-123");
      expect(result.currentInstructionIndex).toBe(3);
      expect(result.totalInstructions).toBe(10);
      expect(result.instructionLineId).toBe("test-line-456");
    });

    it("should handle undefined tracking information", async () => {
      const input: SaveInstructionLineInput = {
        noteId: "test-note-123",
        instructionLineId: "test-line-456",
        originalText: "Mix ingredients",
        lineIndex: 0,
        success: true,
        parseStatus: "CORRECT",
        normalizedText: "mix ingredients.",
        steps: [],
        processingTime: 20,
        // Missing tracking information
      };

      const result = await action.execute(input, mockDeps, mockContext);

      expect(result.success).toBe(true);
      expect(result.importId).toBeUndefined();
      expect(result.currentInstructionIndex).toBeUndefined();
      expect(result.totalInstructions).toBeUndefined();
    });
  });
});
