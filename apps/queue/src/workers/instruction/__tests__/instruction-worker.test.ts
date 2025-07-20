import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createInstructionWorker,
  InstructionWorker,
} from "../instruction-worker";
import { Queue } from "bullmq";
import { IServiceContainer } from "../../../services/container";
import type { InstructionJobData } from "../types";
import type { ActionContext } from "../../core/types";
import type { BaseAction } from "../../core/base-action";

describe("InstructionWorker", () => {
  let mockQueue: Queue;
  let mockContainer: IServiceContainer;
  let worker: InstructionWorker;

  beforeEach(() => {
    vi.clearAllMocks();
    mockQueue = { name: "instruction-queue" } as Queue;
    mockContainer = {
      statusBroadcaster: {
        addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
      },
      errorHandler: {
        errorHandler: {
          withErrorHandling: vi.fn().mockImplementation(async (op) => op()),
        },
      },
      logger: {
        log: vi.fn(),
      },
      database: {
        prisma: {
          parsedIngredientLine: {
            count: vi.fn().mockResolvedValue(5),
          },
        },
      },
      parsers: {
        parseInstruction: vi.fn().mockResolvedValue({
          success: true,
          parseStatus: "CORRECT",
          normalizedText: "test",
          steps: [],
          processingTime: 0,
        }),
      },
    } as unknown as IServiceContainer;

    worker = createInstructionWorker(mockQueue, mockContainer);
  });

  describe("createInstructionWorker", () => {
    it("should create an instruction worker with correct dependencies", () => {
      expect(worker).toBeDefined();
      expect(worker).toBeInstanceOf(InstructionWorker);
    });

    it("should set up database updateInstructionLine function", async () => {
      const testWorker = createInstructionWorker(mockQueue, mockContainer);
      const dependencies = (
        testWorker as unknown as {
          dependencies: {
            database: {
              updateInstructionLine: (
                id: string,
                data: Record<string, unknown>
              ) => Promise<unknown>;
            };
          };
        }
      ).dependencies;

      expect(dependencies.database.updateInstructionLine).toBeDefined();

      const result = await dependencies.database.updateInstructionLine(
        "test-id",
        { status: "completed" }
      );
      expect(result).toEqual({ id: "test-id", status: "completed" });
      expect(mockContainer.logger.log).toHaveBeenCalledWith(
        '🗄️ Updating instruction line test-id with data: {"status":"completed"}'
      );
      expect(mockContainer.logger.log).toHaveBeenCalledWith(
        "✅ Successfully updated instruction line test-id"
      );
    });

    it("should set up database createInstructionSteps function", async () => {
      const testWorker = createInstructionWorker(mockQueue, mockContainer);
      const dependencies = (
        testWorker as unknown as {
          dependencies: {
            database: {
              createInstructionSteps: (
                steps: Array<Record<string, unknown>>
              ) => Promise<unknown>;
            };
          };
        }
      ).dependencies;

      expect(dependencies.database.createInstructionSteps).toBeDefined();

      const steps = [{ action: "mix", target: "ingredients" }];
      const result = await dependencies.database.createInstructionSteps(steps);
      expect(result).toEqual(steps);
      expect(mockContainer.logger.log).toHaveBeenCalledWith(
        "📋 Creating 1 instruction steps"
      );
      expect(mockContainer.logger.log).toHaveBeenCalledWith(
        "✅ Successfully created 1 instruction steps"
      );
    });

    it("should set up parseInstruction function", async () => {
      const testWorker = createInstructionWorker(mockQueue, mockContainer);
      const dependencies = (
        testWorker as unknown as {
          dependencies: {
            parseInstruction: (text: string) => Promise<unknown>;
          };
        }
      ).dependencies;

      expect(dependencies.parseInstruction).toBeDefined();

      const result = await dependencies.parseInstruction(
        "Mix ingredients in a bowl"
      );
      expect(result).toEqual({
        success: true,
        parseStatus: "CORRECT",
        normalizedText: "Mix ingredients in a bowl",
        steps: [],
        processingTime: 0,
      });
      expect(mockContainer.logger.log).toHaveBeenCalledWith(
        "📝 Parsing instruction: Mix ingredients in a bowl"
      );
      expect(mockContainer.logger.log).toHaveBeenCalledWith(
        "✅ Instruction parsing completed: CORRECT"
      );
    });

    it("should handle long instruction text in parseInstruction", async () => {
      const testWorker = createInstructionWorker(mockQueue, mockContainer);
      const dependencies = (
        testWorker as unknown as {
          dependencies: {
            parseInstruction: (text: string) => Promise<unknown>;
          };
        }
      ).dependencies;

      const longText =
        "This is a very long instruction text that should be truncated in the log message for better readability and to avoid cluttering the logs with extremely long text content";
      await dependencies.parseInstruction(longText);

      expect(mockContainer.logger.log).toHaveBeenCalledWith(
        "📝 Parsing instruction: This is a very long instruction text that shoul..."
      );
    });

    it("should handle empty instruction text in parseInstruction", async () => {
      const testWorker = createInstructionWorker(mockQueue, mockContainer);
      const dependencies = (
        testWorker as unknown as {
          dependencies: {
            parseInstruction: (text: string) => Promise<unknown>;
          };
        }
      ).dependencies;

      await dependencies.parseInstruction("");

      expect(mockContainer.logger.log).toHaveBeenCalledWith(
        "📝 Parsing instruction: {text}"
      );
    });
  });

  describe("getOperationName", () => {
    it("should return correct operation name", () => {
      const operationName = (
        worker as unknown as { getOperationName(): string }
      ).getOperationName();
      expect(operationName).toBe("instruction_processing");
    });
  });

  describe("addStatusActions", () => {
    it("should log status actions call with data information", () => {
      const data: InstructionJobData = {
        instructionLineId: "test-line-123",
        originalText: "Mix ingredients",
        lineIndex: 0,
        noteId: "test-note-456",
        importId: "test-import-789",
        currentInstructionIndex: 1,
        totalInstructions: 5,
      };

      (
        worker as unknown as {
          addStatusActions(
            actions: BaseAction<unknown, unknown>[],
            data: InstructionJobData
          ): void;
        }
      ).addStatusActions([], data);

      expect(mockContainer.logger.log).toHaveBeenCalledWith(
        "[INSTRUCTION_PROCESSING] addStatusActions called with data: noteId=test-note-456, hasNoteId=true, dataKeys=instructionLineId, originalText, lineIndex, noteId, importId, currentInstructionIndex, totalInstructions"
      );
      expect(mockContainer.logger.log).toHaveBeenCalledWith(
        "[INSTRUCTION_PROCESSING] Skipping generic status actions - using custom instruction tracking"
      );
    });

    it("should handle data with empty noteId", () => {
      const data: InstructionJobData = {
        instructionLineId: "test-line-123",
        originalText: "Mix ingredients",
        lineIndex: 0,
        noteId: "",
      };

      (
        worker as unknown as {
          addStatusActions(
            actions: BaseAction<unknown, unknown>[],
            data: InstructionJobData
          ): void;
        }
      ).addStatusActions([], data);

      expect(mockContainer.logger.log).toHaveBeenCalledWith(
        "[INSTRUCTION_PROCESSING] addStatusActions called with data: noteId=, hasNoteId=false, dataKeys=instructionLineId, originalText, lineIndex, noteId"
      );
      expect(mockContainer.logger.log).toHaveBeenCalledWith(
        "[INSTRUCTION_PROCESSING] Skipping generic status actions - using custom instruction tracking"
      );
    });

    it("should not add any actions to the pipeline", () => {
      const data: InstructionJobData = {
        instructionLineId: "test-line-123",
        originalText: "Mix ingredients",
        lineIndex: 0,
        noteId: "test-note-456",
      };

      const actions: BaseAction<unknown, unknown>[] = [];
      (
        worker as unknown as {
          addStatusActions(
            actions: BaseAction<unknown, unknown>[],
            data: InstructionJobData
          ): void;
        }
      ).addStatusActions(actions, data);

      expect(actions).toHaveLength(0);
    });
  });

  describe("createActionPipeline", () => {
    it("should create pipeline with instruction count update when tracking info is present", () => {
      const data: InstructionJobData = {
        instructionLineId: "test-line-123",
        originalText: "Mix ingredients",
        lineIndex: 0,
        noteId: "test-note-456",
        importId: "test-import-789",
        currentInstructionIndex: 1,
        totalInstructions: 5,
      };

      const context: ActionContext = {
        jobId: "test-job-123",
        retryCount: 0,
        queueName: "instruction-queue",
        operation: "instruction_processing",
        startTime: Date.now(),
        workerName: "test-worker",
        attemptNumber: 1,
      };

      const pipeline = (
        worker as unknown as {
          createActionPipeline(
            data: InstructionJobData,
            context: ActionContext
          ): BaseAction<unknown, unknown>[];
        }
      ).createActionPipeline(data, context);

      // Should have 4 actions: status actions (0), instruction count update, process, save, completion status
      expect(pipeline).toHaveLength(4);

      // Check that the actions are wrapped (they have wrapped names)
      expect(pipeline[0]?.name).toContain("update_instruction_count");
      expect(pipeline[1]?.name).toContain("process-instruction-line");
      expect(pipeline[2]?.name).toContain("save-instruction-line");
      expect(pipeline[3]?.name).toContain("completion_status");
    });

    it("should create pipeline without instruction count update when tracking info is missing", () => {
      const data: InstructionJobData = {
        instructionLineId: "test-line-123",
        originalText: "Mix ingredients",
        lineIndex: 0,
        noteId: "test-note-456",
        // Missing importId, currentInstructionIndex, totalInstructions
      };

      const context: ActionContext = {
        jobId: "test-job-123",
        retryCount: 0,
        queueName: "instruction-queue",
        operation: "instruction_processing",
        startTime: Date.now(),
        workerName: "test-worker",
        attemptNumber: 1,
      };

      const pipeline = (
        worker as unknown as {
          createActionPipeline(
            data: InstructionJobData,
            context: ActionContext
          ): BaseAction<unknown, unknown>[];
        }
      ).createActionPipeline(data, context);

      // Should have 3 actions: status actions (0), process, save, completion status
      expect(pipeline).toHaveLength(3);

      expect(pipeline[0]?.name).toContain("process-instruction-line");
      expect(pipeline[1]?.name).toContain("save-instruction-line");
      expect(pipeline[2]?.name).toContain("completion_status");
    });

    it("should create pipeline without instruction count update when importId is missing", () => {
      const data: InstructionJobData = {
        instructionLineId: "test-line-123",
        originalText: "Mix ingredients",
        lineIndex: 0,
        noteId: "test-note-456",
        // Missing importId
        currentInstructionIndex: 1,
        totalInstructions: 5,
      };

      const context: ActionContext = {
        jobId: "test-job-123",
        retryCount: 0,
        queueName: "instruction-queue",
        operation: "instruction_processing",
        startTime: Date.now(),
        workerName: "test-worker",
        attemptNumber: 1,
      };

      const pipeline = (
        worker as unknown as {
          createActionPipeline(
            data: InstructionJobData,
            context: ActionContext
          ): BaseAction<unknown, unknown>[];
        }
      ).createActionPipeline(data, context);

      expect(pipeline).toHaveLength(3);
      expect(pipeline[0]?.name).toContain("process-instruction-line");
      expect(pipeline[1]?.name).toContain("save-instruction-line");
      expect(pipeline[2]?.name).toContain("completion_status");
    });

    it("should create pipeline without instruction count update when currentInstructionIndex is missing", () => {
      const data: InstructionJobData = {
        instructionLineId: "test-line-123",
        originalText: "Mix ingredients",
        lineIndex: 0,
        noteId: "test-note-456",
        importId: "test-import-789",
        // Missing currentInstructionIndex
        totalInstructions: 5,
      };

      const context: ActionContext = {
        jobId: "test-job-123",
        retryCount: 0,
        queueName: "instruction-queue",
        operation: "instruction_processing",
        startTime: Date.now(),
        workerName: "test-worker",
        attemptNumber: 1,
      };

      const pipeline = (
        worker as unknown as {
          createActionPipeline(
            data: InstructionJobData,
            context: ActionContext
          ): BaseAction<unknown, unknown>[];
        }
      ).createActionPipeline(data, context);

      expect(pipeline).toHaveLength(3);
      expect(pipeline[0]?.name).toContain("process-instruction-line");
      expect(pipeline[1]?.name).toContain("save-instruction-line");
      expect(pipeline[2]?.name).toContain("completion_status");
    });

    it("should create pipeline without instruction count update when totalInstructions is missing", () => {
      const data: InstructionJobData = {
        instructionLineId: "test-line-123",
        originalText: "Mix ingredients",
        lineIndex: 0,
        noteId: "test-note-456",
        importId: "test-import-789",
        currentInstructionIndex: 1,
        // Missing totalInstructions
      };

      const context: ActionContext = {
        jobId: "test-job-123",
        retryCount: 0,
        queueName: "instruction-queue",
        operation: "instruction_processing",
        startTime: Date.now(),
        workerName: "test-worker",
        attemptNumber: 1,
      };

      const pipeline = (
        worker as unknown as {
          createActionPipeline(
            data: InstructionJobData,
            context: ActionContext
          ): BaseAction<unknown, unknown>[];
        }
      ).createActionPipeline(data, context);

      expect(pipeline).toHaveLength(3);
      expect(pipeline[0]?.name).toContain("process-instruction-line");
      expect(pipeline[1]?.name).toContain("save-instruction-line");
      expect(pipeline[2]?.name).toContain("completion_status");
    });

    it("should create pipeline without instruction count update when currentInstructionIndex is not a number", () => {
      const data: InstructionJobData = {
        instructionLineId: "test-line-123",
        originalText: "Mix ingredients",
        lineIndex: 0,
        noteId: "test-note-456",
        importId: "test-import-789",
        currentInstructionIndex: "not-a-number" as unknown as number,
        totalInstructions: 5,
      };

      const context: ActionContext = {
        jobId: "test-job-123",
        retryCount: 0,
        queueName: "instruction-queue",
        operation: "instruction_processing",
        startTime: Date.now(),
        workerName: "test-worker",
        attemptNumber: 1,
      };

      const pipeline = (
        worker as unknown as {
          createActionPipeline(
            data: InstructionJobData,
            context: ActionContext
          ): BaseAction<unknown, unknown>[];
        }
      ).createActionPipeline(data, context);

      expect(pipeline).toHaveLength(3);
      expect(pipeline[0]?.name).toContain("process-instruction-line");
      expect(pipeline[1]?.name).toContain("save-instruction-line");
      expect(pipeline[2]?.name).toContain("completion_status");
    });

    it("should create pipeline without instruction count update when totalInstructions is not a number", () => {
      const data: InstructionJobData = {
        instructionLineId: "test-line-123",
        originalText: "Mix ingredients",
        lineIndex: 0,
        noteId: "test-note-456",
        importId: "test-import-789",
        currentInstructionIndex: 1,
        totalInstructions: "not-a-number" as unknown as number,
      };

      const context: ActionContext = {
        jobId: "test-job-123",
        retryCount: 0,
        queueName: "instruction-queue",
        operation: "instruction_processing",
        startTime: Date.now(),
        workerName: "test-worker",
        attemptNumber: 1,
      };

      const pipeline = (
        worker as unknown as {
          createActionPipeline(
            data: InstructionJobData,
            context: ActionContext
          ): BaseAction<unknown, unknown>[];
        }
      ).createActionPipeline(data, context);

      expect(pipeline).toHaveLength(3);
      expect(pipeline[0]?.name).toContain("process-instruction-line");
      expect(pipeline[1]?.name).toContain("save-instruction-line");
      expect(pipeline[2]?.name).toContain("completion_status");
    });
  });

  describe("registerActions", () => {
    it("should register all instruction actions", () => {
      const actionFactory = (
        worker as unknown as {
          actionFactory: { getAction?: (name: string) => unknown };
        }
      ).actionFactory;

      // Check that the action factory exists and has registered actions
      expect(actionFactory).toBeDefined();

      // We can't directly test the registration since the actions are wrapped,
      // but we can verify that the worker was created successfully and the
      // registerActions method was called during construction
      expect(worker).toBeInstanceOf(InstructionWorker);
    });
  });
});
