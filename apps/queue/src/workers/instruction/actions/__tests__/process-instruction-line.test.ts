import { describe, it, expect, beforeEach, vi } from "vitest";
import { ProcessInstructionLineAction } from "../process-instruction-line";
import type { ProcessInstructionLineInput } from "../process-instruction-line";
import type { InstructionWorkerDependencies } from "../../types";
import type { ActionContext } from "../../../core/types";

describe("ProcessInstructionLineAction", () => {
  let action: ProcessInstructionLineAction;
  let mockDeps: InstructionWorkerDependencies;
  let mockContext: ActionContext;

  beforeEach(() => {
    vi.clearAllMocks();
    action = new ProcessInstructionLineAction();
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
      operation: "process-instruction-line",
      startTime: Date.now(),
      workerName: "test-worker",
      attemptNumber: 1,
    };
  });

  describe("execute", () => {
    it("should process instruction line successfully with cooking action", async () => {
      const input: ProcessInstructionLineInput = {
        noteId: "test-note-123",
        instructionLineId: "test-line-456",
        originalText: "Mix ingredients in a bowl",
        lineIndex: 0,
      };

      const result = await action.execute(input, mockDeps, mockContext);

      expect(result.success).toBe(true);
      expect(result.parseStatus).toBe("CORRECT");
      expect(result.normalizedText).toBe("mix ingredients in a bowl.");
      expect(result.steps).toHaveLength(1);
      expect(result.steps?.[0]).toEqual({
        stepNumber: 1,
        action: "Mix ingredients in a bowl",
      });
      expect(result.processingTime).toBe(30);
      expect(mockDeps.logger.log).toHaveBeenCalledWith(
        'Processing instruction line for note test-note-123: instructionLineId=test-line-456, originalText="Mix ingredients in a bowl", lineIndex=0'
      );
    });

    it("should process instruction line with duration extraction", async () => {
      const input: ProcessInstructionLineInput = {
        noteId: "test-note-123",
        instructionLineId: "test-line-456",
        originalText: "Bake for 30 minutes at 350 degrees",
        lineIndex: 1,
      };

      const result = await action.execute(input, mockDeps, mockContext);

      expect(result.success).toBe(true);
      expect(result.parseStatus).toBe("CORRECT");
      expect(result.steps).toHaveLength(1);
      expect(result.steps?.[0]).toEqual({
        stepNumber: 1,
        action: "Bake for 30 minutes at 350 degrees",
        duration: "30 minutes",
        temperature: "350°F",
      });
    });

    it("should process instruction line with temperature extraction", async () => {
      const input: ProcessInstructionLineInput = {
        noteId: "test-note-123",
        instructionLineId: "test-line-456",
        originalText: "Preheat oven to 400°C",
        lineIndex: 0,
      };

      const result = await action.execute(input, mockDeps, mockContext);

      expect(result.success).toBe(true);
      expect(result.parseStatus).toBe("CORRECT");
      expect(result.steps).toHaveLength(1);
      expect(result.steps?.[0]).toEqual({
        stepNumber: 1,
        action: "Preheat oven to 400°C",
        temperature: "400°F",
      });
    });

    it("should handle instruction with step numbers", async () => {
      const input: ProcessInstructionLineInput = {
        noteId: "test-note-123",
        instructionLineId: "test-line-456",
        originalText: "1. Mix ingredients. 2. Bake for 20 minutes.",
        lineIndex: 0,
      };

      const result = await action.execute(input, mockDeps, mockContext);

      expect(result.success).toBe(true);
      expect(result.parseStatus).toBe("CORRECT");
      expect(result.normalizedText).toBe(
        "mix ingredients. 2. bake for 20 minutes."
      );
      expect(result.steps).toHaveLength(4);
      expect(result.steps?.[0]).toEqual({
        stepNumber: 1,
        action: "1",
      });
      expect(result.steps?.[1]).toEqual({
        stepNumber: 2,
        action: "Mix ingredients",
      });
      expect(result.steps?.[2]).toEqual({
        stepNumber: 3,
        action: "2",
      });
      expect(result.steps?.[3]).toEqual({
        stepNumber: 4,
        action: "Bake for 20 minutes",
        duration: "20 minutes",
      });
    });

    it("should handle instruction with multiple sentences", async () => {
      const input: ProcessInstructionLineInput = {
        noteId: "test-note-123",
        instructionLineId: "test-line-456",
        originalText: "Stir the mixture. Then add salt and pepper.",
        lineIndex: 0,
      };

      const result = await action.execute(input, mockDeps, mockContext);

      expect(result.success).toBe(true);
      expect(result.parseStatus).toBe("CORRECT");
      expect(result.steps).toHaveLength(2);
      expect(result.steps?.[0]).toEqual({
        stepNumber: 1,
        action: "Stir the mixture",
      });
      expect(result.steps?.[1]).toEqual({
        stepNumber: 2,
        action: "Then add salt and pepper",
      });
    });

    it("should handle instruction with existing punctuation", async () => {
      const input: ProcessInstructionLineInput = {
        noteId: "test-note-123",
        instructionLineId: "test-line-456",
        originalText: "Mix well!",
        lineIndex: 0,
      };

      const result = await action.execute(input, mockDeps, mockContext);

      expect(result.success).toBe(true);
      expect(result.parseStatus).toBe("CORRECT");
      expect(result.normalizedText).toBe("mix well!");
    });

    it("should handle instruction with whitespace normalization", async () => {
      const input: ProcessInstructionLineInput = {
        noteId: "test-note-123",
        instructionLineId: "test-line-456",
        originalText: "  Mix   ingredients   well  ",
        lineIndex: 0,
      };

      const result = await action.execute(input, mockDeps, mockContext);

      expect(result.success).toBe(true);
      expect(result.parseStatus).toBe("CORRECT");
      expect(result.normalizedText).toBe("mix ingredients well.");
    });

    it("should handle instruction without cooking action but long enough", async () => {
      const input: ProcessInstructionLineInput = {
        noteId: "test-note-123",
        instructionLineId: "test-line-456",
        originalText:
          "This is a very long instruction that should be considered valid",
        lineIndex: 0,
      };

      const result = await action.execute(input, mockDeps, mockContext);

      expect(result.success).toBe(true);
      expect(result.parseStatus).toBe("CORRECT");
      expect(result.steps).toBeDefined();
    });

    it("should handle instruction without cooking action and too short", async () => {
      const input: ProcessInstructionLineInput = {
        noteId: "test-note-123",
        instructionLineId: "test-line-456",
        originalText: "No",
        lineIndex: 0,
      };

      const result = await action.execute(input, mockDeps, mockContext);

      expect(result.success).toBe(true);
      expect(result.parseStatus).toBe("INCORRECT");
      expect(result.steps).toBeUndefined();
    });

    it("should handle empty instruction", async () => {
      const input: ProcessInstructionLineInput = {
        noteId: "test-note-123",
        instructionLineId: "test-line-456",
        originalText: "",
        lineIndex: 0,
      };

      const result = await action.execute(input, mockDeps, mockContext);

      expect(result.success).toBe(false);
      expect(result.parseStatus).toBe("ERROR");
      expect(result.steps).toBeUndefined();
    });

    it("should handle whitespace-only instruction", async () => {
      const input: ProcessInstructionLineInput = {
        noteId: "test-note-123",
        instructionLineId: "test-line-456",
        originalText: "   ",
        lineIndex: 0,
      };

      const result = await action.execute(input, mockDeps, mockContext);

      expect(result.success).toBe(false);
      expect(result.parseStatus).toBe("ERROR");
      expect(result.steps).toBeUndefined();
    });

    it("should handle error during processing", async () => {
      const input: ProcessInstructionLineInput = {
        noteId: "test-note-123",
        instructionLineId: "test-line-456",
        originalText: "Mix ingredients",
        lineIndex: 0,
      };

      // Mock logger to throw an error
      mockDeps.logger.log = vi.fn().mockImplementation(() => {
        throw new Error("Logger error");
      });

      const result = await action.execute(input, mockDeps, mockContext);

      expect(result.success).toBe(false);
      expect(result.parseStatus).toBe("ERROR");
      expect(result.errorMessage).toContain("Logger error");
      expect(result.processingTime).toBeUndefined();
    });

    it("should handle missing logger dependency", async () => {
      const input: ProcessInstructionLineInput = {
        noteId: "test-note-123",
        instructionLineId: "test-line-456",
        originalText: "Mix ingredients",
        lineIndex: 0,
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
      expect(result.parseStatus).toBe("CORRECT");
      // Should still work without logger
    });

    it("should execute with timing wrapper", async () => {
      const input: ProcessInstructionLineInput = {
        noteId: "test-note-123",
        instructionLineId: "test-line-456",
        originalText: "Mix ingredients",
        lineIndex: 0,
      };

      const result = await action.executeWithTiming(
        input,
        mockDeps,
        mockContext
      );

      expect(result.success).toBe(true);
      if (result.success) {
        const data = result.data as { success: boolean; parseStatus: string };
        expect(data.success).toBe(true);
        expect(data.parseStatus).toBe("CORRECT");
        expect(result.duration).toBeGreaterThanOrEqual(0);
      }
    });

    it("should handle errors with timing wrapper", async () => {
      const input: ProcessInstructionLineInput = {
        noteId: "test-note-123",
        instructionLineId: "test-line-456",
        originalText: "Mix ingredients",
        lineIndex: 0,
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
  });

  describe("private methods", () => {
    it("should normalize text correctly", () => {
      const action = new ProcessInstructionLineAction();

      // Test text normalization through public interface
      const input: ProcessInstructionLineInput = {
        noteId: "test-note-123",
        instructionLineId: "test-line-456",
        originalText: "  1.  Mix   ingredients   well  ",
        lineIndex: 0,
      };

      return action.execute(input, mockDeps, mockContext).then((result) => {
        expect(result.normalizedText).toBe("mix ingredients well.");
      });
    });

    it("should validate instruction correctly", () => {
      const action = new ProcessInstructionLineAction();

      // Test validation through public interface
      const validInput: ProcessInstructionLineInput = {
        noteId: "test-note-123",
        instructionLineId: "test-line-456",
        originalText: "Mix ingredients",
        lineIndex: 0,
      };

      const invalidInput: ProcessInstructionLineInput = {
        noteId: "test-note-123",
        instructionLineId: "test-line-456",
        originalText: "Short",
        lineIndex: 0,
      };

      return Promise.all([
        action.execute(validInput, mockDeps, mockContext),
        action.execute(invalidInput, mockDeps, mockContext),
      ]).then(([validResult, invalidResult]) => {
        expect(validResult.parseStatus).toBe("CORRECT");
        expect(invalidResult.parseStatus).toBe("INCORRECT");
      });
    });

    it("should extract steps correctly", () => {
      const action = new ProcessInstructionLineAction();

      // Test step extraction through public interface
      const input: ProcessInstructionLineInput = {
        noteId: "test-note-123",
        instructionLineId: "test-line-456",
        originalText: "Mix ingredients. Bake for 30 minutes at 350°F.",
        lineIndex: 0,
      };

      return action.execute(input, mockDeps, mockContext).then((result) => {
        expect(result.steps).toHaveLength(2);
        expect(result.steps?.[0]).toEqual({
          stepNumber: 1,
          action: "Mix ingredients",
        });
        expect(result.steps?.[1]).toEqual({
          stepNumber: 2,
          action: "Bake for 30 minutes at 350°F",
          duration: "30 minutes",
          temperature: "350°F",
        });
      });
    });
  });
});
