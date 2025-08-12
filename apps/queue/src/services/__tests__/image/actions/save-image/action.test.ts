import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createMockActionContext,
  createMockLogger,
} from "../../../../../test-utils/helpers";
import type { ActionContext } from "../../../../../workers/core/types";
import type {
  ImageJobData,
  ImageWorkerDependencies,
} from "../../../../../workers/image/types";
import { SaveImageAction } from "../../../../image/actions/save-image/action";

// Mock the service function
vi.mock("../../../../image/actions/save-image/service", () => ({
  saveImage: vi.fn(),
}));

describe("SaveImageAction", () => {
  let action: SaveImageAction;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockDependencies: ImageWorkerDependencies;
  let mockContext: ActionContext;
  let mockData: ImageJobData;
  let mockSaveImage: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Get the mocked service function
    const serviceModule = await import(
      "../../../../image/actions/save-image/service"
    );
    const { saveImage } = vi.mocked(serviceModule);
    mockSaveImage = saveImage;

    // Create mock logger
    mockLogger = createMockLogger();

    // Create mock dependencies
    mockDependencies = {
      serviceContainer: {
        logger: mockLogger,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      logger: mockLogger,
    };

    // Create mock context
    mockContext = createMockActionContext();

    // Create mock data
    mockData = {
      noteId: "test-note-123",
      importId: "test-import-456",
      imageId: "test-image-789",
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

    // Create action instance
    action = new SaveImageAction();

    // Setup default mock implementation
    mockSaveImage.mockResolvedValue({
      ...mockData,
      imageId: "saved-image-123",
    });
  });

  describe("SaveImageAction", () => {
    describe("name", () => {
      it("should have correct action name", () => {
        expect(action.name).toBe("save_image");
      });
    });

    describe("execute", () => {
      it("should execute save image successfully", async () => {
        const result = await action.execute(
          mockData,
          mockDependencies,
          mockContext
        );

        expect(mockSaveImage).toHaveBeenCalledWith(
          mockData,
          mockDependencies.serviceContainer,
          mockDependencies.logger
        );

        expect(result).toEqual({
          ...mockData,
          imageId: "saved-image-123",
        });
      });

      it("should handle service returning updated imageId", async () => {
        mockSaveImage.mockResolvedValue({
          ...mockData,
          imageId: "new-saved-image-456",
        });

        const result = await action.execute(
          mockData,
          mockDependencies,
          mockContext
        );

        expect(result.imageId).toBe("new-saved-image-456");
      });

      it("should handle service returning data with R2 URLs", async () => {
        const dataWithR2Urls = {
          ...mockData,
          r2OriginalUrl: "https://r2.example.com/original.jpg",
          r2ThumbnailUrl: "https://r2.example.com/thumbnail.jpg",
          r2Crop3x2Url: "https://r2.example.com/crop3x2.jpg",
          r2Crop4x3Url: "https://r2.example.com/crop4x3.jpg",
          r2Crop16x9Url: "https://r2.example.com/crop16x9.jpg",
        };

        mockSaveImage.mockResolvedValue({
          ...dataWithR2Urls,
          imageId: "saved-image-123",
        });

        const result = await action.execute(
          mockData,
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

      it("should handle service errors gracefully", async () => {
        mockSaveImage.mockRejectedValue(new Error("Save failed"));

        await expect(
          action.execute(mockData, mockDependencies, mockContext)
        ).rejects.toThrow("Save failed");

        expect(mockSaveImage).toHaveBeenCalledWith(
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

        // Mock the service to return the modified data
        mockSaveImage.mockResolvedValue({
          ...dataWithoutNoteId,
          imageId: "saved-image-123",
        });

        const result = await action.execute(
          dataWithoutNoteId,
          mockDependencies,
          mockContext
        );

        expect(mockSaveImage).toHaveBeenCalledWith(
          dataWithoutNoteId,
          mockDependencies.serviceContainer,
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
        mockSaveImage.mockResolvedValue({
          ...dataWithoutImportId,
          imageId: "saved-image-123",
        });

        const result = await action.execute(
          dataWithoutImportId,
          mockDependencies,
          mockContext
        );

        expect(mockSaveImage).toHaveBeenCalledWith(
          dataWithoutImportId,
          mockDependencies.serviceContainer,
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
        mockSaveImage.mockResolvedValue({
          ...dataWithoutImagePath,
          imageId: "saved-image-123",
        });

        const result = await action.execute(
          dataWithoutImagePath,
          mockDependencies,
          mockContext
        );

        expect(mockSaveImage).toHaveBeenCalledWith(
          dataWithoutImagePath,
          mockDependencies.serviceContainer,
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
        mockSaveImage.mockResolvedValue({
          ...dataWithoutFilename,
          imageId: "saved-image-123",
        });

        const result = await action.execute(
          dataWithoutFilename,
          mockDependencies,
          mockContext
        );

        expect(mockSaveImage).toHaveBeenCalledWith(
          dataWithoutFilename,
          mockDependencies.serviceContainer,
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
        mockSaveImage.mockResolvedValue({
          ...dataWithoutOutputDir,
          imageId: "saved-image-123",
        });

        const result = await action.execute(
          dataWithoutOutputDir,
          mockDependencies,
          mockContext
        );

        expect(mockSaveImage).toHaveBeenCalledWith(
          dataWithoutOutputDir,
          mockDependencies.serviceContainer,
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
        mockSaveImage.mockResolvedValue({
          ...dataWithR2,
          imageId: "saved-image-123",
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
        mockSaveImage.mockResolvedValue({
          ...dataWithR2Urls,
          imageId: "saved-image-123",
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

      it("should work with minimal data", async () => {
        const minimalData = {
          noteId: "minimal-note",
          importId: "minimal-import",
          imagePath: "/minimal/image.jpg",
          outputDir: "/minimal/output",
          filename: "minimal.jpg",
          originalPath: "/minimal/original.jpg",
          thumbnailPath: "/minimal/thumbnail.jpg",
          crop3x2Path: "/minimal/crop3x2.jpg",
          crop4x3Path: "/minimal/crop4x3.jpg",
          crop16x9Path: "/minimal/crop16x9.jpg",
          originalSize: 100,
          thumbnailSize: 50,
          crop3x2Size: 75,
          crop4x3Size: 75,
          crop16x9Size: 75,
          metadata: {
            width: 100,
            height: 100,
            format: "png",
          },
        };

        // Mock the service to return the minimal data
        mockSaveImage.mockResolvedValue({
          ...minimalData,
          imageId: "saved-image-123",
        });

        const result = await action.execute(
          minimalData,
          mockDependencies,
          mockContext
        );

        expect(mockSaveImage).toHaveBeenCalledWith(
          minimalData,
          mockDependencies.serviceContainer,
          mockDependencies.logger
        );

        expect(result).toEqual({
          ...minimalData,
          imageId: "saved-image-123",
        });
      });
    });

    describe("function signature", () => {
      it("should be an instance of SaveImageAction", () => {
        expect(action).toBeInstanceOf(SaveImageAction);
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
          contextName: "image_save",
          startMessage: "Image save started",
          completionMessage: "Image save completed",
        });

        // Verify the serviceCall function calls saveImage
        const callArgs = executeServiceActionSpy.mock.calls[0]?.[0];
        if (
          callArgs &&
          typeof callArgs === "object" &&
          "serviceCall" in callArgs
        ) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (callArgs as any).serviceCall();
          expect(mockSaveImage).toHaveBeenCalledWith(
            mockData,
            mockDependencies.serviceContainer,
            mockDependencies.logger
          );
        }
      });

      it("should handle executeServiceAction errors", async () => {
        const error = new Error("Service action error");
        mockSaveImage.mockRejectedValue(error);

        await expect(
          action.execute(mockData, mockDependencies, mockContext)
        ).rejects.toThrow("Service action error");
      });
    });
  });
});
