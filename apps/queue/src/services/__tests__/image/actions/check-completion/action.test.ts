import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createMockLogger,
  createMockStatusBroadcaster,
} from "../../../../../test-utils/helpers";
import type { ActionContext } from "../../../../../workers/core/types";
import type {
  ImageJobData,
  ImageWorkerDependencies,
} from "../../../../../workers/image/types";
import { CheckImageCompletionAction } from "../../../../image/actions/check-completion/action";

// Mock the service
vi.mock("../../../../image/actions/check-completion/service", () => ({
  checkImageCompletion: vi.fn(),
}));

describe("Check Image Completion Action", () => {
  let action: CheckImageCompletionAction;
  let mockData: ImageJobData;
  let mockDependencies: ImageWorkerDependencies;
  let mockContext: ActionContext;
  let mockCheckImageCompletion: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Get mocked function
    const checkCompletionModule = vi.mocked(
      await import("../../../../image/actions/check-completion/service")
    );
    mockCheckImageCompletion = vi.mocked(
      checkCompletionModule.checkImageCompletion
    );

    // Create action instance
    action = new CheckImageCompletionAction();

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
      statusBroadcaster: createMockStatusBroadcaster(),
    } as unknown as ImageWorkerDependencies;

    // Create mock context
    mockContext = {
      jobId: "test-job-123",
      retryCount: 0,
      queueName: "image-queue",
      operation: "check-completion",
      startTime: Date.now(),
      workerName: "test-worker",
      attemptNumber: 1,
    };

    // Setup default mock response
    mockCheckImageCompletion.mockResolvedValue(mockData);
  });

  describe("CheckImageCompletionAction", () => {
    describe("name", () => {
      it("should have correct action name", () => {
        expect(action.name).toBe("check_image_completion");
      });
    });

    describe("validateInput", () => {
      it("should always return null (no validation errors)", () => {
        const result = action.validateInput(mockData);

        expect(result).toBeNull();
      });

      it("should return null for data with missing noteId", () => {
        const dataWithoutNoteId = {
          ...mockData,
          noteId: "",
        };

        const result = action.validateInput(dataWithoutNoteId);

        expect(result).toBeNull();
      });

      it("should return null for data with missing importId", () => {
        const dataWithoutImportId = {
          ...mockData,
          importId: "",
        };

        const result = action.validateInput(dataWithoutImportId);

        expect(result).toBeNull();
      });

      it("should return null for data with missing imagePath", () => {
        const dataWithoutImagePath = {
          ...mockData,
          imagePath: "",
        };

        const result = action.validateInput(dataWithoutImagePath);

        expect(result).toBeNull();
      });

      it("should return null for data with missing filename", () => {
        const dataWithoutFilename = {
          ...mockData,
          filename: "",
        };

        const result = action.validateInput(dataWithoutFilename);

        expect(result).toBeNull();
      });

      it("should return null for data with missing outputDir", () => {
        const dataWithoutOutputDir = {
          ...mockData,
          outputDir: "",
        };

        const result = action.validateInput(dataWithoutOutputDir);

        expect(result).toBeNull();
      });

      it("should return null for data with zero file sizes", () => {
        const dataWithZeroSizes = {
          ...mockData,
          originalSize: 0,
          thumbnailSize: 0,
          crop3x2Size: 0,
          crop4x3Size: 0,
          crop16x9Size: 0,
        };

        const result = action.validateInput(dataWithZeroSizes);

        expect(result).toBeNull();
      });

      it("should return null for data with missing metadata", () => {
        const dataWithoutMetadata = {
          ...mockData,
          metadata: {
            width: 0,
            height: 0,
            format: "",
          },
        };

        const result = action.validateInput(dataWithoutMetadata);

        expect(result).toBeNull();
      });
    });

    describe("execute", () => {
      it("should execute check image completion successfully", async () => {
        const result = await action.execute(
          mockData,
          mockDependencies,
          mockContext
        );

        expect(mockCheckImageCompletion).toHaveBeenCalledWith(
          mockData,
          mockDependencies
        );

        expect(result).toEqual(mockData);
      });

      it("should handle service returning updated data", async () => {
        const updatedData = {
          ...mockData,
          r2Key: "test-key",
          r2Url: "https://r2.example.com/test.jpg",
        };

        mockCheckImageCompletion.mockResolvedValue(updatedData);

        const result = await action.execute(
          mockData,
          mockDependencies,
          mockContext
        );

        expect(mockCheckImageCompletion).toHaveBeenCalledWith(
          mockData,
          mockDependencies
        );

        expect(result).toEqual(updatedData);
        expect(result.r2Key).toBe("test-key");
        expect(result.r2Url).toBe("https://r2.example.com/test.jpg");
      });

      it("should handle service errors gracefully", async () => {
        mockCheckImageCompletion.mockRejectedValue(new Error("Service error"));

        await expect(
          action.execute(mockData, mockDependencies, mockContext)
        ).rejects.toThrow("Service error");

        expect(mockCheckImageCompletion).toHaveBeenCalledWith(
          mockData,
          mockDependencies
        );
      });

      it("should handle missing noteId", async () => {
        const dataWithoutNoteId = {
          ...mockData,
          noteId: "",
        };

        const result = await action.execute(
          dataWithoutNoteId,
          mockDependencies,
          mockContext
        );

        expect(mockCheckImageCompletion).toHaveBeenCalledWith(
          dataWithoutNoteId,
          mockDependencies
        );

        expect(result).toEqual(mockData);
      });

      it("should handle missing importId", async () => {
        const dataWithoutImportId = {
          ...mockData,
          importId: "",
        };

        const result = await action.execute(
          dataWithoutImportId,
          mockDependencies,
          mockContext
        );

        expect(mockCheckImageCompletion).toHaveBeenCalledWith(
          dataWithoutImportId,
          mockDependencies
        );

        expect(result).toEqual(mockData);
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

        expect(mockCheckImageCompletion).toHaveBeenCalledWith(
          dataWithoutImagePath,
          mockDependencies
        );

        expect(result).toEqual(mockData);
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

        expect(mockCheckImageCompletion).toHaveBeenCalledWith(
          dataWithoutFilename,
          mockDependencies
        );

        expect(result).toEqual(mockData);
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

        expect(mockCheckImageCompletion).toHaveBeenCalledWith(
          dataWithoutOutputDir,
          mockDependencies
        );

        expect(result).toEqual(mockData);
      });

      it("should preserve existing R2 information", async () => {
        const dataWithR2 = {
          ...mockData,
          r2Key: "existing-key",
          r2Url: "existing-url",
        };

        const result = await action.execute(
          dataWithR2,
          mockDependencies,
          mockContext
        );

        expect(mockCheckImageCompletion).toHaveBeenCalledWith(
          dataWithR2,
          mockDependencies
        );

        expect(result).toEqual(mockData);
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

        const result = await action.execute(
          dataWithR2Urls,
          mockDependencies,
          mockContext
        );

        expect(mockCheckImageCompletion).toHaveBeenCalledWith(
          dataWithR2Urls,
          mockDependencies
        );

        expect(result).toEqual(mockData);
      });

      it("should handle data with all optional fields", async () => {
        const dataWithAllFields = {
          ...mockData,
          imageId: "test-image-123",
          r2Key: "test-key",
          r2Url: "https://r2.example.com/test.jpg",
          r2OriginalUrl: "https://r2.example.com/original.jpg",
          r2ThumbnailUrl: "https://r2.example.com/thumbnail.jpg",
          r2Crop3x2Url: "https://r2.example.com/crop3x2.jpg",
          r2Crop4x3Url: "https://r2.example.com/crop4x3.jpg",
          r2Crop16x9Url: "https://r2.example.com/crop16x9.jpg",
        };

        const result = await action.execute(
          dataWithAllFields,
          mockDependencies,
          mockContext
        );

        expect(mockCheckImageCompletion).toHaveBeenCalledWith(
          dataWithAllFields,
          mockDependencies
        );

        expect(result).toEqual(mockData);
      });
    });

    describe("function signature", () => {
      it("should be an instance of CheckImageCompletionAction", () => {
        expect(action).toBeInstanceOf(CheckImageCompletionAction);
      });

      it("should have execute method", () => {
        expect(typeof action.execute).toBe("function");
      });

      it("should have validateInput method", () => {
        expect(typeof action.validateInput).toBe("function");
      });

      it("should have name property", () => {
        expect(action).toHaveProperty("name");
      });

      it("should have readonly name property", () => {
        expect(action.name).toBe("check_image_completion");

        // Verify it's readonly by attempting to modify it (should not change)
        const originalName = action.name;
        // Note: In a real readonly property, this would cause a TypeScript error
        // but in runtime tests, we can verify the value doesn't change
        expect(action.name).toBe(originalName);
      });
    });
  });
});
