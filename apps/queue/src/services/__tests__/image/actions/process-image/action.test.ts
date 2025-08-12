import { beforeEach, describe, expect, it, vi } from "vitest";

import { createMockLogger } from "../../../../../test-utils/helpers";
import type { ActionContext } from "../../../../../workers/core/types";
import type {
  ImageJobData,
  ImageWorkerDependencies,
} from "../../../../../workers/image/types";
import { ProcessImageAction } from "../../../../image/actions/process-image/action";

// Mock the service
vi.mock("../../../../image/actions/process-image/service", () => ({
  processImage: vi.fn(),
}));

describe("Process Image Action", () => {
  let action: ProcessImageAction;
  let mockData: ImageJobData;
  let mockDependencies: ImageWorkerDependencies;
  let mockContext: ActionContext;
  let mockProcessImage: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Get mocked function
    const processImageModule = vi.mocked(
      await import("../../../../image/actions/process-image/service")
    );
    mockProcessImage = vi.mocked(processImageModule.processImage);

    // Create action instance
    action = new ProcessImageAction();

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
      operation: "process-image",
      startTime: Date.now(),
      workerName: "test-worker",
      attemptNumber: 1,
    };

    // Setup default mock response
    mockProcessImage.mockResolvedValue({
      ...mockData,
      originalPath: "/path/to/output/original.jpg",
      thumbnailPath: "/path/to/output/thumbnail.jpg",
      crop3x2Path: "/path/to/output/crop3x2.jpg",
      crop4x3Path: "/path/to/output/crop4x3.jpg",
      crop16x9Path: "/path/to/output/crop16x9.jpg",
      originalSize: 2048,
      thumbnailSize: 1024,
      crop3x2Size: 1536,
      crop4x3Size: 1536,
      crop16x9Size: 1536,
      metadata: {
        width: 1920,
        height: 1080,
        format: "jpeg",
      },
    });
  });

  describe("ProcessImageAction", () => {
    describe("name", () => {
      it("should have correct action name", () => {
        expect(action.name).toBe("process_image");
      });
    });

    describe("execute", () => {
      it("should execute process image successfully", async () => {
        const result = await action.execute(
          mockData,
          mockDependencies,
          mockContext
        );

        expect(mockProcessImage).toHaveBeenCalledWith(
          mockData,
          mockDependencies.logger
        );

        expect(result).toEqual({
          ...mockData,
          originalPath: "/path/to/output/original.jpg",
          thumbnailPath: "/path/to/output/thumbnail.jpg",
          crop3x2Path: "/path/to/output/crop3x2.jpg",
          crop4x3Path: "/path/to/output/crop4x3.jpg",
          crop16x9Path: "/path/to/output/crop16x9.jpg",
          originalSize: 2048,
          thumbnailSize: 1024,
          crop3x2Size: 1536,
          crop4x3Size: 1536,
          crop16x9Size: 1536,
          metadata: {
            width: 1920,
            height: 1080,
            format: "jpeg",
          },
        });
      });

      it("should handle service returning updated metadata", async () => {
        mockProcessImage.mockResolvedValue({
          ...mockData,
          metadata: {
            width: 800,
            height: 600,
            format: "png",
          },
        });

        const result = await action.execute(
          mockData,
          mockDependencies,
          mockContext
        );

        expect(result.metadata).toEqual({
          width: 800,
          height: 600,
          format: "png",
        });
      });

      it("should handle service returning updated file sizes", async () => {
        mockProcessImage.mockResolvedValue({
          ...mockData,
          originalSize: 0,
          thumbnailSize: 0,
          crop3x2Size: 0,
          crop4x3Size: 0,
          crop16x9Size: 0,
        });

        const result = await action.execute(
          mockData,
          mockDependencies,
          mockContext
        );

        expect(result.originalSize).toBe(0);
        expect(result.thumbnailSize).toBe(0);
        expect(result.crop3x2Size).toBe(0);
        expect(result.crop4x3Size).toBe(0);
        expect(result.crop16x9Size).toBe(0);
      });

      it("should handle service returning updated file paths", async () => {
        mockProcessImage.mockResolvedValue({
          ...mockData,
          originalPath: "/new/path/original.jpg",
          thumbnailPath: "/new/path/thumbnail.jpg",
          crop3x2Path: "/new/path/crop3x2.jpg",
          crop4x3Path: "/new/path/crop4x3.jpg",
          crop16x9Path: "/new/path/crop16x9.jpg",
        });

        const result = await action.execute(
          mockData,
          mockDependencies,
          mockContext
        );

        expect(result.originalPath).toBe("/new/path/original.jpg");
        expect(result.thumbnailPath).toBe("/new/path/thumbnail.jpg");
        expect(result.crop3x2Path).toBe("/new/path/crop3x2.jpg");
        expect(result.crop4x3Path).toBe("/new/path/crop4x3.jpg");
        expect(result.crop16x9Path).toBe("/new/path/crop16x9.jpg");
      });

      it("should handle service errors gracefully", async () => {
        mockProcessImage.mockRejectedValue(new Error("Processing failed"));

        await expect(
          action.execute(mockData, mockDependencies, mockContext)
        ).rejects.toThrow("Processing failed");

        expect(mockProcessImage).toHaveBeenCalledWith(
          mockData,
          mockDependencies.logger
        );
      });

      it("should handle missing noteId", async () => {
        const dataWithoutNoteId = {
          ...mockData,
          noteId: "",
        };

        // Mock the service to return the modified data
        mockProcessImage.mockResolvedValue({
          ...dataWithoutNoteId,
          originalPath: "/path/to/output/original.jpg",
          thumbnailPath: "/path/to/output/thumbnail.jpg",
          crop3x2Path: "/path/to/output/crop3x2.jpg",
          crop4x3Path: "/path/to/output/crop4x3.jpg",
          crop16x9Path: "/path/to/output/crop16x9.jpg",
          originalSize: 2048,
          thumbnailSize: 1024,
          crop3x2Size: 1536,
          crop4x3Size: 1536,
          crop16x9Size: 1536,
          metadata: {
            width: 1920,
            height: 1080,
            format: "jpeg",
          },
        });

        const result = await action.execute(
          dataWithoutNoteId,
          mockDependencies,
          mockContext
        );

        expect(mockProcessImage).toHaveBeenCalledWith(
          dataWithoutNoteId,
          mockDependencies.logger
        );

        expect(result.noteId).toBe("");
      });

      it("should handle missing importId", async () => {
        const dataWithoutImportId = {
          ...mockData,
          importId: "",
        };

        // Mock the service to return the modified data
        mockProcessImage.mockResolvedValue({
          ...dataWithoutImportId,
          originalPath: "/path/to/output/original.jpg",
          thumbnailPath: "/path/to/output/thumbnail.jpg",
          crop3x2Path: "/path/to/output/crop3x2.jpg",
          crop4x3Path: "/path/to/output/crop4x3.jpg",
          crop16x9Path: "/path/to/output/crop16x9.jpg",
          originalSize: 2048,
          thumbnailSize: 1024,
          crop3x2Size: 1536,
          crop4x3Size: 1536,
          crop16x9Size: 1536,
          metadata: {
            width: 1920,
            height: 1080,
            format: "jpeg",
          },
        });

        const result = await action.execute(
          dataWithoutImportId,
          mockDependencies,
          mockContext
        );

        expect(mockProcessImage).toHaveBeenCalledWith(
          dataWithoutImportId,
          mockDependencies.logger
        );

        expect(result.importId).toBe("");
      });

      it("should handle missing imagePath", async () => {
        const dataWithoutImagePath = {
          ...mockData,
          imagePath: "",
        };

        // Mock the service to return the modified data
        mockProcessImage.mockResolvedValue({
          ...dataWithoutImagePath,
          originalPath: "/path/to/output/original.jpg",
          thumbnailPath: "/path/to/output/thumbnail.jpg",
          crop3x2Path: "/path/to/output/crop3x2.jpg",
          crop4x3Path: "/path/to/output/crop4x3.jpg",
          crop16x9Path: "/path/to/output/crop16x9.jpg",
          originalSize: 2048,
          thumbnailSize: 1024,
          crop3x2Size: 1536,
          crop4x3Size: 1536,
          crop16x9Size: 1536,
          metadata: {
            width: 1920,
            height: 1080,
            format: "jpeg",
          },
        });

        const result = await action.execute(
          dataWithoutImagePath,
          mockDependencies,
          mockContext
        );

        expect(mockProcessImage).toHaveBeenCalledWith(
          dataWithoutImagePath,
          mockDependencies.logger
        );

        expect(result.imagePath).toBe("");
      });

      it("should handle missing filename", async () => {
        const dataWithoutFilename = {
          ...mockData,
          filename: "",
        };

        // Mock the service to return the modified data
        mockProcessImage.mockResolvedValue({
          ...dataWithoutFilename,
          originalPath: "/path/to/output/original.jpg",
          thumbnailPath: "/path/to/output/thumbnail.jpg",
          crop3x2Path: "/path/to/output/crop3x2.jpg",
          crop4x3Path: "/path/to/output/crop4x3.jpg",
          crop16x9Path: "/path/to/output/crop16x9.jpg",
          originalSize: 2048,
          thumbnailSize: 1024,
          crop3x2Size: 1536,
          crop4x3Size: 1536,
          crop16x9Size: 1536,
          metadata: {
            width: 1920,
            height: 1080,
            format: "jpeg",
          },
        });

        const result = await action.execute(
          dataWithoutFilename,
          mockDependencies,
          mockContext
        );

        expect(mockProcessImage).toHaveBeenCalledWith(
          dataWithoutFilename,
          mockDependencies.logger
        );

        expect(result.filename).toBe("");
      });

      it("should handle missing outputDir", async () => {
        const dataWithoutOutputDir = {
          ...mockData,
          outputDir: "",
        };

        // Mock the service to return the modified data
        mockProcessImage.mockResolvedValue({
          ...dataWithoutOutputDir,
          originalPath: "/path/to/output/original.jpg",
          thumbnailPath: "/path/to/output/thumbnail.jpg",
          crop3x2Path: "/path/to/output/crop3x2.jpg",
          crop4x3Path: "/path/to/output/crop4x3.jpg",
          crop16x9Path: "/path/to/output/crop16x9.jpg",
          originalSize: 2048,
          thumbnailSize: 1024,
          crop3x2Size: 1536,
          crop4x3Size: 1536,
          crop16x9Size: 1536,
          metadata: {
            width: 1920,
            height: 1080,
            format: "jpeg",
          },
        });

        const result = await action.execute(
          dataWithoutOutputDir,
          mockDependencies,
          mockContext
        );

        expect(mockProcessImage).toHaveBeenCalledWith(
          dataWithoutOutputDir,
          mockDependencies.logger
        );

        expect(result.outputDir).toBe("");
      });

      it("should preserve existing R2 information", async () => {
        const dataWithR2 = {
          ...mockData,
          r2Key: "existing-key",
          r2Url: "existing-url",
        };

        // Mock the service to return the data with R2 information preserved
        mockProcessImage.mockResolvedValue({
          ...dataWithR2,
          originalPath: "/path/to/output/original.jpg",
          thumbnailPath: "/path/to/output/thumbnail.jpg",
          crop3x2Path: "/path/to/output/crop3x2.jpg",
          crop4x3Path: "/path/to/output/crop4x3.jpg",
          crop16x9Path: "/path/to/output/crop16x9.jpg",
          originalSize: 2048,
          thumbnailSize: 1024,
          crop3x2Size: 1536,
          crop4x3Size: 1536,
          crop16x9Size: 1536,
          metadata: {
            width: 1920,
            height: 1080,
            format: "jpeg",
          },
        });

        const result = await action.execute(
          dataWithR2,
          mockDependencies,
          mockContext
        );

        expect(result.r2Key).toBe("existing-key");
        expect(result.r2Url).toBe("existing-url");
      });

      it("should preserve existing R2 URLs for processed images", async () => {
        const dataWithR2Urls = {
          ...mockData,
          r2OriginalUrl: "https://r2.example.com/original.jpg",
          r2ThumbnailUrl: "https://r2.example.com/thumbnail.jpg",
          r2Crop3x2Url: "https://r2.example.com/crop3x2.jpg",
          r2Crop4x3Url: "https://r2.example.com/crop4x3.jpg",
          r2Crop16x9Url: "https://r2.example.com/crop16x9.jpg",
        };

        // Mock the service to return the data with R2 URLs preserved
        mockProcessImage.mockResolvedValue({
          ...dataWithR2Urls,
          originalPath: "/path/to/output/original.jpg",
          thumbnailPath: "/path/to/output/thumbnail.jpg",
          crop3x2Path: "/path/to/output/crop3x2.jpg",
          crop4x3Path: "/path/to/output/crop4x3.jpg",
          crop16x9Path: "/path/to/output/crop16x9.jpg",
          originalSize: 2048,
          thumbnailSize: 1024,
          crop3x2Size: 1536,
          crop4x3Size: 1536,
          crop16x9Size: 1536,
          metadata: {
            width: 1920,
            height: 1080,
            format: "jpeg",
          },
        });

        const result = await action.execute(
          dataWithR2Urls,
          mockDependencies,
          mockContext
        );

        expect(result.r2OriginalUrl).toBe(
          "https://r2.example.com/original.jpg"
        );
        expect(result.r2ThumbnailUrl).toBe(
          "https://r2.example.com/thumbnail.jpg"
        );
        expect(result.r2Crop3x2Url).toBe("https://r2.example.com/crop3x2.jpg");
        expect(result.r2Crop4x3Url).toBe("https://r2.example.com/crop4x3.jpg");
        expect(result.r2Crop16x9Url).toBe(
          "https://r2.example.com/crop16x9.jpg"
        );
      });
    });

    describe("function signature", () => {
      it("should be an instance of ProcessImageAction", () => {
        expect(action).toBeInstanceOf(ProcessImageAction);
      });

      it("should have execute method", () => {
        expect(typeof action.execute).toBe("function");
      });

      it("should have name property", () => {
        expect(action).toHaveProperty("name");
      });
    });

    describe("executeServiceAction integration", () => {
      it("should use executeServiceAction with correct configuration", async () => {
        // Spy on the executeServiceAction method
        const executeServiceActionSpy = vi.spyOn(
          action,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          "executeServiceAction" as any
        );

        await action.execute(mockData, mockDependencies, mockContext);

        expect(executeServiceActionSpy).toHaveBeenCalledTimes(1);
        expect(executeServiceActionSpy).toHaveBeenCalledWith({
          data: mockData,
          deps: mockDependencies,
          context: mockContext,
          serviceCall: expect.any(Function),
          contextName: "image_processing",
          startMessage: "Image processing started",
          completionMessage: "Image processing completed",
        });

        // Verify the serviceCall function calls processImage
        const callArgs = executeServiceActionSpy.mock.calls[0]?.[0];
        if (
          callArgs &&
          typeof callArgs === "object" &&
          "serviceCall" in callArgs
        ) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (callArgs as any).serviceCall();
          expect(mockProcessImage).toHaveBeenCalledWith(
            mockData,
            mockDependencies.logger
          );
        }
      });

      it("should handle executeServiceAction errors", async () => {
        const error = new Error("Service action error");
        mockProcessImage.mockRejectedValue(error);

        await expect(
          action.execute(mockData, mockDependencies, mockContext)
        ).rejects.toThrow("Service action error");
      });
    });
  });
});
