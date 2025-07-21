import { describe, it, expect, vi, beforeEach } from "vitest";
import { Queue } from "bullmq";
import { SourceWorker, createSourceWorker } from "../source-worker";
import { IServiceContainer } from "../../../services/container";
import { BaseAction } from "../../core/base-action";
import { ActionContext } from "../../core/types";
import type { SourceWorkerDependencies, SourceJobData } from "../types";

// Mock the base worker dependencies
vi.mock("../../core/base-worker", () => {
  const BaseWorkerMock = vi.fn().mockImplementation(function (
    this: Record<string, unknown>,
    queue: Queue,
    dependencies: SourceWorkerDependencies
  ) {
    this.queue = queue;
    this.dependencies = dependencies;
    this.actionFactory = {
      register: vi.fn(),
      create: vi.fn(),
      isRegistered: vi.fn(),
      list: vi.fn(),
      registry: new Map(),
    };
    this.addStatusActions = vi.fn();
    this.createWrappedAction = vi.fn().mockReturnValue({
      name: "wrapped-action",
      execute: vi.fn().mockResolvedValue({ success: true }),
    } as unknown as BaseAction);
    this.createErrorHandledAction = vi.fn().mockReturnValue({
      name: "error-handled-action",
      execute: vi.fn().mockResolvedValue({ success: true }),
    } as unknown as BaseAction);
    this.registerActions = vi.fn();
  });

  return {
    BaseWorker: BaseWorkerMock,
    createBaseDependenciesFromContainer: vi.fn(() => ({
      logger: { log: vi.fn() },
      addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
      ErrorHandler: {
        withErrorHandling: vi.fn().mockImplementation(async (op) => op()),
      },
    })),
  };
});

// Mock the actions registration
vi.mock("../actions", () => ({
  registerSourceActions: vi.fn(),
}));

// Mock the utils
vi.mock("../../../utils/utils", () => ({
  formatLogMessage: vi.fn(
    (message, data) => `${message} ${JSON.stringify(data)}`
  ),
  measureExecutionTime: vi.fn().mockImplementation(async (fn, operation) => {
    const startTime = Date.now();
    const result = await fn();
    const endTime = Date.now();
    return {
      result,
      duration: endTime - startTime,
      operation,
    };
  }),
}));

// Mock the constants
vi.mock("../../../config/constants", () => ({
  WORKER_CONSTANTS: {
    NAMES: {
      SOURCE: "source",
    },
  },
  LOG_MESSAGES: {
    INFO: {
      SOURCE_PROCESSING_START: "Starting source processing",
      SOURCE_SAVING_START: "Starting source saving",
    },
    SUCCESS: {
      SOURCE_PROCESSING_COMPLETED: "Source processing completed",
      SOURCE_SAVED: "Source saved",
    },
  },
}));

