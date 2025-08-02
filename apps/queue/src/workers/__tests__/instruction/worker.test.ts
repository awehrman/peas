import { Queue } from "bullmq";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { IServiceContainer } from "../../../services/container";
import { registerInstructionActions } from "../../../services/instruction/register";
import { ActionName } from "../../../types";
import { ActionFactory } from "../../core/action-factory";
import { BaseWorker } from "../../core/base-worker";
import type { ActionContext } from "../../core/types";
import type {
  InstructionJobData,
  InstructionWorkerDependencies,
} from "../../instruction/dependencies";
// Import mocked modules
import { buildInstructionDependencies } from "../../instruction/dependencies";
import { createInstructionPipeline } from "../../instruction/pipeline";
import {
  InstructionWorker,
  createInstructionWorker,
} from "../../instruction/worker";

// Mock the dependencies
vi.mock("../../instruction/dependencies", () => ({
  buildInstructionDependencies: vi.fn(),
}));

// Mock the pipeline
vi.mock("../../instruction/pipeline", () => ({
  createInstructionPipeline: vi.fn(),
}));

// Mock the action registration
vi.mock("../../../services/instruction/register", () => ({
  registerInstructionActions: vi.fn(),
}));

describe("Instruction Worker", () => {
  let mockQueue: Queue;
  let mockContainer: IServiceContainer;
  let mockDependencies: InstructionWorkerDependencies;
  let mockActionFactory: ActionFactory<
    InstructionJobData,
    InstructionWorkerDependencies,
    InstructionJobData
  >;
  let mockData: InstructionJobData;
  let mockContext: ActionContext;

  beforeEach(() => {
    mockQueue = {
      name: "test-instruction-queue",
      add: vi.fn(),
      process: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    } as unknown as Queue;

    mockDependencies = {
      logger: {
        log: vi.fn(),
      },
      services: {
        formatInstruction: vi.fn().mockResolvedValue({} as InstructionJobData),
        saveInstruction: vi.fn().mockResolvedValue({} as InstructionJobData),
      },
    } as InstructionWorkerDependencies;

    mockActionFactory = {
      create: vi.fn(),
      register: vi.fn(),
    } as unknown as ActionFactory<
      InstructionJobData,
      InstructionWorkerDependencies,
      InstructionJobData
    >;

    mockContainer = {
      logger: mockDependencies.logger,
      statusBroadcaster: {
        addStatusEventAndBroadcast: vi.fn().mockResolvedValue({}),
      },
    } as unknown as IServiceContainer;

    mockData = {
      noteId: "test-note-id",
      instructionReference: "Test instruction",
      lineIndex: 0,
      parseStatus: "PENDING",
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

  describe("InstructionWorker class", () => {
    let worker: InstructionWorker;

    beforeEach(() => {
      worker = new InstructionWorker(
        mockQueue,
        mockDependencies,
        mockActionFactory,
        mockContainer
      );
    });

    it("should extend BaseWorker", () => {
      expect(worker).toBeInstanceOf(BaseWorker);
    });

    it("should have actionFactory property", () => {
      expect(worker).toHaveProperty("actionFactory");
      expect((worker as any).actionFactory).toBe(mockActionFactory);
    });

    it("should call registerActions during construction", () => {
      expect(registerInstructionActions).toHaveBeenCalledWith(
        mockActionFactory
      );
    });

    it("should have correct operation name", () => {
      // Access the protected method through the class
      const operationName = (worker as any).getOperationName();
      expect(operationName).toBe("instruction-worker");
    });

    it("should create action pipeline correctly", () => {
      const mockPipeline = [
        {
          name: ActionName.FORMAT_INSTRUCTION_LINE,
          execute: vi.fn(),
          executeWithTiming: vi.fn().mockResolvedValue({
            success: true,
            data: {} as InstructionJobData,
          }),
        },
        {
          name: ActionName.SAVE_INSTRUCTION_LINE,
          execute: vi.fn(),
          executeWithTiming: vi.fn().mockResolvedValue({
            success: true,
            data: {} as InstructionJobData,
          }),
        },
      ];

      vi.mocked(createInstructionPipeline).mockReturnValue(mockPipeline);

      const pipeline = (worker as any).createActionPipeline(
        mockData,
        mockContext
      );

      expect(createInstructionPipeline).toHaveBeenCalledWith(
        mockActionFactory,
        mockDependencies,
        mockData,
        mockContext
      );
      expect(pipeline).toBe(mockPipeline);
    });

    it("should pass correct parameters to createActionPipeline", () => {
      vi.mocked(createInstructionPipeline).mockReturnValue([]);

      (worker as any).createActionPipeline(mockData, mockContext);

      expect(createInstructionPipeline).toHaveBeenCalledWith(
        mockActionFactory,
        mockDependencies,
        mockData,
        mockContext
      );
    });
  });

  describe("createInstructionWorker function", () => {
    it("should create an InstructionWorker instance", () => {
      vi.mocked(buildInstructionDependencies).mockReturnValue(mockDependencies);

      const worker = createInstructionWorker(mockQueue, mockContainer);

      expect(worker).toBeInstanceOf(InstructionWorker);
    });

    it("should call buildInstructionDependencies with container", () => {
      vi.mocked(buildInstructionDependencies).mockReturnValue(mockDependencies);

      createInstructionWorker(mockQueue, mockContainer);

      expect(buildInstructionDependencies).toHaveBeenCalledWith(mockContainer);
    });

    it("should create ActionFactory with correct types", () => {
      vi.mocked(buildInstructionDependencies).mockReturnValue(mockDependencies);

      const worker = createInstructionWorker(mockQueue, mockContainer);

      expect(worker).toBeInstanceOf(InstructionWorker);
      expect((worker as any).actionFactory).toBeInstanceOf(ActionFactory);
    });

    it("should pass correct parameters to InstructionWorker constructor", () => {
      vi.mocked(buildInstructionDependencies).mockReturnValue(mockDependencies);

      const worker = createInstructionWorker(mockQueue, mockContainer);

      expect(worker).toBeInstanceOf(InstructionWorker);
      expect((worker as any).actionFactory).toBeInstanceOf(ActionFactory);
    });

    it("should return worker with correct dependencies", () => {
      vi.mocked(buildInstructionDependencies).mockReturnValue(mockDependencies);

      const worker = createInstructionWorker(mockQueue, mockContainer);

      expect(worker).toBeInstanceOf(InstructionWorker);
      expect((worker as any).actionFactory).toBeInstanceOf(ActionFactory);
    });
  });

  describe("worker integration", () => {
    it("should register instruction actions during construction", () => {
      vi.mocked(buildInstructionDependencies).mockReturnValue(mockDependencies);

      createInstructionWorker(mockQueue, mockContainer);

      expect(registerInstructionActions).toHaveBeenCalledWith(
        expect.any(ActionFactory)
      );
    });

    it("should have correct operation name for logging", () => {
      vi.mocked(buildInstructionDependencies).mockReturnValue(mockDependencies);

      const worker = createInstructionWorker(mockQueue, mockContainer);
      const operationName = (worker as any).getOperationName();

      expect(operationName).toBe("instruction-worker");
    });
  });
});
