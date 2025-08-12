/* eslint-disable @typescript-eslint/no-explicit-any -- Test file with intentional any types for mocking */
import type { PrismaClient } from "@peas/database";
import type { Queue } from "bullmq";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { IServiceContainer } from "../../../services/container";
import { registerImageActions } from "../../../services/image";
import { createMockActionContext } from "../../../test-utils/helpers";
import type { StructuredLogger } from "../../../types";
import type { ImageJobData, ImageWorkerDependencies } from "../../image/types";
import { ImageWorker } from "../../image/worker";

// Mock the registerImageActions function
vi.mock("../../../services/image", () => ({
  registerImageActions: vi.fn(),
}));

// Mock the BaseWorker's createWorker method to prevent real BullMQ Worker creation
vi.mock("../../core/base-worker", async () => {
  const actual = await vi.importActual("../../core/base-worker");
  return {
    ...actual,
    BaseWorker: class extends (actual as any).BaseWorker {
      protected async createWorker(
        _queue: any,
        _workerImpl?: any
      ): Promise<any> {
        // Mock the worker creation to prevent BullMQ errors
        return {
          isRunning: () => true,
          close: vi.fn(),
        };
      }
    },
  };
});

// Mock console.log to capture output
const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

describe("ImageWorker", () => {
  let mockQueue: Queue;
  let mockDependencies: ImageWorkerDependencies;
  let mockContainer: IServiceContainer;
  let mockLogger: StructuredLogger;

  beforeEach(() => {
    vi.clearAllMocks();

    mockContainer = {
      queues: {
        noteQueue: {} as Queue,
        imageQueue: {} as Queue,
        ingredientQueue: {} as Queue,
        instructionQueue: {} as Queue,
        categorizationQueue: {} as Queue,
        sourceQueue: {} as Queue,
        patternTrackingQueue: {} as Queue,
      },
      database: {
        prisma: {} as Partial<PrismaClient> as PrismaClient,
      },
      errorHandler: {
        withErrorHandling: vi.fn(),
        createJobError: vi.fn(),
        classifyError: vi.fn(),
        logError: vi.fn(),
      },
      healthMonitor: {
        healthMonitor: {},
      },
      webSocket: {
        webSocketManager: {},
      },
      statusBroadcaster: {
        addStatusEventAndBroadcast: vi.fn(),
      },
      logger: {
        log: vi.fn(),
      },
      config: {},
      r2: {
        uploadFile: vi.fn(),
        uploadBuffer: vi.fn(),
        generatePresignedUploadUrl: vi.fn(),
        generatePresignedDownloadUrl: vi.fn(),
      },
      close: vi.fn(),
    } as IServiceContainer;

    mockLogger = {
      log: vi.fn(),
    } as StructuredLogger;

    mockDependencies = {
      serviceContainer: mockContainer,
      logger: mockLogger,
    };

    mockQueue = {
      name: "test-image-queue",
      add: vi.fn(),
      process: vi.fn(),
      close: vi.fn(),
      isRunning: vi.fn(() => true),
    } as unknown as Queue;
  });

  afterEach(() => {
    consoleSpy.mockClear();
  });

  describe("constructor", () => {
    it("should create ImageWorker instance with valid parameters", () => {
      const imageWorker = new ImageWorker(mockQueue, mockDependencies);

      expect(imageWorker).toBeInstanceOf(ImageWorker);
      expect(registerImageActions).toHaveBeenCalled();
    });

    it("should handle queue with different name", () => {
      const customQueue = {
        ...mockQueue,
        name: "custom-queue",
      } as unknown as Queue;

      const worker = new ImageWorker(customQueue, mockDependencies);

      expect(worker).toBeInstanceOf(ImageWorker);
      expect(registerImageActions).toHaveBeenCalled();
    });

    it("should handle dependencies with different structure", () => {
      const customDependencies = {
        ...mockDependencies,
        customProp: "test",
      };

      const worker = new ImageWorker(mockQueue, customDependencies);

      expect(worker).toBeInstanceOf(ImageWorker);
      expect(registerImageActions).toHaveBeenCalled();
    });

    it("should handle empty dependencies", () => {
      const emptyDependencies = {
        serviceContainer: mockContainer,
        logger: mockLogger,
      };

      const worker = new ImageWorker(mockQueue, emptyDependencies);

      expect(worker).toBeInstanceOf(ImageWorker);
      expect(registerImageActions).toHaveBeenCalled();
    });

    it("should handle null queue properties", () => {
      const nullQueue = {
        name: null,
        add: null,
        process: null,
        close: null,
        isRunning: vi.fn(() => false),
      } as unknown as Queue;

      const worker = new ImageWorker(nullQueue, mockDependencies);

      expect(worker).toBeInstanceOf(ImageWorker);
      expect(registerImageActions).toHaveBeenCalled();
    });
  });

  describe("getOperationName", () => {
    it("should return correct operation name", () => {
      const imageWorker = new ImageWorker(mockQueue, mockDependencies);
      const operationName = (
        imageWorker as unknown as { getOperationName: () => string }
      ).getOperationName();
      expect(operationName).toBe("image-worker");
    });

    it("should return consistent operation name for multiple instances", () => {
      const worker1 = new ImageWorker(mockQueue, mockDependencies);
      const worker2 = new ImageWorker(mockQueue, mockDependencies);

      const name1 = (
        worker1 as unknown as { getOperationName: () => string }
      ).getOperationName();
      const name2 = (
        worker2 as unknown as { getOperationName: () => string }
      ).getOperationName();

      expect(name1).toBe("image-worker");
      expect(name2).toBe("image-worker");
      expect(name1).toBe(name2);
    });
  });

  describe("registerActions", () => {
    it("should call registerImageActions with actionFactory", () => {
      const imageWorker = new ImageWorker(mockQueue, mockDependencies);

      expect(registerImageActions).toHaveBeenCalledWith(
        (imageWorker as any).actionFactory
      );
    });

    it("should call registerImageActions only once during construction", () => {
      new ImageWorker(mockQueue, mockDependencies);

      expect(registerImageActions).toHaveBeenCalledTimes(1);
    });
  });

  describe("createActionPipeline", () => {
    it("should create pipeline with correct actions in order", () => {
      const imageWorker = new ImageWorker(mockQueue, mockDependencies);
      const mockData: ImageJobData = {
        noteId: "test-note-id",
        importId: "test-import-id",
        imagePath: "/path/to/image.jpg",
        outputDir: "/path/to/output",
        filename: "test.jpg",
        originalPath: "/path/to/original.jpg",
        thumbnailPath: "/path/to/thumbnail.jpg",
        crop3x2Path: "/path/to/crop3x2.jpg",
        crop4x3Path: "/path/to/crop4x3.jpg",
        crop16x9Path: "/path/to/crop16x9.jpg",
        originalSize: 1024000,
        thumbnailSize: 51200,
        crop3x2Size: 256000,
        crop4x3Size: 128000,
        crop16x9Size: 64000,
        metadata: {
          width: 1920,
          height: 1080,
          format: "jpeg",
        },
      };
      const mockContext = createMockActionContext();

      // Mock the actionFactory.create method
      const mockAction = { execute: vi.fn() };
      (imageWorker as any).actionFactory.create = vi
        .fn()
        .mockReturnValue(mockAction);

      const pipeline = (
        imageWorker as unknown as {
          createActionPipeline: (data: ImageJobData, context: any) => any[];
        }
      ).createActionPipeline(mockData, mockContext);

      expect(pipeline).toHaveLength(7);
      expect((imageWorker as any).actionFactory.create).toHaveBeenCalledTimes(
        7
      );
    });

    it("should log pipeline creation", () => {
      const imageWorker = new ImageWorker(mockQueue, mockDependencies);
      const mockData: ImageJobData = {
        noteId: "test-note-id",
        importId: "test-import-id",
        imagePath: "/path/to/image.jpg",
        outputDir: "/path/to/output",
        filename: "test.jpg",
        originalPath: "/path/to/original.jpg",
        thumbnailPath: "/path/to/thumbnail.jpg",
        crop3x2Path: "/path/to/crop3x2.jpg",
        crop4x3Path: "/path/to/crop4x3.jpg",
        crop16x9Path: "/path/to/crop16x9.jpg",
        originalSize: 1024000,
        thumbnailSize: 51200,
        crop3x2Size: 256000,
        crop4x3Size: 128000,
        crop16x9Size: 64000,
        metadata: {
          width: 1920,
          height: 1080,
          format: "jpeg",
        },
      };
      const mockContext = createMockActionContext();

      // Mock the actionFactory.create method
      const mockAction = { execute: vi.fn() };
      (imageWorker as any).actionFactory.create = vi
        .fn()
        .mockReturnValue(mockAction);

      (
        imageWorker as unknown as {
          createActionPipeline: (data: ImageJobData, context: any) => any[];
        }
      ).createActionPipeline(mockData, mockContext);

      expect(consoleSpy).toHaveBeenCalledWith(
        "[IMAGE_WORKER] Creating action pipeline"
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        "[IMAGE_WORKER] Created pipeline with 7 actions"
      );
    });

    it("should create actions with correct dependencies", () => {
      const imageWorker = new ImageWorker(mockQueue, mockDependencies);
      const mockData: ImageJobData = {
        noteId: "test-note-id",
        importId: "test-import-id",
        imagePath: "/path/to/image.jpg",
        outputDir: "/path/to/output",
        filename: "test.jpg",
        originalPath: "/path/to/original.jpg",
        thumbnailPath: "/path/to/thumbnail.jpg",
        crop3x2Path: "/path/to/crop3x2.jpg",
        crop4x3Path: "/path/to/crop4x3.jpg",
        crop16x9Path: "/path/to/crop16x9.jpg",
        originalSize: 1024000,
        thumbnailSize: 51200,
        crop3x2Size: 256000,
        crop4x3Size: 128000,
        crop16x9Size: 64000,
        metadata: {
          width: 1920,
          height: 1080,
          format: "jpeg",
        },
      };
      const mockContext = createMockActionContext();

      // Mock the actionFactory.create method
      const mockAction = { execute: vi.fn() };
      (imageWorker as any).actionFactory.create = vi
        .fn()
        .mockReturnValue(mockAction);

      (
        imageWorker as unknown as {
          createActionPipeline: (data: ImageJobData, context: any) => any[];
        }
      ).createActionPipeline(mockData, mockContext);

      // Verify that create was called with the correct dependencies
      expect((imageWorker as any).actionFactory.create).toHaveBeenCalledWith(
        "upload_original",
        mockDependencies
      );
      expect((imageWorker as any).actionFactory.create).toHaveBeenCalledWith(
        "process_image",
        mockDependencies
      );
      expect((imageWorker as any).actionFactory.create).toHaveBeenCalledWith(
        "upload_processed",
        mockDependencies
      );
      expect((imageWorker as any).actionFactory.create).toHaveBeenCalledWith(
        "save_image",
        mockDependencies
      );
      expect((imageWorker as any).actionFactory.create).toHaveBeenCalledWith(
        "cleanup_local_files",
        mockDependencies
      );
      expect((imageWorker as any).actionFactory.create).toHaveBeenCalledWith(
        "image_completed_status",
        mockDependencies
      );
      expect((imageWorker as any).actionFactory.create).toHaveBeenCalledWith(
        "check_image_completion",
        mockDependencies
      );
    });

    it("should handle empty data object", () => {
      const imageWorker = new ImageWorker(mockQueue, mockDependencies);
      const emptyData = {} as ImageJobData;
      const mockContext = createMockActionContext();

      // Mock the actionFactory.create method
      const mockAction = { execute: vi.fn() };
      (imageWorker as any).actionFactory.create = vi
        .fn()
        .mockReturnValue(mockAction);

      const pipeline = (
        imageWorker as unknown as {
          createActionPipeline: (data: ImageJobData, context: any) => any[];
        }
      ).createActionPipeline(emptyData, mockContext);

      expect(pipeline).toHaveLength(7);
      expect((imageWorker as any).actionFactory.create).toHaveBeenCalledTimes(
        7
      );
    });

    it("should handle null context", () => {
      const imageWorker = new ImageWorker(mockQueue, mockDependencies);
      const mockData: ImageJobData = {
        noteId: "test-note-id",
        importId: "test-import-id",
        imagePath: "/path/to/image.jpg",
        outputDir: "/path/to/output",
        filename: "test.jpg",
        originalPath: "/path/to/original.jpg",
        thumbnailPath: "/path/to/thumbnail.jpg",
        crop3x2Path: "/path/to/crop3x2.jpg",
        crop4x3Path: "/path/to/crop4x3.jpg",
        crop16x9Path: "/path/to/crop16x9.jpg",
        originalSize: 1024000,
        thumbnailSize: 51200,
        crop3x2Size: 256000,
        crop4x3Size: 128000,
        crop16x9Size: 64000,
        metadata: {
          width: 1920,
          height: 1080,
          format: "jpeg",
        },
      };

      // Mock the actionFactory.create method
      const mockAction = { execute: vi.fn() };
      (imageWorker as any).actionFactory.create = vi
        .fn()
        .mockReturnValue(mockAction);

      const pipeline = (
        imageWorker as unknown as {
          createActionPipeline: (data: ImageJobData, context: any) => any[];
        }
      ).createActionPipeline(mockData, null);

      expect(pipeline).toHaveLength(7);
      expect((imageWorker as any).actionFactory.create).toHaveBeenCalledTimes(
        7
      );
    });
  });

  describe("inheritance from BaseWorker", () => {
    it("should be instance of BaseWorker", () => {
      const imageWorker = new ImageWorker(mockQueue, mockDependencies);
      expect(imageWorker).toBeInstanceOf(ImageWorker);
    });

    it("should have access to protected properties", () => {
      const imageWorker = new ImageWorker(mockQueue, mockDependencies);

      expect((imageWorker as any).dependencies).toBe(mockDependencies);
      expect((imageWorker as any).actionFactory).toBeDefined();
    });
  });
});
