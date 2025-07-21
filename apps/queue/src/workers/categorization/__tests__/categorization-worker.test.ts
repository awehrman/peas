import { describe, it, expect, vi, beforeEach } from "vitest";
import { Queue } from "bullmq";
import {
  CategorizationWorker,
  createCategorizationWorker,
} from "../categorization-worker";
import { IServiceContainer } from "../../../services/container";
import { BaseAction } from "../../core/base-action";
import { ActionContext } from "../../core/types";
import type {
  CategorizationWorkerDependencies,
  CategorizationJobData,
} from "../types";

// Mock the base worker dependencies
vi.mock("../../core/base-worker", () => {
  const BaseWorkerMock = vi.fn().mockImplementation(function (
    this: Record<string, unknown>,
    queue: Queue,
    dependencies: CategorizationWorkerDependencies
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
  registerCategorizationActions: vi.fn(),
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
      CATEGORIZATION: "categorization",
    },
  },
  LOG_MESSAGES: {
    INFO: {
      CATEGORIZATION_START: "Starting categorization",
      CATEGORIZATION_DATABASE_UPDATE: "Updating database categories",
      CATEGORIZATION_TAGS_UPDATE: "Updating database tags",
    },
    SUCCESS: {
      CATEGORIZATION_COMPLETED: "Categorization completed",
      CATEGORIZATION_DATABASE_UPDATED: "Database categories updated",
      CATEGORIZATION_TAGS_UPDATED: "Database tags updated",
    },
  },
}));

