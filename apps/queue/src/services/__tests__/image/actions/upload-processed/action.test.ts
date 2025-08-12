import { beforeEach, describe, expect, it, vi } from "vitest";

import { createMockLogger } from "../../../../../test-utils/helpers";
import type { ActionContext } from "../../../../../workers/core/types";
import type {
  ImageJobData,
  ImageWorkerDependencies,
} from "../../../../../workers/image/types";
import { UploadProcessedAction } from "../../../../image/actions/upload-processed/action";

// Mock the service
vi.mock("../../../../image/actions/upload-processed/service", () => ({
  uploadProcessed: vi.fn(),
}));

describe("Upload Processed Action", () => {
  let action: UploadProcessedAction;
  let mockData: ImageJobData;
  let mockDependencies: ImageWorkerDependencies;
  let mockContext: ActionContext;
  let mockUploadProcessed: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Get mocked function
    const uploadProcessedModule = vi.mocked(
      await import("../../../../image/actions/upload-processed/service")
    );
    mockUploadProcessed = vi.mocked(uploadProcessedModule.uploadProcessed);

    // Create action instance
    action = new UploadProcessedAction();

    // Create mock data
    mockData = {
      noteId: "test-note-123",
      importId: "test-import-456",
      imagePath: "/path/to/image.jpg",
      outputDir: "/path/to/output",
      filename: "image.jpg",
      originalPath: "/path/to/original.jpg",
      thumbnailPath: "/path/to/thumbnail.jpg",
      crop3x2Path: "/path/to/crop3x2.jpg",
      crop4x3Path: "/path/to/crop4x3.jpg",
      crop16x9Path: "/path/to/crop16x9.jpg",
      originalSize: 1024,
      thumbnailSize: 512,
      crop3x2Size: 768,
      crop4x3Size: 768,
      crop16x9Size: 768,
      metadata: {
        width: 1920,
        height: 1080,
        format: "jpeg",
      },
    };

    // Create mock dependencies
    mockDependencies = {
      serviceContainer: {
        r2: {
          uploadFile: vi.fn(),
        },
      },
      logger: createMockLogger(),
    } as unknown as ImageWorkerDependencies;

    // Create mock context
    mockContext = {
      jobId: "test-job-123",
      retryCount: 0,
      queueName: "image-queue",
      operation: "upload-processed",
      startTime: Date.now(),
      workerName: "test-worker",
      attemptNumber: 1,
    };

    // Setup default mock response
    mockUploadProcessed.mockResolvedValue({
      ...mockData,
      r2OriginalUrl: "https://r2.example.com/original.jpg",
      r2ThumbnailUrl: "https://r2.example.com/thumbnail.jpg",
      r2Crop3x2Url: "https://r2.example.com/crop3x2.jpg",
      r2Crop4x3Url: "https://r2.example.com/crop4x3.jpg",
      r2Crop16x9Url: "https://r2.example.com/crop16x9.jpg",
    });
  });

  describe("UploadProcessedAction", () => {
    describe("name", () => {
      it("should have correct action name", () => {
        expect(action.name).toBe("upload_processed");
      });
    });

    describe("execute", () => {
      it("should execute upload processed successfully", async () => {
        const result = await action.execute(
          mockData,
          mockDependencies,
          mockContext
        );

        expect(mockUploadProcessed).toHaveBeenCalledWith(
          mockData,
          mockDependencies.serviceContainer,
          mockDependencies.logger
        );

        expect(result).toEqual({
          ...mockData,
          r2OriginalUrl: "https://r2.example.com/original.jpg",
          r2ThumbnailUrl: "https://r2.example.com/thumbnail.jpg",
          r2Crop3x2Url: "https://r2.example.com/crop3x2.jpg",
          r2Crop4x3Url: "https://r2.example.com/crop4x3.jpg",
          r2Crop16x9Url: "https://r2.example.com/crop16x9.jpg",
        });
      });

      it("should handle service returning partial R2 URLs", async () => {
        mockUploadProcessed.mockResolvedValue({
          ...mockData,
          r2OriginalUrl: "https://r2.example.com/original.jpg",
          r2ThumbnailUrl: undefined,
          r2Crop3x2Url: "https://r2.example.com/crop3x2.jpg",
          r2Crop4x3Url: undefined,
          r2Crop16x9Url: "https://r2.example.com/crop16x9.jpg",
        });

        const result = await action.execute(
          mockData,
          mockDependencies,
          mockContext
        );

        expect(result).toEqual({
          ...mockData,
          r2OriginalUrl: "https://r2.example.com/original.jpg",
          r2ThumbnailUrl: undefined,
          r2Crop3x2Url: "https://r2.example.com/crop3x2.jpg",
          r2Crop4x3Url: undefined,
          r2Crop16x9Url: "https://r2.example.com/crop16x9.jpg",
        });
      });

      it("should handle service returning no R2 URLs", async () => {
        mockUploadProcessed.mockResolvedValue({
          ...mockData,
          r2OriginalUrl: undefined,
          r2ThumbnailUrl: undefined,
          r2Crop3x2Url: undefined,
          r2Crop4x3Url: undefined,
          r2Crop16x9Url: undefined,
        });

        const result = await action.execute(
          mockData,
          mockDependencies,
          mockContext
        );

        expect(result).toEqual({
          ...mockData,
          r2OriginalUrl: undefined,
          r2ThumbnailUrl: undefined,
          r2Crop3x2Url: undefined,
          r2Crop4x3Url: undefined,
          r2Crop16x9Url: undefined,
        });
      });

      it("should preserve existing R2 information if service doesn't return it", async () => {
        const dataWithR2 = {
          ...mockData,
          r2Key: "existing-key",
          r2Url: "existing-url",
        };

        mockUploadProcessed.mockResolvedValue({
          ...dataWithR2,
          // Service doesn't return R2 URLs
        });

        const result = await action.execute(
          dataWithR2,
          mockDependencies,
          mockContext
        );

        expect(result).toEqual({
          ...dataWithR2,
          r2Key: "existing-key",
          r2Url: "existing-url",
        });
      });

      it("should handle service errors gracefully", async () => {
        mockUploadProcessed.mockRejectedValue(new Error("Service error"));

        await expect(
          action.execute(mockData, mockDependencies, mockContext)
        ).rejects.toThrow("Service error");

        expect(mockUploadProcessed).toHaveBeenCalledWith(
          mockData,
          mockDependencies.serviceContainer,
          mockDependencies.logger
        );
      });

      it("should handle missing noteId", async () => {
        const dataWithoutNoteId = {
          ...mockData,
          noteId: "",
        };

        // Update mock to return the modified data
        mockUploadProcessed.mockResolvedValue({
          ...dataWithoutNoteId,
          r2OriginalUrl: "https://r2.example.com/original.jpg",
          r2ThumbnailUrl: "https://r2.example.com/thumbnail.jpg",
          r2Crop3x2Url: "https://r2.example.com/crop3x2.jpg",
          r2Crop4x3Url: "https://r2.example.com/crop4x3.jpg",
          r2Crop16x9Url: "https://r2.example.com/crop16x9.jpg",
        });

        const result = await action.execute(
          dataWithoutNoteId,
          mockDependencies,
          mockContext
        );

        expect(mockUploadProcessed).toHaveBeenCalledWith(
          dataWithoutNoteId,
          mockDependencies.serviceContainer,
          mockDependencies.logger
        );

        expect(result).toEqual({
          ...dataWithoutNoteId,
          r2OriginalUrl: "https://r2.example.com/original.jpg",
          r2ThumbnailUrl: "https://r2.example.com/thumbnail.jpg",
          r2Crop3x2Url: "https://r2.example.com/crop3x2.jpg",
          r2Crop4x3Url: "https://r2.example.com/crop4x3.jpg",
          r2Crop16x9Url: "https://r2.example.com/crop16x9.jpg",
        });
      });

      it("should handle missing importId", async () => {
        const dataWithoutImportId = {
          ...mockData,
          importId: "",
        };

        // Update mock to return the modified data
        mockUploadProcessed.mockResolvedValue({
          ...dataWithoutImportId,
          r2OriginalUrl: "https://r2.example.com/original.jpg",
          r2ThumbnailUrl: "https://r2.example.com/thumbnail.jpg",
          r2Crop3x2Url: "https://r2.example.com/crop3x2.jpg",
          r2Crop4x3Url: "https://r2.example.com/crop4x3.jpg",
          r2Crop16x9Url: "https://r2.example.com/crop16x9.jpg",
        });

        const result = await action.execute(
          dataWithoutImportId,
          mockDependencies,
          mockContext
        );

        expect(mockUploadProcessed).toHaveBeenCalledWith(
          dataWithoutImportId,
          mockDependencies.serviceContainer,
          mockDependencies.logger
        );

        expect(result).toEqual({
          ...dataWithoutImportId,
          r2OriginalUrl: "https://r2.example.com/original.jpg",
          r2ThumbnailUrl: "https://r2.example.com/thumbnail.jpg",
          r2Crop3x2Url: "https://r2.example.com/crop3x2.jpg",
          r2Crop4x3Url: "https://r2.example.com/crop4x3.jpg",
          r2Crop16x9Url: "https://r2.example.com/crop16x9.jpg",
        });
      });

      it("should handle missing imagePath", async () => {
        const dataWithoutImagePath = {
          ...mockData,
          imagePath: "",
        };

        const result = await action.execute(
          dataWithoutImagePath,
          mockDependencies,
          mockContext
        );

        expect(mockUploadProcessed).toHaveBeenCalledWith(
          dataWithoutImagePath,
          mockDependencies.serviceContainer,
          mockDependencies.logger
        );

        expect(result).toEqual({
          ...mockData, // The service returns the original data structure
          r2OriginalUrl: "https://r2.example.com/original.jpg",
          r2ThumbnailUrl: "https://r2.example.com/thumbnail.jpg",
          r2Crop3x2Url: "https://r2.example.com/crop3x2.jpg",
          r2Crop4x3Url: "https://r2.example.com/crop4x3.jpg",
          r2Crop16x9Url: "https://r2.example.com/crop16x9.jpg",
        });
      });

      it("should handle missing filename", async () => {
        const dataWithoutFilename = {
          ...mockData,
          filename: "",
        };

        const result = await action.execute(
          dataWithoutFilename,
          mockDependencies,
          mockContext
        );

        expect(mockUploadProcessed).toHaveBeenCalledWith(
          dataWithoutFilename,
          mockDependencies.serviceContainer,
          mockDependencies.logger
        );

        expect(result).toEqual({
          ...mockData, // The service returns the original data structure
          r2OriginalUrl: "https://r2.example.com/original.jpg",
          r2ThumbnailUrl: "https://r2.example.com/thumbnail.jpg",
          r2Crop3x2Url: "https://r2.example.com/crop3x2.jpg",
          r2Crop4x3Url: "https://r2.example.com/crop4x3.jpg",
          r2Crop16x9Url: "https://r2.example.com/crop16x9.jpg",
        });
      });

      it("should handle missing outputDir", async () => {
        const dataWithoutOutputDir = {
          ...mockData,
          outputDir: "",
        };

        const result = await action.execute(
          dataWithoutOutputDir,
          mockDependencies,
          mockContext
        );

        expect(mockUploadProcessed).toHaveBeenCalledWith(
          dataWithoutOutputDir,
          mockDependencies.serviceContainer,
          mockDependencies.logger
        );

        expect(result).toEqual({
          ...mockData, // The service returns the original data structure
          r2OriginalUrl: "https://r2.example.com/original.jpg",
          r2ThumbnailUrl: "https://r2.example.com/thumbnail.jpg",
          r2Crop3x2Url: "https://r2.example.com/crop3x2.jpg",
          r2Crop4x3Url: "https://r2.example.com/crop4x3.jpg",
          r2Crop16x9Url: "https://r2.example.com/crop16x9.jpg",
        });
      });

      it("should handle missing file paths", async () => {
        const dataWithoutPaths = {
          ...mockData,
          originalPath: "",
          thumbnailPath: "",
          crop3x2Path: "",
          crop4x3Path: "",
          crop16x9Path: "",
        };

        const result = await action.execute(
          dataWithoutPaths,
          mockDependencies,
          mockContext
        );

        expect(mockUploadProcessed).toHaveBeenCalledWith(
          dataWithoutPaths,
          mockDependencies.serviceContainer,
          mockDependencies.logger
        );

        expect(result).toEqual({
          ...mockData, // The service returns the original data structure
          r2OriginalUrl: "https://r2.example.com/original.jpg",
          r2ThumbnailUrl: "https://r2.example.com/thumbnail.jpg",
          r2Crop3x2Url: "https://r2.example.com/crop3x2.jpg",
          r2Crop4x3Url: "https://r2.example.com/crop4x3.jpg",
          r2Crop16x9Url: "https://r2.example.com/crop16x9.jpg",
        });
      });

      it("should handle zero file sizes", async () => {
        const dataWithZeroSizes = {
          ...mockData,
          originalSize: 0,
          thumbnailSize: 0,
          crop3x2Size: 0,
          crop4x3Size: 0,
          crop16x9Size: 0,
        };

        const result = await action.execute(
          dataWithZeroSizes,
          mockDependencies,
          mockContext
        );

        expect(mockUploadProcessed).toHaveBeenCalledWith(
          dataWithZeroSizes,
          mockDependencies.serviceContainer,
          mockDependencies.logger
        );

        expect(result).toEqual({
          ...mockData, // The service returns the original data structure
          r2OriginalUrl: "https://r2.example.com/original.jpg",
          r2ThumbnailUrl: "https://r2.example.com/thumbnail.jpg",
          r2Crop3x2Url: "https://r2.example.com/crop3x2.jpg",
          r2Crop4x3Url: "https://r2.example.com/crop4x3.jpg",
          r2Crop16x9Url: "https://r2.example.com/crop16x9.jpg",
        });
      });

      it("should handle missing metadata", async () => {
        const dataWithoutMetadata = {
          ...mockData,
          metadata: {
            width: 0,
            height: 0,
            format: "",
          },
        };

        const result = await action.execute(
          dataWithoutMetadata,
          mockDependencies,
          mockContext
        );

        expect(mockUploadProcessed).toHaveBeenCalledWith(
          dataWithoutMetadata,
          mockDependencies.serviceContainer,
          mockDependencies.logger
        );

        expect(result).toEqual({
          ...mockData, // The service returns the original data structure
          r2OriginalUrl: "https://r2.example.com/original.jpg",
          r2ThumbnailUrl: "https://r2.example.com/thumbnail.jpg",
          r2Crop3x2Url: "https://r2.example.com/crop3x2.jpg",
          r2Crop4x3Url: "https://r2.example.com/crop4x3.jpg",
          r2Crop16x9Url: "https://r2.example.com/crop16x9.jpg",
        });
      });

      it("should handle data with all optional fields", async () => {
        const dataWithAllFields = {
          ...mockData,
          imageId: "test-image-123",
          r2Key: "test-key",
          r2Url: "https://r2.example.com/test.jpg",
        };

        const result = await action.execute(
          dataWithAllFields,
          mockDependencies,
          mockContext
        );

        expect(mockUploadProcessed).toHaveBeenCalledWith(
          dataWithAllFields,
          mockDependencies.serviceContainer,
          mockDependencies.logger
        );

        expect(result).toEqual({
          ...mockData, // The service returns the original data structure
          r2OriginalUrl: "https://r2.example.com/original.jpg",
          r2ThumbnailUrl: "https://r2.example.com/thumbnail.jpg",
          r2Crop3x2Url: "https://r2.example.com/crop3x2.jpg",
          r2Crop4x3Url: "https://r2.example.com/crop4x3.jpg",
          r2Crop16x9Url: "https://r2.example.com/crop16x9.jpg",
        });
      });
    });

    describe("function signature", () => {
      it("should be an instance of UploadProcessedAction", () => {
        expect(action).toBeInstanceOf(UploadProcessedAction);
      });

      it("should have execute method", () => {
        expect(typeof action.execute).toBe("function");
      });

      it("should have name property", () => {
        expect(action).toHaveProperty("name");
      });
    });
  });
});
