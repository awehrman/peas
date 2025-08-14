import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActionName } from "../../../types";
import type { ActionContext } from "../../core/types";
import type {
  InstructionJobData,
  InstructionWorkerDependencies,
} from "../../instruction/dependencies";
import { createInstructionPipeline } from "../../instruction/pipeline";

// Helper function to create test data with optional fields for testing
function createTestData(
  overrides: Partial<InstructionJobData> = {}
): InstructionJobData {
  return {
    noteId: "test-note-id",
    instructionReference: "Mix ingredients",
    lineIndex: 0,
    parseStatus: "COMPLETED_SUCCESSFULLY" as const,
    isActive: true,
    ...overrides,
  } as InstructionJobData;
}

describe("Instruction Pipeline", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mock factory for testing
  let mockActionFactory: any;
  let mockDependencies: InstructionWorkerDependencies;
  let mockContext: ActionContext;
  let mockData: InstructionJobData;

  beforeEach(() => {
    mockActionFactory = {
      create: vi.fn(),
    };

    mockDependencies = {
      logger: {
        log: vi.fn(),
      },
      statusBroadcaster: {
        addStatusEventAndBroadcast: vi.fn(),
      },
      services: {
        formatInstruction: vi.fn() as ReturnType<typeof vi.fn>,
        saveInstruction: vi.fn() as ReturnType<typeof vi.fn>,
      },
    };

    mockContext = {
      jobId: "test-job-id",
      retryCount: 0,
      queueName: "test-queue",
      operation: "test-operation",
      startTime: Date.now(),
      workerName: "test-worker",
      attemptNumber: 1,
    };

    mockData = {
      noteId: "test-note-id",
      instructionReference: "Mix ingredients",
      lineIndex: 0,
      parseStatus: "COMPLETED_SUCCESSFULLY" as const,
      isActive: true,
    };
  });

  describe("createInstructionPipeline", () => {
    it("should create a pipeline with format and save actions for regular instruction jobs", () => {
      const actions = createInstructionPipeline(
        mockActionFactory,
        mockDependencies,
        mockData,
        mockContext
      );

      expect(actions).toHaveLength(2);
      expect(mockActionFactory.create).toHaveBeenCalledTimes(2);
    });

    it("should create format instruction action first for regular instruction jobs", () => {
      createInstructionPipeline(
        mockActionFactory,
        mockDependencies,
        mockData,
        mockContext
      );

      expect(mockActionFactory.create).toHaveBeenNthCalledWith(
        1,
        ActionName.FORMAT_INSTRUCTION_LINE,
        mockDependencies
      );
    });

    it("should create save instruction action second for regular instruction jobs", () => {
      createInstructionPipeline(
        mockActionFactory,
        mockDependencies,
        mockData,
        mockContext
      );

      expect(mockActionFactory.create).toHaveBeenNthCalledWith(
        2,
        ActionName.SAVE_INSTRUCTION_LINE,
        mockDependencies
      );
    });

    it("should create only completion check action for completion check jobs", () => {
      const completionCheckData = createTestData({
        instructionReference: undefined as unknown as string,
      });

      const actions = createInstructionPipeline(
        mockActionFactory,
        mockDependencies,
        completionCheckData,
        mockContext
      );

      expect(actions).toHaveLength(1);
      expect(mockActionFactory.create).toHaveBeenCalledTimes(1);
      expect(mockActionFactory.create).toHaveBeenCalledWith(
        ActionName.CHECK_INSTRUCTION_COMPLETION,
        mockDependencies
      );
    });

    it("should create completion check pipeline when instructionReference is missing", () => {
      const completionCheckData = createTestData({
        instructionReference: undefined as unknown as string,
      });

      const actions = createInstructionPipeline(
        mockActionFactory,
        mockDependencies,
        completionCheckData,
        mockContext
      );

      expect(actions).toHaveLength(1);
      expect(mockActionFactory.create).toHaveBeenCalledTimes(1);
      expect(mockActionFactory.create).toHaveBeenCalledWith(
        ActionName.CHECK_INSTRUCTION_COMPLETION,
        mockDependencies
      );
    });

    it("should create completion check pipeline when instructionReference is empty string", () => {
      const completionCheckData = createTestData({
        instructionReference: "",
      });

      const actions = createInstructionPipeline(
        mockActionFactory,
        mockDependencies,
        completionCheckData,
        mockContext
      );

      expect(actions).toHaveLength(1);
      expect(mockActionFactory.create).toHaveBeenCalledTimes(1);
      expect(mockActionFactory.create).toHaveBeenCalledWith(
        ActionName.CHECK_INSTRUCTION_COMPLETION,
        mockDependencies
      );
    });

    it("should return actions in correct order for regular instruction jobs", () => {
      const mockFormatAction = {
        name: "format",
        execute: vi.fn(),
        executeWithTiming: vi.fn(),
      };
      const mockSaveAction = {
        name: "save",
        execute: vi.fn(),
        executeWithTiming: vi.fn(),
      };

      vi.mocked(mockActionFactory.create)
        .mockReturnValueOnce(mockFormatAction)
        .mockReturnValueOnce(mockSaveAction);

      const actions = createInstructionPipeline(
        mockActionFactory,
        mockDependencies,
        mockData,
        mockContext
      );

      expect(actions).toEqual([mockFormatAction, mockSaveAction]);
    });

    it("should return completion check action for completion check jobs", () => {
      const mockCompletionAction = {
        name: "completion_check",
        execute: vi.fn(),
        executeWithTiming: vi.fn(),
      };

      vi.mocked(mockActionFactory.create).mockReturnValueOnce(
        mockCompletionAction
      );

      const completionCheckData = createTestData({
        instructionReference: undefined as unknown as string,
      });

      const actions = createInstructionPipeline(
        mockActionFactory,
        mockDependencies,
        completionCheckData,
        mockContext
      );

      expect(actions).toEqual([mockCompletionAction]);
    });

    it("should work with different job data for regular instruction jobs", () => {
      const differentData: InstructionJobData = {
        noteId: "different-note-id",
        instructionReference: "Bake at 350F",
        lineIndex: 1,
        importId: "test-import",
        jobId: "test-job",
        metadata: { test: "data" },
        parseStatus: "COMPLETED_SUCCESSFULLY" as const,
        isActive: false,
      };

      createInstructionPipeline(
        mockActionFactory,
        mockDependencies,
        differentData,
        mockContext
      );

      expect(mockActionFactory.create).toHaveBeenCalledTimes(2);
    });

    it("should work with different context", () => {
      const differentContext: ActionContext = {
        jobId: "different-job-id",
        attemptNumber: 2,
        retryCount: 1,
        queueName: "different-queue",
        operation: "different-operation",
        startTime: Date.now(),
        workerName: "different-worker",
      };

      createInstructionPipeline(
        mockActionFactory,
        mockDependencies,
        mockData,
        differentContext
      );

      expect(mockActionFactory.create).toHaveBeenCalledTimes(2);
    });

    it("should work without statusBroadcaster", () => {
      const dependenciesWithoutBroadcaster: InstructionWorkerDependencies = {
        ...mockDependencies,
        statusBroadcaster: undefined,
      };

      createInstructionPipeline(
        mockActionFactory,
        dependenciesWithoutBroadcaster,
        mockData,
        mockContext
      );

      expect(mockActionFactory.create).toHaveBeenCalledTimes(2);
    });

    it("should handle action factory errors gracefully", () => {
      vi.mocked(mockActionFactory.create).mockImplementation(() => {
        throw new Error("Action factory error");
      });

      expect(() =>
        createInstructionPipeline(
          mockActionFactory,
          mockDependencies,
          mockData,
          mockContext
        )
      ).toThrow("Action factory error");
    });
  });
});
