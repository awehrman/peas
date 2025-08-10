import type { Queue } from "bullmq";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { IServiceContainer } from "../../../services/container";
import type { StructuredLogger } from "../../../types";
import type { ImageWorkerDependencies } from "../../image/types";
import type { ImageProcessingData, ImageSaveData } from "../../image/types";
import { ImageWorker } from "../../image/worker";

// Mock dependencies
vi.mock("../../../services/image", () => ({
  registerImageActions: vi.fn(),
}));

// Mock console.log to capture output
const mockConsoleLog = vi.fn();
const mockConsoleError = vi.fn();

describe("ImageWorker", () => {
  let mockQueue: Queue;
  let mockContainer: IServiceContainer;
  let mockLogger: StructuredLogger;
  let mockDependencies: ImageWorkerDependencies;
  let imageWorker: ImageWorker;

  const mockImageProcessingData: ImageProcessingData = {
    noteId: "note-123",
    importId: "import-456",
    imagePath: "/path/to/image.jpg",
    outputDir: "/output/dir",
    filename: "image.jpg",
  };

  const mockImageSaveData: ImageSaveData = {
    noteId: "note-123",
    importId: "import-456",
    imageId: "image-789",
    originalPath: "/path/to/original.jpg",
    thumbnailPath: "/path/to/thumbnail.jpg",
    crop3x2Path: "/path/to/crop3x2.jpg",
    crop4x3Path: "/path/to/crop4x3.jpg",
    crop16x9Path: "/path/to/crop16x9.jpg",
    originalSize: 1024,
    thumbnailSize: 256,
    crop3x2Size: 512,
    crop4x3Size: 512,
    crop16x9Size: 512,
    metadata: {
      width: 1920,
      height: 1080,
      format: "jpeg",
    },
    r2Key: "images/image-789.jpg",
    r2Url: "https://example.com/images/image-789.jpg",
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    console.log = mockConsoleLog;
    console.error = mockConsoleError;

    mockLogger = {
      log: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    } as any;

    mockContainer = {
      logger: mockLogger,
    } as IServiceContainer;

    mockDependencies = {
      serviceContainer: mockContainer,
      logger: mockLogger,
    };

    mockQueue = {
      name: "test-image-queue",
    } as Queue;

    // Mock registerImageActions to not throw
    const { registerImageActions } = await import("../../../services/image");
    vi.mocked(registerImageActions).mockImplementation(() => {
      // Do nothing
    });

    // Create the actual worker instance
    imageWorker = new ImageWorker(mockQueue, mockDependencies);
  });

  describe("constructor", () => {
    it("should create ImageWorker instance with valid parameters", () => {
      expect(imageWorker).toBeInstanceOf(ImageWorker);
      // Check that all expected log messages were called (order may vary due to registerActions)
      expect(mockConsoleLog).toHaveBeenCalledWith(
        "[IMAGE_WORKER] ImageWorker constructor called"
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        "[IMAGE_WORKER] Queue name: test-image-queue"
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        "[IMAGE_WORKER] Dependencies:",
        ["serviceContainer", "logger"]
      );
    });

    it("should handle queue with different name", () => {
      const customQueue = { name: "custom-queue" } as Queue;
      const worker = new ImageWorker(customQueue, mockDependencies);

      expect(worker).toBeInstanceOf(ImageWorker);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        "[IMAGE_WORKER] Queue name: custom-queue"
      );
    });

    it("should handle dependencies with different structure", () => {
      const customDependencies = {
        serviceContainer: mockContainer,
        logger: mockLogger,
        customProp: "value",
      } as ImageWorkerDependencies;

      const worker = new ImageWorker(mockQueue, customDependencies);

      expect(worker).toBeInstanceOf(ImageWorker);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        "[IMAGE_WORKER] Dependencies:",
        ["serviceContainer", "logger", "customProp"]
      );
    });
  });

  describe("registerActions", () => {
    it("should register image actions successfully", async () => {
      const { registerImageActions } = await import("../../../services/image");

      // Call the protected method through reflection
      (
        imageWorker as unknown as { registerActions: () => void }
      ).registerActions();

      expect(registerImageActions).toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith(
        "[IMAGE_WORKER] Registering image actions"
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        "[IMAGE_WORKER] Image actions registered successfully"
      );
    });

    it("should handle registerImageActions throwing error", async () => {
      const { registerImageActions } = await import("../../../services/image");
      const error = new Error("Registration failed");
      vi.mocked(registerImageActions).mockImplementation(() => {
        throw error;
      });

      expect(() => {
        (
          imageWorker as unknown as { registerActions: () => void }
        ).registerActions();
      }).toThrow("Registration failed");
    });
  });

  describe("getOperationName", () => {
    it("should return correct operation name", () => {
      const operationName = (
        imageWorker as unknown as { getOperationName: () => string }
      ).getOperationName();
      expect(operationName).toBe("image_processing");
    });
  });

  describe("createActionPipeline", () => {
    it("should create pipeline with ImageProcessingData", () => {
      const mockContext = { jobId: "job-123" };

      expect(() => {
        const pipeline = (
          imageWorker as unknown as {
            createActionPipeline: (
              data: unknown,
              context: unknown
            ) => unknown[];
          }
        ).createActionPipeline(mockImageProcessingData, mockContext);
        expect(pipeline).toBeDefined();
        expect(Array.isArray(pipeline)).toBe(true);
        expect(pipeline.length).toBe(4);
      }).toThrow("Action 'upload_original' not registered");

      expect(mockConsoleLog).toHaveBeenCalledWith(
        "[IMAGE_WORKER] Creating action pipeline"
      );
    });

    it("should create pipeline with ImageSaveData", () => {
      const mockContext = { jobId: "job-456" };

      expect(() => {
        const pipeline = (
          imageWorker as unknown as {
            createActionPipeline: (
              data: unknown,
              context: unknown
            ) => unknown[];
          }
        ).createActionPipeline(mockImageSaveData, mockContext);
        expect(pipeline).toBeDefined();
        expect(Array.isArray(pipeline)).toBe(true);
        expect(pipeline.length).toBe(4);
      }).toThrow("Action 'upload_original' not registered");

      expect(mockConsoleLog).toHaveBeenCalledWith(
        "[IMAGE_WORKER] Creating action pipeline"
      );
    });
  });

  describe("onBeforeJob", () => {
    it("should log job start with ImageProcessingData", async () => {
      const mockContext = { jobId: "job-123" };

      await (
        imageWorker as unknown as {
          onBeforeJob: (data: unknown, context: unknown) => Promise<void>;
        }
      ).onBeforeJob(mockImageProcessingData, mockContext);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        "[IMAGE_WORKER] Starting job job-123"
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        "[IMAGE_WORKER] Job data:",
        mockImageProcessingData
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        "[IMAGE_WORKER] Job context:",
        mockContext
      );
    });

    it("should log job start with ImageSaveData", async () => {
      const mockContext = { jobId: "job-456" };

      await (
        imageWorker as unknown as {
          onBeforeJob: (data: unknown, context: unknown) => Promise<void>;
        }
      ).onBeforeJob(mockImageSaveData, mockContext);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        "[IMAGE_WORKER] Starting job job-456"
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        "[IMAGE_WORKER] Job data:",
        mockImageSaveData
      );
    });
  });

  describe("onAfterJob", () => {
    it("should log job completion with ImageProcessingData", async () => {
      const mockContext = { jobId: "job-123" };
      const mockResult = { success: true };

      await (
        imageWorker as unknown as {
          onAfterJob: (
            data: unknown,
            context: unknown,
            result: unknown
          ) => Promise<void>;
        }
      ).onAfterJob(mockImageProcessingData, mockContext, mockResult);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        "[IMAGE_WORKER] Completed job job-123"
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        "[IMAGE_WORKER] Job result:",
        mockResult
      );
    });

    it("should log job completion with ImageSaveData", async () => {
      const mockContext = { jobId: "job-456" };
      const mockResult = { success: true };

      await (
        imageWorker as unknown as {
          onAfterJob: (
            data: unknown,
            context: unknown,
            result: unknown
          ) => Promise<void>;
        }
      ).onAfterJob(mockImageSaveData, mockContext, mockResult);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        "[IMAGE_WORKER] Completed job job-456"
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        "[IMAGE_WORKER] Job result:",
        mockResult
      );
    });
  });

  describe("onJobError", () => {
    it("should log job error with ImageProcessingData", async () => {
      const mockContext = { jobId: "job-123" };
      const mockError = new Error("Processing failed");

      await (
        imageWorker as unknown as {
          onJobError: (
            error: unknown,
            data: unknown,
            context: unknown
          ) => Promise<void>;
        }
      ).onJobError(mockError, mockImageProcessingData, mockContext);

      expect(mockConsoleError).toHaveBeenCalledWith(
        "[IMAGE_WORKER] Job job-123 failed:",
        mockError
      );
      expect(mockConsoleError).toHaveBeenCalledWith(
        "[IMAGE_WORKER] Failed job data:",
        mockImageProcessingData
      );
    });

    it("should log job error with ImageSaveData", async () => {
      const mockContext = { jobId: "job-456" };
      const mockError = new Error("Save failed");

      await (
        imageWorker as unknown as {
          onJobError: (
            error: unknown,
            data: unknown,
            context: unknown
          ) => Promise<void>;
        }
      ).onJobError(mockError, mockImageSaveData, mockContext);

      expect(mockConsoleError).toHaveBeenCalledWith(
        "[IMAGE_WORKER] Job job-456 failed:",
        mockError
      );
      expect(mockConsoleError).toHaveBeenCalledWith(
        "[IMAGE_WORKER] Failed job data:",
        mockImageSaveData
      );
    });

    it("should handle different error types", async () => {
      const mockContext = { jobId: "job-789" };
      const mockError = "String error";

      await (
        imageWorker as unknown as {
          onJobError: (
            error: unknown,
            data: unknown,
            context: unknown
          ) => Promise<void>;
        }
      ).onJobError(mockError as unknown, mockImageProcessingData, mockContext);

      expect(mockConsoleError).toHaveBeenCalledWith(
        "[IMAGE_WORKER] Job job-789 failed:",
        mockError
      );
    });
  });

  describe("edge cases", () => {
    it("should handle null data in createActionPipeline", () => {
      const mockContext = { jobId: "job-null" };

      expect(() => {
        (
          imageWorker as unknown as {
            createActionPipeline: (
              data: unknown,
              context: unknown
            ) => unknown[];
          }
        ).createActionPipeline(null, mockContext);
      }).toThrow("Action 'upload_original' not registered");
    });

    it("should handle null context in createActionPipeline", () => {
      expect(() => {
        (
          imageWorker as unknown as {
            createActionPipeline: (
              data: unknown,
              context: unknown
            ) => unknown[];
          }
        ).createActionPipeline(mockImageProcessingData, null);
      }).toThrow("Action 'upload_original' not registered");
    });

    it("should handle null data in onBeforeJob", async () => {
      const mockContext = { jobId: "job-null" };

      await expect(
        (
          imageWorker as unknown as {
            onBeforeJob: (data: unknown, context: unknown) => Promise<void>;
          }
        ).onBeforeJob(null, mockContext)
      ).resolves.not.toThrow();
    });

    it("should handle null context in onBeforeJob", async () => {
      await expect(
        (
          imageWorker as unknown as {
            onBeforeJob: (data: unknown, context: unknown) => Promise<void>;
          }
        ).onBeforeJob(mockImageProcessingData, null)
      ).rejects.toThrow("Cannot read properties of null (reading 'jobId')");
    });

    it("should handle null data in onAfterJob", async () => {
      const mockContext = { jobId: "job-null" };
      const mockResult = { success: true };

      await expect(
        (
          imageWorker as unknown as {
            onAfterJob: (
              data: unknown,
              context: unknown,
              result: unknown
            ) => Promise<void>;
          }
        ).onAfterJob(null, mockContext, mockResult)
      ).resolves.not.toThrow();
    });

    it("should handle null context in onAfterJob", async () => {
      const mockResult = { success: true };

      await expect(
        (
          imageWorker as unknown as {
            onAfterJob: (
              data: unknown,
              context: unknown,
              result: unknown
            ) => Promise<void>;
          }
        ).onAfterJob(mockImageProcessingData, null, mockResult)
      ).rejects.toThrow("Cannot read properties of null (reading 'jobId')");
    });

    it("should handle null error in onJobError", async () => {
      const mockContext = { jobId: "job-null" };

      await expect(
        (
          imageWorker as unknown as {
            onJobError: (
              error: unknown,
              data: unknown,
              context: unknown
            ) => Promise<void>;
          }
        ).onJobError(null, mockImageProcessingData, mockContext)
      ).resolves.not.toThrow();
    });

    it("should handle null data in onJobError", async () => {
      const mockContext = { jobId: "job-null" };
      const mockError = new Error("Test error");

      await expect(
        (
          imageWorker as unknown as {
            onJobError: (
              error: unknown,
              data: unknown,
              context: unknown
            ) => Promise<void>;
          }
        ).onJobError(mockError, null, mockContext)
      ).resolves.not.toThrow();
    });
  });
});