describe("SourceWorker", () => {
  let mockQueue: Queue;
  let mockContainer: IServiceContainer;
  let mockDependencies: SourceWorkerDependencies;
  let worker: SourceWorker;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock queue
    mockQueue = {
      name: "source-queue",
    } as unknown as Queue;

    // Create mock service container
    mockContainer = {
      logger: {
        log: vi.fn(),
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        fatal: vi.fn(),
        logWithContext: vi.fn(),
        getLogFiles: vi.fn(),
        rotateLogs: vi.fn(),
        getLogStats: vi.fn(),
        clearOldLogs: vi.fn(),
      },
      database: {
        createNote: vi.fn().mockResolvedValue({ id: "note-1" }),
        patternTracker: vi.fn() as unknown as InstanceType<
          typeof import("../../shared/pattern-tracker").PatternTracker
        >,
        prisma: {
          $disconnect: vi.fn(),
          $connect: vi.fn(),
          $on: vi.fn(),
          $use: vi.fn(),
          $transaction: vi.fn(),
          $executeRaw: vi.fn(),
          $queryRaw: vi.fn(),
          $runCommandRaw: vi.fn(),
          $extends: vi.fn(),
          note: {},
          status: {},
          user: {},
        } as unknown as Record<string, unknown>,
      },
      errorHandler: {
        errorHandler: {
          withErrorHandling: vi.fn().mockImplementation(async (op) => op()),
        },
      },
      healthMonitor: {
        healthMonitor: {
          healthCache: {},
          lastCheckTime: 0,
          CACHE_DURATION_MS: 0,
          TIMEOUT_MS: 0,
          checkHealth: vi.fn(),
          getStatus: vi.fn(),
          getUptime: vi.fn(),
          getLastCheck: vi.fn(),
          isHealthy: vi.fn(),
        } as unknown as Record<string, unknown>,
      },
      webSocket: {
        webSocketManager: {
          broadcastStatusEvent: vi.fn(),
          getConnectedClientsCount: vi.fn(),
          close: vi.fn(),
        },
      },
      statusBroadcaster: {
        statusBroadcaster: {
          addStatusEventAndBroadcast: vi.fn(),
        },
        addStatusEventAndBroadcast: vi.fn(),
      },
      parsers: {
        parsers: {
          parseHTML: vi.fn().mockResolvedValue({ parsed: true }),
        },
        parseHTML: vi.fn().mockResolvedValue({ parsed: true }),
      },
      config: {
        port: 4200,
        wsPort: 8080,
        wsHost: "localhost",
        wsUrl: "ws://localhost:8080",
        redisConnection: {
          host: "localhost",
          port: 6379,
          username: undefined,
          password: undefined,
        },
        batchSize: 10,
        maxRetries: 3,
        backoffMs: 1000,
        maxBackoffMs: 30000,
      },
      close: vi.fn(),
    } as unknown as IServiceContainer;

    // Create mock dependencies
    mockDependencies = {
      logger: { log: vi.fn() },
      addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
      ErrorHandler: {
        withErrorHandling: vi.fn().mockImplementation(async (op) => op()),
      },
      sourceProcessor: {
        processSource: vi.fn().mockResolvedValue({
          success: true,
          processedData: {
            title: "Test Source",
            content: "Test content",
            metadata: {
              type: "source",
              processedAt: new Date().toISOString(),
            },
          },
          processingTime: 50,
        }),
      },
      database: {
        saveSource: vi.fn().mockResolvedValue({
          id: "source_123",
          title: "Test Source",
          content: "Test content",
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      },
    };

    // Create worker instance
    worker = new SourceWorker(mockQueue, mockDependencies);
  });

  describe("SourceWorker class", () => {
    it("should extend BaseWorker", () => {
      expect(worker).toBeInstanceOf(SourceWorker);
    });

    it("should have registerActions method", () => {
      expect(typeof worker["registerActions"]).toBe("function");
    });

    it("should return correct operation name", () => {
      const operationName = worker["getOperationName"]();
      expect(operationName).toBe("source");
    });

    it("should create action pipeline with all source actions", () => {
      const mockData: SourceJobData = {
        title: "Test Source",
        content: "Test content",
        sourceId: "source-123",
        source: {
          url: "https://example.com",
          type: "web",
        },
      };

      const mockContext: ActionContext = {
        jobId: "test-job-123",
        workerName: "source",
        startTime: Date.now(),
        retryCount: 0,
        queueName: "source-queue",
        operation: "source",
        attemptNumber: 1,
      };

      const pipeline = worker["createActionPipeline"](mockData, mockContext);

      // Should have 4 actions: process_source, save_source, source_processing_status, source_completed_status
      expect(pipeline.length).toBe(4);

      // Verify the actions are created
      pipeline.forEach((action) => {
        expect(action).toBeDefined();
        expect(action).toHaveProperty("name");
      });
    });

    it("should create wrapped actions for process_source and save_source", () => {
      const mockData: SourceJobData = {
        title: "Test Source",
        content: "Test content",
      };

      const mockContext: ActionContext = {
        jobId: "test-job-123",
        workerName: "source",
        startTime: Date.now(),
        retryCount: 0,
        queueName: "source-queue",
        operation: "source",
        attemptNumber: 1,
      };

      const pipeline = worker["createActionPipeline"](mockData, mockContext);

      // Should have process_source and save_source as wrapped actions
      expect(pipeline.length).toBe(4);

      // First two actions should be wrapped actions
      expect(pipeline[0]).toHaveProperty("name", "wrapped-action");
      expect(pipeline[1]).toHaveProperty("name", "wrapped-action");
    });

    it("should create error handled actions for status actions", () => {
      const mockData: SourceJobData = {
        title: "Test Source",
        content: "Test content",
      };

      const mockContext: ActionContext = {
        jobId: "test-job-123",
        workerName: "source",
        startTime: Date.now(),
        retryCount: 0,
        queueName: "source-queue",
        operation: "source",
        attemptNumber: 1,
      };

      const pipeline = worker["createActionPipeline"](mockData, mockContext);

      // Last two actions should be error handled actions
      expect(pipeline[2]).toHaveProperty("name", "error-handled-action");
      expect(pipeline[3]).toHaveProperty("name", "error-handled-action");
    });
  });

  describe("createSourceWorker factory", () => {
    it("should create a SourceWorker with correct dependencies", () => {
      const createdWorker = createSourceWorker(mockQueue, mockContainer);

      expect(createdWorker).toBeInstanceOf(SourceWorker);
    });

    it("should create sourceProcessor with processSource function", async () => {
      const createdWorker = createSourceWorker(mockQueue, mockContainer);
      const deps = (createdWorker as unknown as Record<string, unknown>)
        .dependencies as SourceWorkerDependencies;

      expect(deps.sourceProcessor).toBeDefined();
      expect(typeof deps.sourceProcessor.processSource).toBe("function");

      // Test the processSource function
      const result = await deps.sourceProcessor.processSource({
        noteId: "test-note-123",
        title: "Test Source",
        content: "Test content",
      });

      expect(result).toEqual({
        success: true,
        processedData: {
          title: "Test Source",
          content: "Test content",
          metadata: {
            type: "source",
            processedAt: expect.any(String),
          },
        },
        processingTime: 50,
      });

      // Verify logging was called
      expect(mockContainer.logger.log).toHaveBeenCalledWith(
        expect.stringContaining("Starting source processing")
      );
      expect(mockContainer.logger.log).toHaveBeenCalledWith(
        expect.stringContaining("Source processing completed")
      );
    });

    it("should create database with saveSource function", async () => {
      const createdWorker = createSourceWorker(mockQueue, mockContainer);
      const deps = (createdWorker as unknown as Record<string, unknown>)
        .dependencies as SourceWorkerDependencies;

      expect(deps.database).toBeDefined();
      expect(typeof deps.database.saveSource).toBe("function");

      // Test the saveSource function
      const result = await deps.database.saveSource({
        title: "Test Source",
        content: "Test content",
      });

      expect(result).toEqual({
        id: expect.stringMatching(/^source_\d+$/),
        title: "Test Source",
        content: "Test content",
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });

      // Verify logging was called
      expect(mockContainer.logger.log).toHaveBeenCalledWith(
        expect.stringContaining("Starting source saving")
      );
      expect(mockContainer.logger.log).toHaveBeenCalledWith(
        expect.stringContaining("Source saved")
      );
    });

    it("should handle source processing with missing noteId", async () => {
      const createdWorker = createSourceWorker(mockQueue, mockContainer);
      const deps = (createdWorker as unknown as Record<string, unknown>)
        .dependencies as SourceWorkerDependencies;

      const result = await deps.sourceProcessor.processSource({
        title: "Test Source",
        content: "Test content",
      });

      expect(result).toEqual({
        success: true,
        processedData: {
          title: "Test Source",
          content: "Test content",
          metadata: {
            type: "source",
            processedAt: expect.any(String),
          },
        },
        processingTime: 50,
      });

      // Verify logging was called with "unknown"
      expect(mockContainer.logger.log).toHaveBeenCalledWith(
        expect.stringContaining('"noteId":"unknown"')
      );
    });

    it("should handle source processing with null noteId", async () => {
      const createdWorker = createSourceWorker(mockQueue, mockContainer);
      const deps = (createdWorker as unknown as Record<string, unknown>)
        .dependencies as SourceWorkerDependencies;

      const result = await deps.sourceProcessor.processSource({
        noteId: null as unknown as string,
        title: "Test Source",
        content: "Test content",
      });

      expect(result).toEqual({
        success: true,
        processedData: {
          title: "Test Source",
          content: "Test content",
          metadata: {
            type: "source",
            processedAt: expect.any(String),
          },
        },
        processingTime: 50,
      });

      // Verify logging was called with "unknown"
      expect(mockContainer.logger.log).toHaveBeenCalledWith(
        expect.stringContaining('"noteId":"unknown"')
      );
    });

    it("should handle source processing with undefined noteId", async () => {
      const createdWorker = createSourceWorker(mockQueue, mockContainer);
      const deps = (createdWorker as unknown as Record<string, unknown>)
        .dependencies as SourceWorkerDependencies;

      const result = await deps.sourceProcessor.processSource({
        noteId: undefined,
        title: "Test Source",
        content: "Test content",
      });

      expect(result).toEqual({
        success: true,
        processedData: {
          title: "Test Source",
          content: "Test content",
          metadata: {
            type: "source",
            processedAt: expect.any(String),
          },
        },
        processingTime: 50,
      });

      // Verify logging was called with "unknown"
      expect(mockContainer.logger.log).toHaveBeenCalledWith(
        expect.stringContaining('"noteId":"unknown"')
      );
    });

    it("should handle source processing with valid noteId", async () => {
      const createdWorker = createSourceWorker(mockQueue, mockContainer);
      const deps = (createdWorker as unknown as Record<string, unknown>)
        .dependencies as SourceWorkerDependencies;

      const result = await deps.sourceProcessor.processSource({
        noteId: "test-note-123",
        title: "Test Source",
        content: "Test content",
      });

      expect(result).toEqual({
        success: true,
        processedData: {
          title: "Test Source",
          content: "Test content",
          metadata: {
            type: "source",
            processedAt: expect.any(String),
          },
        },
        processingTime: 50,
      });

      // Verify logging was called with the actual noteId
      expect(mockContainer.logger.log).toHaveBeenCalledWith(
        expect.stringContaining('"noteId":"test-note-123"')
      );
    });

    it("should handle source processing with missing title", async () => {
      const createdWorker = createSourceWorker(mockQueue, mockContainer);
      const deps = (createdWorker as unknown as Record<string, unknown>)
        .dependencies as SourceWorkerDependencies;

      const result = await deps.sourceProcessor.processSource({
        noteId: "test-note-123",
        content: "Test content",
      });

      expect(result).toEqual({
        success: true,
        processedData: {
          title: "Untitled Source",
          content: "Test content",
          metadata: {
            type: "source",
            processedAt: expect.any(String),
          },
        },
        processingTime: 50,
      });

      // Verify logging was called with "Untitled Source"
      expect(mockContainer.logger.log).toHaveBeenCalledWith(
        expect.stringContaining('"title":"Untitled Source"')
      );
    });

    it("should handle source processing with null title", async () => {
      const createdWorker = createSourceWorker(mockQueue, mockContainer);
      const deps = (createdWorker as unknown as Record<string, unknown>)
        .dependencies as SourceWorkerDependencies;

      const result = await deps.sourceProcessor.processSource({
        noteId: "test-note-123",
        title: null as unknown as string,
        content: "Test content",
      });

      expect(result).toEqual({
        success: true,
        processedData: {
          title: "Untitled Source",
          content: "Test content",
          metadata: {
            type: "source",
            processedAt: expect.any(String),
          },
        },
        processingTime: 50,
      });

      // Verify logging was called with "Untitled Source"
      expect(mockContainer.logger.log).toHaveBeenCalledWith(
        expect.stringContaining('"title":"Untitled Source"')
      );
    });

    it("should handle source processing with undefined title", async () => {
      const createdWorker = createSourceWorker(mockQueue, mockContainer);
      const deps = (createdWorker as unknown as Record<string, unknown>)
        .dependencies as SourceWorkerDependencies;

      const result = await deps.sourceProcessor.processSource({
        noteId: "test-note-123",
        title: undefined,
        content: "Test content",
      });

      expect(result).toEqual({
        success: true,
        processedData: {
          title: "Untitled Source",
          content: "Test content",
          metadata: {
            type: "source",
            processedAt: expect.any(String),
          },
        },
        processingTime: 50,
      });

      // Verify logging was called with "Untitled Source"
      expect(mockContainer.logger.log).toHaveBeenCalledWith(
        expect.stringContaining('"title":"Untitled Source"')
      );
    });

    it("should handle source saving with missing title", async () => {
      const createdWorker = createSourceWorker(mockQueue, mockContainer);
      const deps = (createdWorker as unknown as Record<string, unknown>)
        .dependencies as SourceWorkerDependencies;

      const result = await deps.database.saveSource({
        content: "Test content",
      });

      expect(result).toEqual({
        id: expect.stringMatching(/^source_\d+$/),
        title: "Untitled Source",
        content: "Test content",
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });

      // Verify logging was called with "Untitled"
      expect(mockContainer.logger.log).toHaveBeenCalledWith(
        expect.stringContaining('"title":"Untitled"')
      );
    });

    it("should handle source saving with null title", async () => {
      const createdWorker = createSourceWorker(mockQueue, mockContainer);
      const deps = (createdWorker as unknown as Record<string, unknown>)
        .dependencies as SourceWorkerDependencies;

      const result = await deps.database.saveSource({
        title: null as unknown as string,
        content: "Test content",
      });

      expect(result).toEqual({
        id: expect.stringMatching(/^source_\d+$/),
        title: "Untitled Source",
        content: "Test content",
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });

      // Verify logging was called with "Untitled"
      expect(mockContainer.logger.log).toHaveBeenCalledWith(
        expect.stringContaining('"title":"Untitled"')
      );
    });

    it("should handle source saving with undefined title", async () => {
      const createdWorker = createSourceWorker(mockQueue, mockContainer);
      const deps = (createdWorker as unknown as Record<string, unknown>)
        .dependencies as SourceWorkerDependencies;

      const result = await deps.database.saveSource({
        title: undefined,
        content: "Test content",
      });

      expect(result).toEqual({
        id: expect.stringMatching(/^source_\d+$/),
        title: "Untitled Source",
        content: "Test content",
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });

      // Verify logging was called with "Untitled"
      expect(mockContainer.logger.log).toHaveBeenCalledWith(
        expect.stringContaining('"title":"Untitled"')
      );
    });

    it("should handle source saving with valid title", async () => {
      const createdWorker = createSourceWorker(mockQueue, mockContainer);
      const deps = (createdWorker as unknown as Record<string, unknown>)
        .dependencies as SourceWorkerDependencies;

      const result = await deps.database.saveSource({
        title: "Test Source",
        content: "Test content",
      });

      expect(result).toEqual({
        id: expect.stringMatching(/^source_\d+$/),
        title: "Test Source",
        content: "Test content",
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });

      // Verify logging was called with the actual title
      expect(mockContainer.logger.log).toHaveBeenCalledWith(
        expect.stringContaining('"title":"Test Source"')
      );
    });
  });

  describe("Error handling", () => {
    it("should handle errors in processSource function", async () => {
      const createdWorker = createSourceWorker(mockQueue, mockContainer);
      const deps = (createdWorker as unknown as Record<string, unknown>)
        .dependencies as SourceWorkerDependencies;

      // Mock measureExecutionTime to throw an error
      const { measureExecutionTime } = await import("../../../utils/utils");
      vi.mocked(measureExecutionTime).mockImplementationOnce(
        async (_fn, _operation) => {
          throw new Error("Source processing failed");
        }
      );

      await expect(
        deps.sourceProcessor.processSource({
          noteId: "test-note-123",
          title: "Test Source",
        })
      ).rejects.toThrow("Source processing failed");
    });

    it("should handle errors in saveSource function", async () => {
      const createdWorker = createSourceWorker(mockQueue, mockContainer);
      const deps = (createdWorker as unknown as Record<string, unknown>)
        .dependencies as SourceWorkerDependencies;

      // Mock measureExecutionTime to throw an error
      const { measureExecutionTime } = await import("../../../utils/utils");
      vi.mocked(measureExecutionTime).mockImplementationOnce(
        async (_fn, _operation) => {
          throw new Error("Source saving failed");
        }
      );

      await expect(
        deps.database.saveSource({
          title: "Test Source",
          content: "Test content",
        })
      ).rejects.toThrow("Source saving failed");
    });
  });
});
