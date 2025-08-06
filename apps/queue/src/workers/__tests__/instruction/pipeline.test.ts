import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActionName } from "../../../types";
import type { ActionFactory } from "../../core/action-factory";
import type { ActionContext } from "../../core/types";
import type {
  InstructionJobData,
  InstructionWorkerDependencies,
} from "../../instruction/dependencies";
import { createInstructionPipeline } from "../../instruction/pipeline";
import type { WorkerAction } from "../../types";

describe("Instruction Pipeline", () => {
  let mockActionFactory: ActionFactory<
    InstructionJobData,
    InstructionWorkerDependencies,
    InstructionJobData
  >;
  let mockDependencies: InstructionWorkerDependencies;
  let mockData: InstructionJobData;
  let mockContext: ActionContext;
  let mockFormatAction: WorkerAction<
    InstructionJobData,
    InstructionWorkerDependencies,
    InstructionJobData
  >;
  let mockSaveAction: WorkerAction<
    InstructionJobData,
    InstructionWorkerDependencies,
    InstructionJobData
  >;

  beforeEach(() => {
    mockFormatAction = {
      name: ActionName.FORMAT_INSTRUCTION_LINE,
      execute: vi.fn().mockResolvedValue({} as InstructionJobData),
      executeWithTiming: vi.fn().mockResolvedValue({
        success: true,
        data: {} as InstructionJobData,
      }),
    };

    mockSaveAction = {
      name: ActionName.SAVE_INSTRUCTION_LINE,
      execute: vi.fn().mockResolvedValue({} as InstructionJobData),
      executeWithTiming: vi.fn().mockResolvedValue({
        success: true,
        data: {} as InstructionJobData,
      }),
    };

    mockActionFactory = {
      create: vi.fn(),
    } as unknown as ActionFactory<
      InstructionJobData,
      InstructionWorkerDependencies,
      InstructionJobData
    >;

    mockDependencies = {
      logger: {
        log: vi.fn(),
      },
      services: {
        formatInstruction: vi.fn().mockResolvedValue({} as InstructionJobData),
        saveInstruction: vi.fn().mockResolvedValue({} as InstructionJobData),
      },
    } as InstructionWorkerDependencies;

    mockData = {
      noteId: "test-note-id",
      instructionReference: "Test instruction",
      lineIndex: 0,
      parseStatus: "AWAITING_PARSING",
      isActive: true,
    };

    mockContext = {
      jobId: "test-job-id",
      operation: "test-operation",
      startTime: Date.now(),
      retryCount: 0,
      queueName: "test-queue",
      workerName: "test-worker",
      attemptNumber: 1,
    };

    vi.clearAllMocks();
  });

  describe("createInstructionPipeline", () => {
    it("should create a pipeline with format and save actions", () => {
      vi.mocked(mockActionFactory.create)
        .mockReturnValueOnce(mockFormatAction)
        .mockReturnValueOnce(mockSaveAction);

      const pipeline = createInstructionPipeline(
        mockActionFactory,
        mockDependencies,
        mockData,
        mockContext
      );

      expect(pipeline).toHaveLength(2);
      expect(pipeline[0]).toBe(mockFormatAction);
      expect(pipeline[1]).toBe(mockSaveAction);
    });

    it("should call actionFactory.create for format instruction action", () => {
      vi.mocked(mockActionFactory.create)
        .mockReturnValueOnce(mockFormatAction)
        .mockReturnValueOnce(mockSaveAction);

      createInstructionPipeline(
        mockActionFactory,
        mockDependencies,
        mockData,
        mockContext
      );

      expect(mockActionFactory.create).toHaveBeenCalledWith(
        ActionName.FORMAT_INSTRUCTION_LINE,
        mockDependencies
      );
    });

    it("should call actionFactory.create for save instruction action", () => {
      vi.mocked(mockActionFactory.create)
        .mockReturnValueOnce(mockFormatAction)
        .mockReturnValueOnce(mockSaveAction);

      createInstructionPipeline(
        mockActionFactory,
        mockDependencies,
        mockData,
        mockContext
      );

      expect(mockActionFactory.create).toHaveBeenCalledWith(
        ActionName.SAVE_INSTRUCTION_LINE,
        mockDependencies
      );
    });

    it("should call actionFactory.create in correct order", () => {
      vi.mocked(mockActionFactory.create)
        .mockReturnValueOnce(mockFormatAction)
        .mockReturnValueOnce(mockSaveAction);

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
      expect(mockActionFactory.create).toHaveBeenNthCalledWith(
        2,
        ActionName.SAVE_INSTRUCTION_LINE,
        mockDependencies
      );
    });

    it("should return actions in correct order", () => {
      vi.mocked(mockActionFactory.create)
        .mockReturnValueOnce(mockFormatAction)
        .mockReturnValueOnce(mockSaveAction);

      const pipeline = createInstructionPipeline(
        mockActionFactory,
        mockDependencies,
        mockData,
        mockContext
      );

      expect(pipeline[0]?.name).toBe(ActionName.FORMAT_INSTRUCTION_LINE);
      expect(pipeline[1]?.name).toBe(ActionName.SAVE_INSTRUCTION_LINE);
    });

    it("should work with different job data", () => {
      const differentData: InstructionJobData = {
        noteId: "different-note-id",
        instructionReference: "Different instruction",
        lineIndex: 5,
        parseStatus: "COMPLETED_SUCCESSFULLY",
        isActive: false,
      };

      vi.mocked(mockActionFactory.create)
        .mockReturnValueOnce(mockFormatAction)
        .mockReturnValueOnce(mockSaveAction);

      const pipeline = createInstructionPipeline(
        mockActionFactory,
        mockDependencies,
        differentData,
        mockContext
      );

      expect(pipeline).toHaveLength(2);
      expect(pipeline[0]).toBe(mockFormatAction);
      expect(pipeline[1]).toBe(mockSaveAction);
    });

    it("should work with different context", () => {
      const differentContext: ActionContext = {
        jobId: "different-job-id",
        operation: "different-operation",
        startTime: Date.now() - 1000,
        retryCount: 2,
        queueName: "different-queue",
        workerName: "different-worker",
        attemptNumber: 3,
      };

      vi.mocked(mockActionFactory.create)
        .mockReturnValueOnce(mockFormatAction)
        .mockReturnValueOnce(mockSaveAction);

      const pipeline = createInstructionPipeline(
        mockActionFactory,
        mockDependencies,
        mockData,
        differentContext
      );

      expect(pipeline).toHaveLength(2);
      expect(pipeline[0]).toBe(mockFormatAction);
      expect(pipeline[1]).toBe(mockSaveAction);
    });

    it("should work with different dependencies", () => {
      const differentDeps: InstructionWorkerDependencies = {
        logger: {
          log: vi.fn(),
        },
        services: {
          formatInstruction: vi
            .fn()
            .mockResolvedValue({} as InstructionJobData),
          saveInstruction: vi.fn().mockResolvedValue({} as InstructionJobData),
        },
        statusBroadcaster: {
          addStatusEventAndBroadcast: vi.fn().mockResolvedValue({}),
        },
      };

      vi.mocked(mockActionFactory.create)
        .mockReturnValueOnce(mockFormatAction)
        .mockReturnValueOnce(mockSaveAction);

      const pipeline = createInstructionPipeline(
        mockActionFactory,
        differentDeps,
        mockData,
        mockContext
      );

      expect(pipeline).toHaveLength(2);
      expect(mockActionFactory.create).toHaveBeenCalledWith(
        ActionName.FORMAT_INSTRUCTION_LINE,
        differentDeps
      );
      expect(mockActionFactory.create).toHaveBeenCalledWith(
        ActionName.SAVE_INSTRUCTION_LINE,
        differentDeps
      );
    });

    it("should always return the same pipeline structure regardless of input", () => {
      vi.mocked(mockActionFactory.create)
        .mockReturnValueOnce(mockFormatAction)
        .mockReturnValueOnce(mockSaveAction)
        .mockReturnValueOnce(mockFormatAction)
        .mockReturnValueOnce(mockSaveAction);

      const pipeline1 = createInstructionPipeline(
        mockActionFactory,
        mockDependencies,
        mockData,
        mockContext
      );

      const pipeline2 = createInstructionPipeline(
        mockActionFactory,
        mockDependencies,
        { ...mockData, noteId: "different" },
        { ...mockContext, jobId: "different" }
      );

      expect(pipeline1).toHaveLength(2);
      expect(pipeline2).toHaveLength(2);
      expect(pipeline1[0]?.name).toBe(pipeline2[0]?.name);
      expect(pipeline1[1]?.name).toBe(pipeline2[1]?.name);
    });
  });
});
