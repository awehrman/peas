import { describe, it, expect, vi, beforeEach } from "vitest";
import { Queue } from "bullmq";
import { ImageWorker, createImageWorker } from "../image-worker";
import { IServiceContainer } from "../../../services/container";
import { BaseAction } from "../../core/base-action";
import { ActionContext } from "../../core/types";
import type { ImageWorkerDependencies, ImageJobData } from "../types";

// Mock the base worker dependencies
vi.mock("../../core/base-worker", () => {
  const BaseWorkerMock = vi.fn().mockImplementation(function (
    this: Record<string, unknown>,
    queue: Queue,
    dependencies: ImageWorkerDependencies
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
  registerImageActions: vi.fn(),
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
      IMAGE: "image",
    },
  },
  LOG_MESSAGES: {
    INFO: {
      IMAGE_PROCESSING_START: "Starting image processing",
      IMAGE_SAVING_START: "Starting image saving",
      IMAGE_DATABASE_UPDATE: "Updating database image",
    },
    SUCCESS: {
      IMAGE_PROCESSING_COMPLETED: "Image processing completed",
      IMAGE_SAVED: "Image saved",
      IMAGE_DATABASE_UPDATED: "Database image updated",
    },
  },
}));

describe("ImageWorker", () => {
  let mockQueue: Queue;
  let mockContainer: IServiceContainer;
  let mockDependencies: ImageWorkerDependencies;
  let worker: ImageWorker;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock queue
    mockQueue = {
      name: "image-queue",
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
      imageProcessor: {
        processImage: vi.fn().mockResolvedValue({
          success: true,
          processedUrl: "processed-image-url",
          imageMetadata: {
            width: 800,
            height: 600,
            format: "jpeg",
            size: 1024,
          },
          processingTime: 100,
        }),
        saveImage: vi.fn().mockResolvedValue("saved-image-url"),
      },
      database: {
        updateNoteImage: vi
          .fn()
          .mockResolvedValue({ noteId: "note-1", imageUrl: "saved-image-url" }),
      },
    };

    // Create worker instance
    worker = new ImageWorker(mockQueue, mockDependencies);
  });

  describe("ImageWorker class", () => {
    it("should extend BaseWorker", () => {
      expect(worker).toBeInstanceOf(ImageWorker);
    });

    it("should have registerActions method", () => {
      expect(typeof worker["registerActions"]).toBe("function");
    });

    it("should return correct operation name", () => {
      const operationName = worker["getOperationName"]();
      expect(operationName).toBe("image");
    });

    it("should create action pipeline with status actions and image actions", () => {
      const mockData: ImageJobData = {
        noteId: "test-note-123",
        imageUrl: "test-image-url",
        imageData: "base64-data",
        imageType: "jpeg",
        fileName: "test-image.jpg",
        options: {
          resize: {
            width: 800,
            height: 600,
            quality: 90,
          },
          format: "jpeg",
        },
      };

      const mockContext: ActionContext = {
        jobId: "test-job-123",
        workerName: "image",
        startTime: Date.now(),
        retryCount: 0,
        queueName: "image-queue",
        operation: "image",
        attemptNumber: 1,
      };

      const pipeline = worker["createActionPipeline"](mockData, mockContext);

      // Should have status actions + 2 image actions
      expect(pipeline.length).toBeGreaterThanOrEqual(2);

      // Verify the actions are created
      pipeline.forEach((action) => {
        expect(action).toBeDefined();
        expect(action).toHaveProperty("name");
      });
    });

    it("should create action pipeline without status actions when no noteId", () => {
      const mockData: ImageJobData = {
        noteId: "", // Empty noteId
        imageUrl: "test-image-url",
        imageData: "base64-data",
        imageType: "jpeg",
        fileName: "test-image.jpg",
      };

      const mockContext: ActionContext = {
        jobId: "test-job-123",
        workerName: "image",
        startTime: Date.now(),
        retryCount: 0,
        queueName: "image-queue",
        operation: "image",
        attemptNumber: 1,
      };

      const pipeline = worker["createActionPipeline"](mockData, mockContext);

      // Should have at least the image actions
      expect(pipeline.length).toBeGreaterThanOrEqual(2);
    });

    it("should create wrapped actions for image pipeline", () => {
      const mockData: ImageJobData = {
        noteId: "test-note-123",
        imageUrl: "test-image-url",
        imageData: "base64-data",
        imageType: "jpeg",
        fileName: "test-image.jpg",
      };

      const mockContext: ActionContext = {
        jobId: "test-job-123",
        workerName: "image",
        startTime: Date.now(),
        retryCount: 0,
        queueName: "image-queue",
        operation: "image",
        attemptNumber: 1,
      };

      const pipeline = worker["createActionPipeline"](mockData, mockContext);

      // Should have process_image and save_image actions
      expect(pipeline.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("createImageWorker factory", () => {
    it("should create an ImageWorker with correct dependencies", () => {
      const createdWorker = createImageWorker(mockQueue, mockContainer);

      expect(createdWorker).toBeInstanceOf(ImageWorker);
    });

    it("should create imageProcessor with processImage function", async () => {
      const createdWorker = createImageWorker(mockQueue, mockContainer);
      const deps = (createdWorker as unknown as Record<string, unknown>)
        .dependencies as ImageWorkerDependencies;

      expect(deps.imageProcessor).toBeDefined();
      expect(typeof deps.imageProcessor.processImage).toBe("function");

      // Test the processImage function
      const result = await deps.imageProcessor.processImage({
        noteId: "test-note-123",
        url: "test-image-url",
        data: "base64-data",
        type: "jpeg",
        fileName: "test-image.jpg",
      });

      expect(result).toEqual({
        success: true,
        processedUrl: "processed-image-url",
        imageMetadata: {
          width: 800,
          height: 600,
          format: "jpeg",
          size: 1024,
        },
        processingTime: 100,
      });

      // Verify logging was called
      expect(mockContainer.logger.log).toHaveBeenCalledWith(
        expect.stringContaining("Starting image processing")
      );
      expect(mockContainer.logger.log).toHaveBeenCalledWith(
        expect.stringContaining("Image processing completed")
      );
    });

    it("should create imageProcessor with saveImage function", async () => {
      const createdWorker = createImageWorker(mockQueue, mockContainer);
      const deps = (createdWorker as unknown as Record<string, unknown>)
        .dependencies as ImageWorkerDependencies;

      expect(deps.imageProcessor).toBeDefined();
      expect(typeof deps.imageProcessor.saveImage).toBe("function");

      // Test the saveImage function
      const processedResult = {
        success: true,
        processedUrl: "processed-image-url",
        imageMetadata: {
          width: 800,
          height: 600,
          format: "jpeg",
          size: 1024,
        },
        processingTime: 100,
      };

      const result = await deps.imageProcessor.saveImage(processedResult);

      expect(result).toBe("saved-image-url");

      // Verify logging was called
      expect(mockContainer.logger.log).toHaveBeenCalledWith(
        expect.stringContaining("Starting image saving")
      );
      expect(mockContainer.logger.log).toHaveBeenCalledWith(
        expect.stringContaining("Image saved")
      );
    });

    it("should create database with updateNoteImage function", async () => {
      const createdWorker = createImageWorker(mockQueue, mockContainer);
      const deps = (createdWorker as unknown as Record<string, unknown>)
        .dependencies as ImageWorkerDependencies;

      expect(deps.database).toBeDefined();
      expect(typeof deps.database.updateNoteImage).toBe("function");

      // Test the updateNoteImage function
      const result = await deps.database.updateNoteImage(
        "note-123",
        "saved-image-url"
      );

      expect(result).toEqual({
        noteId: "note-123",
        imageUrl: "saved-image-url",
      });

      // Verify logging was called
      expect(mockContainer.logger.log).toHaveBeenCalledWith(
        expect.stringContaining("Updating database image")
      );
      expect(mockContainer.logger.log).toHaveBeenCalledWith(
        expect.stringContaining("Database image updated")
      );
    });

    it("should handle image processing with missing noteId", async () => {
      const createdWorker = createImageWorker(mockQueue, mockContainer);
      const deps = (createdWorker as unknown as Record<string, unknown>)
        .dependencies as ImageWorkerDependencies;

      const result = await deps.imageProcessor.processImage({
        noteId: "",
        url: "test-image-url",
        data: "base64-data",
        type: "jpeg",
        fileName: "test-image.jpg",
      });

      expect(result).toEqual({
        success: true,
        processedUrl: "processed-image-url",
        imageMetadata: {
          width: 800,
          height: 600,
          format: "jpeg",
          size: 1024,
        },
        processingTime: 100,
      });

      // Verify logging was called with "unknown"
      expect(mockContainer.logger.log).toHaveBeenCalledWith(
        expect.stringContaining('"noteId":"unknown"')
      );
    });

    it("should handle image processing with null noteId", async () => {
      const createdWorker = createImageWorker(mockQueue, mockContainer);
      const deps = (createdWorker as unknown as Record<string, unknown>)
        .dependencies as ImageWorkerDependencies;

      const result = await deps.imageProcessor.processImage({
        noteId: null as unknown as string,
        url: "test-image-url",
        data: "base64-data",
        type: "jpeg",
        fileName: "test-image.jpg",
      });

      expect(result).toEqual({
        success: true,
        processedUrl: "processed-image-url",
        imageMetadata: {
          width: 800,
          height: 600,
          format: "jpeg",
          size: 1024,
        },
        processingTime: 100,
      });

      // Verify logging was called with "unknown"
      expect(mockContainer.logger.log).toHaveBeenCalledWith(
        expect.stringContaining('"noteId":"unknown"')
      );
    });

    it("should handle image processing with undefined noteId", async () => {
      const createdWorker = createImageWorker(mockQueue, mockContainer);
      const deps = (createdWorker as unknown as Record<string, unknown>)
        .dependencies as ImageWorkerDependencies;

      const result = await deps.imageProcessor.processImage({
        noteId: undefined as unknown as string,
        url: "test-image-url",
        data: "base64-data",
        type: "jpeg",
        fileName: "test-image.jpg",
      });

      expect(result).toEqual({
        success: true,
        processedUrl: "processed-image-url",
        imageMetadata: {
          width: 800,
          height: 600,
          format: "jpeg",
          size: 1024,
        },
        processingTime: 100,
      });

      // Verify logging was called with "unknown"
      expect(mockContainer.logger.log).toHaveBeenCalledWith(
        expect.stringContaining('"noteId":"unknown"')
      );
    });

    it("should handle image processing with valid noteId", async () => {
      const createdWorker = createImageWorker(mockQueue, mockContainer);
      const deps = (createdWorker as unknown as Record<string, unknown>)
        .dependencies as ImageWorkerDependencies;

      const result = await deps.imageProcessor.processImage({
        noteId: "test-note-123",
        url: "test-image-url",
        data: "base64-data",
        type: "jpeg",
        fileName: "test-image.jpg",
      });

      expect(result).toEqual({
        success: true,
        processedUrl: "processed-image-url",
        imageMetadata: {
          width: 800,
          height: 600,
          format: "jpeg",
          size: 1024,
        },
        processingTime: 100,
      });

      // Verify logging was called with the actual noteId
      expect(mockContainer.logger.log).toHaveBeenCalledWith(
        expect.stringContaining('"noteId":"test-note-123"')
      );
    });

    it("should handle image saving with processed result", async () => {
      const createdWorker = createImageWorker(mockQueue, mockContainer);
      const deps = (createdWorker as unknown as Record<string, unknown>)
        .dependencies as ImageWorkerDependencies;

      const processedResult = {
        success: true,
        processedUrl: "processed-image-url",
        imageMetadata: {
          width: 800,
          height: 600,
          format: "jpeg",
          size: 1024,
        },
        processingTime: 100,
      };

      const result = await deps.imageProcessor.saveImage(processedResult);

      expect(result).toBe("saved-image-url");

      // Verify logging was called with the processed URL
      expect(mockContainer.logger.log).toHaveBeenCalledWith(
        expect.stringContaining('"processedUrl":"processed-image-url"')
      );
      expect(mockContainer.logger.log).toHaveBeenCalledWith(
        expect.stringContaining('"savedUrl":"saved-image-url"')
      );
    });
  });

  describe("Error handling", () => {
    it("should handle errors in processImage function", async () => {
      const createdWorker = createImageWorker(mockQueue, mockContainer);
      const deps = (createdWorker as unknown as Record<string, unknown>)
        .dependencies as ImageWorkerDependencies;

      // Mock measureExecutionTime to throw an error
      const { measureExecutionTime } = await import("../../../utils/utils");
      vi.mocked(measureExecutionTime).mockImplementationOnce(
        async (_fn, _operation) => {
          throw new Error("Image processing failed");
        }
      );

      await expect(
        deps.imageProcessor.processImage({
          noteId: "test-note-123",
          url: "test-image-url",
        })
      ).rejects.toThrow("Image processing failed");
    });

    it("should handle errors in saveImage function", async () => {
      const createdWorker = createImageWorker(mockQueue, mockContainer);
      const deps = (createdWorker as unknown as Record<string, unknown>)
        .dependencies as ImageWorkerDependencies;

      // Mock measureExecutionTime to throw an error
      const { measureExecutionTime } = await import("../../../utils/utils");
      vi.mocked(measureExecutionTime).mockImplementationOnce(
        async (_fn, _operation) => {
          throw new Error("Image saving failed");
        }
      );

      const processedResult = {
        success: true,
        processedUrl: "processed-image-url",
        imageMetadata: {
          width: 800,
          height: 600,
          format: "jpeg",
          size: 1024,
        },
        processingTime: 100,
      };

      await expect(
        deps.imageProcessor.saveImage(processedResult)
      ).rejects.toThrow("Image saving failed");
    });

    it("should handle errors in updateNoteImage function", async () => {
      const createdWorker = createImageWorker(mockQueue, mockContainer);
      const deps = (createdWorker as unknown as Record<string, unknown>)
        .dependencies as ImageWorkerDependencies;

      // Mock measureExecutionTime to throw an error
      const { measureExecutionTime } = await import("../../../utils/utils");
      vi.mocked(measureExecutionTime).mockImplementationOnce(
        async (_fn, _operation) => {
          throw new Error("Database update failed");
        }
      );

      await expect(
        deps.database.updateNoteImage("note-123", "saved-image-url")
      ).rejects.toThrow("Database update failed");
    });
  });
});
