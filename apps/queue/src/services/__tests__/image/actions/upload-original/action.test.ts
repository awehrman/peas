import { beforeEach, describe, expect, it, vi } from "vitest";

import { createMockLogger } from "../../../../../test-utils/helpers";
import type { ImageJobData, ImageWorkerDependencies } from "../../../../../workers/image/types";
import type { ActionContext } from "../../../../../workers/core/types";
import { UploadOriginalAction } from "../../../../image/actions/upload-original/action";

// Mock the service
vi.mock("../../../../image/actions/upload-original/service", () => ({
  uploadOriginal: vi.fn(),
}));

describe("Upload Original Action", () => {
  let action: UploadOriginalAction;
  let mockData: ImageJobData;
  let mockDependencies: ImageWorkerDependencies;
  let mockContext: ActionContext;
  let mockUploadOriginal: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Get mocked function
    const uploadOriginalModule = vi.mocked(
      await import("../../../../image/actions/upload-original/service")
    );
    mockUploadOriginal = vi.mocked(uploadOriginalModule.uploadOriginal);

    // Create action instance
    action = new UploadOriginalAction();

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
      operation: "upload-original",
      startTime: Date.now(),
      workerName: "test-worker",
      attemptNumber: 1,
    };

    // Setup default mock response
    mockUploadOriginal.mockResolvedValue({
      ...mockData,
      r2Key: "originals/test-import-456/image.jpg",
      r2Url: "https://r2.example.com/originals/test-import-456/image.jpg",
    });
  });

  describe("UploadOriginalAction", () => {
    describe("name", () => {
      it("should have correct action name", () => {
        expect(action.name).toBe("upload_original");
      });
    });

    describe("execute", () => {
      it("should execute upload original successfully", async () => {
        const result = await action.execute(mockData, mockDependencies, mockContext);

        expect(mockUploadOriginal).toHaveBeenCalledWith(
          mockData,
          mockDependencies.serviceContainer,
          mockDependencies.logger
        );

        expect(result).toEqual({
          ...mockData,
          r2Key: "originals/test-import-456/image.jpg",
          r2Url: "https://r2.example.com/originals/test-import-456/image.jpg",
        });
      });

      it("should handle service returning undefined R2 values", async () => {
        mockUploadOriginal.mockResolvedValue({
          ...mockData,
          r2Key: undefined,
          r2Url: undefined,
        });

        const result = await action.execute(mockData, mockDependencies, mockContext);

        expect(result).toEqual({
          ...mockData,
          r2Key: undefined,
          r2Url: undefined,
        });
      });

      it("should handle service returning partial R2 values", async () => {
        mockUploadOriginal.mockResolvedValue({
          ...mockData,
          r2Key: "originals/test-import-456/image.jpg",
          r2Url: undefined,
        });

        const result = await action.execute(mockData, mockDependencies, mockContext);

        expect(result).toEqual({
          ...mockData,
          r2Key: "originals/test-import-456/image.jpg",
          r2Url: undefined,
        });
      });

      it("should preserve existing R2 values if service doesn't return them", async () => {
        const dataWithR2 = {
          ...mockData,
          r2Key: "existing-key",
          r2Url: "existing-url",
        };

        mockUploadOriginal.mockResolvedValue({
          ...dataWithR2,
          // Service doesn't return R2 values
        });

        const result = await action.execute(dataWithR2, mockDependencies, mockContext);

        expect(result).toEqual({
          ...dataWithR2,
          r2Key: "existing-key",
          r2Url: "existing-url",
        });
      });

      it("should handle service errors gracefully", async () => {
        mockUploadOriginal.mockRejectedValue(new Error("Service error"));

        await expect(
          action.execute(mockData, mockDependencies, mockContext)
        ).rejects.toThrow("Service error");

        expect(mockUploadOriginal).toHaveBeenCalledWith(
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

        const result = await action.execute(dataWithoutNoteId, mockDependencies, mockContext);

        expect(mockUploadOriginal).toHaveBeenCalledWith(
          dataWithoutNoteId,
          mockDependencies.serviceContainer,
          mockDependencies.logger
        );

        expect(result).toEqual({
          ...dataWithoutNoteId,
          r2Key: "originals/test-import-456/image.jpg",
          r2Url: "https://r2.example.com/originals/test-import-456/image.jpg",
        });
      });

      it("should handle missing importId", async () => {
        const dataWithoutImportId = {
          ...mockData,
          importId: "",
        };

        const result = await action.execute(dataWithoutImportId, mockDependencies, mockContext);

        expect(mockUploadOriginal).toHaveBeenCalledWith(
          dataWithoutImportId,
          mockDependencies.serviceContainer,
          mockDependencies.logger
        );

        expect(result).toEqual({
          ...dataWithoutImportId,
          r2Key: "originals/test-import-456/image.jpg",
          r2Url: "https://r2.example.com/originals/test-import-456/image.jpg",
        });
      });

      it("should handle missing imagePath", async () => {
        const dataWithoutImagePath = {
          ...mockData,
          imagePath: "",
        };

        const result = await action.execute(dataWithoutImagePath, mockDependencies, mockContext);

        expect(mockUploadOriginal).toHaveBeenCalledWith(
          dataWithoutImagePath,
          mockDependencies.serviceContainer,
          mockDependencies.logger
        );

        expect(result).toEqual({
          ...dataWithoutImagePath,
          r2Key: "originals/test-import-456/image.jpg",
          r2Url: "https://r2.example.com/originals/test-import-456/image.jpg",
        });
      });

      it("should handle missing filename", async () => {
        const dataWithoutFilename = {
          ...mockData,
          filename: "",
        };

        const result = await action.execute(dataWithoutFilename, mockDependencies, mockContext);

        expect(mockUploadOriginal).toHaveBeenCalledWith(
          dataWithoutFilename,
          mockDependencies.serviceContainer,
          mockDependencies.logger
        );

        expect(result).toEqual({
          ...dataWithoutFilename,
          r2Key: "originals/test-import-456/image.jpg",
          r2Url: "https://r2.example.com/originals/test-import-456/image.jpg",
        });
      });
    });

    describe("function signature", () => {
      it("should be an instance of UploadOriginalAction", () => {
        expect(action).toBeInstanceOf(UploadOriginalAction);
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