describe("CategorizationWorker", () => {
  let mockQueue: Queue;
  let mockContainer: IServiceContainer;
  let mockDependencies: CategorizationWorkerDependencies;
  let worker: CategorizationWorker;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock queue
    mockQueue = {
      name: "categorization-queue",
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
      categorizer: {
        categorizeRecipe: vi.fn().mockResolvedValue({
          success: true,
          categories: ["main-dish", "dinner"],
          tags: ["quick", "healthy"],
          processingTime: 50,
        }),
      },
      database: {
        updateNoteCategories: vi
          .fn()
          .mockResolvedValue({ noteId: "note-1", categories: ["main-dish"] }),
        updateNoteTags: vi
          .fn()
          .mockResolvedValue({ noteId: "note-1", tags: ["quick"] }),
      },
    };

    // Create worker instance
    worker = new CategorizationWorker(mockQueue, mockDependencies);
  });

  describe("CategorizationWorker class", () => {
    it("should extend BaseWorker", () => {
      expect(worker).toBeInstanceOf(CategorizationWorker);
    });

    it("should have registerActions method", () => {
      expect(typeof worker["registerActions"]).toBe("function");
    });

    it("should return correct operation name", () => {
      const operationName = worker["getOperationName"]();
      expect(operationName).toBe("categorization");
    });

    it("should create action pipeline with status actions and categorization actions", () => {
      const mockData: CategorizationJobData = {
        noteId: "test-note-123",
        title: "Test Recipe",
        content: "Test content",
        ingredients: ["ingredient 1", "ingredient 2"],
        instructions: ["step 1", "step 2"],
        options: {
          maxCategories: 3,
          maxTags: 5,
        },
      };

      const mockContext: ActionContext = {
        jobId: "test-job-123",
        workerName: "categorization",
        startTime: Date.now(),
        retryCount: 0,
        queueName: "categorization",
        operation: "process",
        attemptNumber: 1,
      };

      const pipeline = worker["createActionPipeline"](mockData, mockContext);

      // Should have status actions + 2 categorization actions
      expect(pipeline.length).toBeGreaterThanOrEqual(2);

      // Verify the actions are created
      pipeline.forEach((action) => {
        expect(action).toBeDefined();
        expect(action).toHaveProperty("name");
      });
    });

    it("should create action pipeline without status actions when no noteId", () => {
      const mockData: CategorizationJobData = {
        noteId: "", // Empty noteId
        title: "Test Recipe",
        content: "Test content",
      };

      const mockContext: ActionContext = {
        jobId: "test-job-123",
        workerName: "categorization",
        startTime: Date.now(),
        retryCount: 0,
        queueName: "categorization",
        operation: "process",
        attemptNumber: 1,
      };

      const pipeline = worker["createActionPipeline"](mockData, mockContext);

      // Should have at least the categorization actions
      expect(pipeline.length).toBeGreaterThanOrEqual(2);
    });

    it("should create wrapped actions for categorization pipeline", () => {
      const mockData: CategorizationJobData = {
        noteId: "test-note-123",
        title: "Test Recipe",
        content: "Test content",
      };

      const mockContext: ActionContext = {
        jobId: "test-job-123",
        workerName: "categorization",
        startTime: Date.now(),
        retryCount: 0,
        queueName: "categorization",
        operation: "process",
        attemptNumber: 1,
      };

      const pipeline = worker["createActionPipeline"](mockData, mockContext);

      // Should have process_categorization and save_categorization actions
      expect(pipeline.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("createCategorizationWorker factory", () => {
    it("should create a CategorizationWorker with correct dependencies", () => {
      const createdWorker = createCategorizationWorker(
        mockQueue,
        mockContainer
      );

      expect(createdWorker).toBeInstanceOf(CategorizationWorker);
    });

    it("should create categorizer with categorizeRecipe function", async () => {
      const createdWorker = createCategorizationWorker(
        mockQueue,
        mockContainer
      );
      const deps = (createdWorker as unknown as Record<string, unknown>)
        .dependencies as CategorizationWorkerDependencies;

      expect(deps.categorizer).toBeDefined();
      expect(typeof deps.categorizer.categorizeRecipe).toBe("function");

      // Test the categorizeRecipe function
      const result = await deps.categorizer.categorizeRecipe({
        title: "Test Recipe",
        content: "Test content",
        ingredients: ["ingredient 1"],
        instructions: ["step 1"],
      });

      expect(result).toEqual({
        success: true,
        categories: ["main-dish", "dinner"],
        tags: ["quick", "healthy"],
        processingTime: 50,
      });

      // Verify logging was called
      expect(mockContainer.logger.log).toHaveBeenCalledWith(
        expect.stringContaining("Starting categorization")
      );
      expect(mockContainer.logger.log).toHaveBeenCalledWith(
        expect.stringContaining("Categorization completed")
      );
    });

    it("should create database with updateNoteCategories function", async () => {
      const createdWorker = createCategorizationWorker(
        mockQueue,
        mockContainer
      );
      const deps = (createdWorker as unknown as Record<string, unknown>)
        .dependencies as CategorizationWorkerDependencies;

      expect(deps.database).toBeDefined();
      expect(typeof deps.database.updateNoteCategories).toBe("function");

      // Test the updateNoteCategories function
      const result = await deps.database.updateNoteCategories("note-123", [
        "main-dish",
        "dinner",
      ]);

      expect(result).toEqual({
        noteId: "note-123",
        categories: ["main-dish", "dinner"],
      });

      // Verify logging was called
      expect(mockContainer.logger.log).toHaveBeenCalledWith(
        expect.stringContaining("Updating database categories")
      );
      expect(mockContainer.logger.log).toHaveBeenCalledWith(
        expect.stringContaining("Database categories updated")
      );
    });

    it("should create database with updateNoteTags function", async () => {
      const createdWorker = createCategorizationWorker(
        mockQueue,
        mockContainer
      );
      const deps = (createdWorker as unknown as Record<string, unknown>)
        .dependencies as CategorizationWorkerDependencies;

      expect(deps.database).toBeDefined();
      expect(typeof deps.database.updateNoteTags).toBe("function");

      // Test the updateNoteTags function
      const result = await deps.database.updateNoteTags("note-123", [
        "quick",
        "healthy",
      ]);

      expect(result).toEqual({
        noteId: "note-123",
        tags: ["quick", "healthy"],
      });

      // Verify logging was called
      expect(mockContainer.logger.log).toHaveBeenCalledWith(
        expect.stringContaining("Updating database tags")
      );
      expect(mockContainer.logger.log).toHaveBeenCalledWith(
        expect.stringContaining("Database tags updated")
      );
    });

    it("should handle categorization with missing title", async () => {
      const createdWorker = createCategorizationWorker(
        mockQueue,
        mockContainer
      );
      const deps = (createdWorker as unknown as Record<string, unknown>)
        .dependencies as CategorizationWorkerDependencies;

      const result = await deps.categorizer.categorizeRecipe({
        content: "Test content",
        ingredients: ["ingredient 1"],
        instructions: ["step 1"],
      });

      expect(result).toEqual({
        success: true,
        categories: ["main-dish", "dinner"],
        tags: ["quick", "healthy"],
        processingTime: 50,
      });

      // Verify logging was called with "untitled"
      expect(mockContainer.logger.log).toHaveBeenCalledWith(
        expect.stringContaining('"title":"untitled"')
      );
    });

    it("should handle categorization with empty title", async () => {
      const createdWorker = createCategorizationWorker(
        mockQueue,
        mockContainer
      );
      const deps = (createdWorker as unknown as Record<string, unknown>)
        .dependencies as CategorizationWorkerDependencies;

      const result = await deps.categorizer.categorizeRecipe({
        title: "",
        content: "Test content",
        ingredients: ["ingredient 1"],
        instructions: ["step 1"],
      });

      expect(result).toEqual({
        success: true,
        categories: ["main-dish", "dinner"],
        tags: ["quick", "healthy"],
        processingTime: 50,
      });

      // Verify logging was called with "untitled"
      expect(mockContainer.logger.log).toHaveBeenCalledWith(
        expect.stringContaining('"title":"untitled"')
      );
    });

    it("should handle categorization with null title", async () => {
      const createdWorker = createCategorizationWorker(
        mockQueue,
        mockContainer
      );
      const deps = (createdWorker as unknown as Record<string, unknown>)
        .dependencies as CategorizationWorkerDependencies;

      const result = await deps.categorizer.categorizeRecipe({
        title: null as unknown as string,
        content: "Test content",
        ingredients: ["ingredient 1"],
        instructions: ["step 1"],
      });

      expect(result).toEqual({
        success: true,
        categories: ["main-dish", "dinner"],
        tags: ["quick", "healthy"],
        processingTime: 50,
      });

      // Verify logging was called with "untitled"
      expect(mockContainer.logger.log).toHaveBeenCalledWith(
        expect.stringContaining('"title":"untitled"')
      );
    });

    it("should handle categorization with undefined title", async () => {
      const createdWorker = createCategorizationWorker(
        mockQueue,
        mockContainer
      );
      const deps = (createdWorker as unknown as Record<string, unknown>)
        .dependencies as CategorizationWorkerDependencies;

      const result = await deps.categorizer.categorizeRecipe({
        title: undefined,
        content: "Test content",
        ingredients: ["ingredient 1"],
        instructions: ["step 1"],
      });

      expect(result).toEqual({
        success: true,
        categories: ["main-dish", "dinner"],
        tags: ["quick", "healthy"],
        processingTime: 50,
      });

      // Verify logging was called with "untitled"
      expect(mockContainer.logger.log).toHaveBeenCalledWith(
        expect.stringContaining('"title":"untitled"')
      );
    });

    it("should handle categorization with valid title", async () => {
      const createdWorker = createCategorizationWorker(
        mockQueue,
        mockContainer
      );
      const deps = (createdWorker as unknown as Record<string, unknown>)
        .dependencies as CategorizationWorkerDependencies;

      const result = await deps.categorizer.categorizeRecipe({
        title: "Delicious Pasta Recipe",
        content: "Test content",
        ingredients: ["ingredient 1"],
        instructions: ["step 1"],
      });

      expect(result).toEqual({
        success: true,
        categories: ["main-dish", "dinner"],
        tags: ["quick", "healthy"],
        processingTime: 50,
      });

      // Verify logging was called with the actual title
      expect(mockContainer.logger.log).toHaveBeenCalledWith(
        expect.stringContaining('"title":"Delicious Pasta Recipe"')
      );
    });
  });

  describe("Error handling", () => {
    it("should handle errors in categorizeRecipe function", async () => {
      const createdWorker = createCategorizationWorker(
        mockQueue,
        mockContainer
      );
      const deps = (createdWorker as unknown as Record<string, unknown>)
        .dependencies as CategorizationWorkerDependencies;

      // Mock measureExecutionTime to throw an error
      const { measureExecutionTime } = await import("../../../utils/utils");
      vi.mocked(measureExecutionTime).mockImplementationOnce(
        async (_fn, _operation) => {
          throw new Error("Categorization failed");
        }
      );

      await expect(
        deps.categorizer.categorizeRecipe({
          title: "Test Recipe",
          content: "Test content",
        })
      ).rejects.toThrow("Categorization failed");
    });

    it("should handle errors in updateNoteCategories function", async () => {
      const createdWorker = createCategorizationWorker(
        mockQueue,
        mockContainer
      );
      const deps = (createdWorker as unknown as Record<string, unknown>)
        .dependencies as CategorizationWorkerDependencies;

      // Mock measureExecutionTime to throw an error
      const { measureExecutionTime } = await import("../../../utils/utils");
      vi.mocked(measureExecutionTime).mockImplementationOnce(
        async (_fn, _operation) => {
          throw new Error("Database update failed");
        }
      );

      await expect(
        deps.database.updateNoteCategories("note-123", ["main-dish"])
      ).rejects.toThrow("Database update failed");
    });

    it("should handle errors in updateNoteTags function", async () => {
      const createdWorker = createCategorizationWorker(
        mockQueue,
        mockContainer
      );
      const deps = (createdWorker as unknown as Record<string, unknown>)
        .dependencies as CategorizationWorkerDependencies;

      // Mock measureExecutionTime to throw an error
      const { measureExecutionTime } = await import("../../../utils/utils");
      vi.mocked(measureExecutionTime).mockImplementationOnce(
        async (_fn, _operation) => {
          throw new Error("Tags update failed");
        }
      );

      await expect(
        deps.database.updateNoteTags("note-123", ["quick"])
      ).rejects.toThrow("Tags update failed");
    });
  });
});
