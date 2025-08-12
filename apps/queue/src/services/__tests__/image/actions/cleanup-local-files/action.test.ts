import { beforeEach, describe, expect, it, vi } from "vitest";

import { createMockLogger, createMockActionContext } from "../../../../../test-utils/helpers";
import type { ActionContext } from "../../../../../workers/core/types";
import type { ImageJobData, ImageWorkerDependencies } from "../../../../../workers/image/types";
import { CleanupLocalFilesAction } from "../../../../image/actions/cleanup-local-files/action";

// Mock the service function
vi.mock("../../../../image/actions/cleanup-local-files/service", () => ({
  cleanupLocalFiles: vi.fn(),
}));

describe("CleanupLocalFilesAction", () => {
  let action: CleanupLocalFilesAction;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockDependencies: ImageWorkerDependencies;
  let mockContext: ActionContext;
  let mockData: ImageJobData;
  let mockCleanupLocalFiles: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Get the mocked service function
    const serviceModule = await import("../../../../image/actions/cleanup-local-files/service");
    const { cleanupLocalFiles } = vi.mocked(serviceModule);
    mockCleanupLocalFiles = cleanupLocalFiles;

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
    action = new CleanupLocalFilesAction();

    // Setup default mock implementation
    mockCleanupLocalFiles.mockResolvedValue(mockData);
  });

  describe("constructor and properties", () => {
    it("should have the correct action name", () => {
      expect(action.name).toBe("cleanup_local_files");
    });

    it("should be an instance of CleanupLocalFilesAction", () => {
      expect(action).toBeInstanceOf(CleanupLocalFilesAction);
    });
  });

  describe("execute", () => {
    it("should call cleanupLocalFiles service with correct parameters", async () => {
      const result = await action.execute(mockData, mockDependencies, mockContext);

      // Verify service function was called with correct parameters
      expect(mockCleanupLocalFiles).toHaveBeenCalledTimes(1);
      expect(mockCleanupLocalFiles).toHaveBeenCalledWith(
        mockData,
        mockDependencies.serviceContainer,
        mockDependencies.logger
      );

      // Verify result is returned
      expect(result).toEqual(mockData);
    });

    it("should return the result from cleanupLocalFiles service", async () => {
      const modifiedData = { ...mockData, processed: true };
      mockCleanupLocalFiles.mockResolvedValue(modifiedData);

      const result = await action.execute(mockData, mockDependencies, mockContext);

      expect(result).toEqual(modifiedData);
    });

    it("should handle service function errors", async () => {
      const error = new Error("Service error");
      mockCleanupLocalFiles.mockRejectedValue(error);

      await expect(action.execute(mockData, mockDependencies, mockContext)).rejects.toThrow(
        "Service error"
      );

      // Verify service function was still called
      expect(mockCleanupLocalFiles).toHaveBeenCalledTimes(1);
    });

    it("should pass through all parameters correctly", async () => {
      const customData = { ...mockData, noteId: "custom-note" };
      const customDependencies = { ...mockDependencies };
      const customContext = { ...mockContext, jobId: "custom-job" };

      await action.execute(customData, customDependencies, customContext);

      expect(mockCleanupLocalFiles).toHaveBeenCalledWith(
        customData,
        customDependencies.serviceContainer,
        customDependencies.logger
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

      await action.execute(minimalData, mockDependencies, mockContext);

      expect(mockCleanupLocalFiles).toHaveBeenCalledWith(
        minimalData,
        mockDependencies.serviceContainer,
        mockDependencies.logger
      );
    });

    it("should work with data containing optional fields", async () => {
      const dataWithOptionals = {
        ...mockData,
        imageId: "optional-image-id",
        r2Key: "optional-r2-key",
        r2Url: "https://optional-r2-url.com",
        r2OriginalUrl: "https://optional-original-url.com",
        r2ThumbnailUrl: "https://optional-thumbnail-url.com",
        r2Crop3x2Url: "https://optional-crop3x2-url.com",
        r2Crop4x3Url: "https://optional-crop4x3-url.com",
        r2Crop16x9Url: "https://optional-crop16x9-url.com",
      };

      await action.execute(dataWithOptionals, mockDependencies, mockContext);

      expect(mockCleanupLocalFiles).toHaveBeenCalledWith(
        dataWithOptionals,
        mockDependencies.serviceContainer,
        mockDependencies.logger
      );
    });
  });

  describe("executeServiceAction integration", () => {
    it("should use executeServiceAction with correct configuration", async () => {
      // Spy on the executeServiceAction method
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const executeServiceActionSpy = vi.spyOn(action, "executeServiceAction" as any);

      await action.execute(mockData, mockDependencies, mockContext);

      expect(executeServiceActionSpy).toHaveBeenCalledTimes(1);
      expect(executeServiceActionSpy).toHaveBeenCalledWith({
        data: mockData,
        deps: mockDependencies,
        context: mockContext,
        serviceCall: expect.any(Function),
        contextName: "cleanup_local_files",
        startMessage: "Cleanup local files started",
        completionMessage: "Cleanup local files completed",
      });

      // Verify the serviceCall function calls cleanupLocalFiles
      const callArgs = executeServiceActionSpy.mock.calls[0]?.[0];
      if (callArgs && typeof callArgs === 'object' && 'serviceCall' in callArgs) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (callArgs as any).serviceCall();
      }
      expect(mockCleanupLocalFiles).toHaveBeenCalledWith(
        mockData,
        mockDependencies.serviceContainer,
        mockDependencies.logger
      );
    });

    it("should handle executeServiceAction errors", async () => {
      const error = new Error("Service action error");
      mockCleanupLocalFiles.mockRejectedValue(error);

      await expect(action.execute(mockData, mockDependencies, mockContext)).rejects.toThrow(
        "Service action error"
      );
    });
  });
});
