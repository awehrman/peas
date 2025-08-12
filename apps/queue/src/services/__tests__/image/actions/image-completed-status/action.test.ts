import { beforeEach, describe, expect, it, vi } from "vitest";

import { createMockLogger, createMockActionContext } from "../../../../../test-utils/helpers";
import type { ActionContext } from "../../../../../workers/core/types";
import type { ImageJobData, ImageWorkerDependencies } from "../../../../../workers/image/types";
import { ImageCompletedStatusAction } from "../../../../image/actions/image-completed-status/action";

// Mock the service function
vi.mock("../../../../image/actions/image-completed-status/service", () => ({
  updateImageCompletedStatus: vi.fn(),
}));

describe("ImageCompletedStatusAction", () => {
  let action: ImageCompletedStatusAction;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockDependencies: ImageWorkerDependencies;
  let mockContext: ActionContext;
  let mockData: ImageJobData;
  let mockUpdateImageCompletedStatus: ReturnType<typeof vi.fn>;
  let mockStatusBroadcaster: { addStatusEventAndBroadcast: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Get the mocked service function
    const serviceModule = await import("../../../../image/actions/image-completed-status/service");
    const { updateImageCompletedStatus } = vi.mocked(serviceModule);
    mockUpdateImageCompletedStatus = updateImageCompletedStatus;

    // Create mock logger
    mockLogger = createMockLogger();

    // Create mock status broadcaster
    mockStatusBroadcaster = {
      addStatusEventAndBroadcast: vi.fn(),
    };

    // Create mock dependencies
    mockDependencies = {
      serviceContainer: {
        logger: mockLogger,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      logger: mockLogger,
      statusBroadcaster: mockStatusBroadcaster,
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
    action = new ImageCompletedStatusAction();

    // Setup default mock implementation
    mockUpdateImageCompletedStatus.mockResolvedValue(mockData);
  });

  describe("constructor and properties", () => {
    it("should have the correct action name", () => {
      expect(action.name).toBe("image_completed_status");
    });

    it("should be an instance of ImageCompletedStatusAction", () => {
      expect(action).toBeInstanceOf(ImageCompletedStatusAction);
    });
  });

  describe("execute", () => {
    it("should call updateImageCompletedStatus service with correct parameters", async () => {
      const result = await action.execute(mockData, mockDependencies, mockContext);

      // Verify service function was called with correct parameters
      expect(mockUpdateImageCompletedStatus).toHaveBeenCalledTimes(1);
      expect(mockUpdateImageCompletedStatus).toHaveBeenCalledWith(
        mockData,
        mockDependencies.serviceContainer,
        mockDependencies.logger,
        mockDependencies.statusBroadcaster
      );

      // Verify result is returned
      expect(result).toEqual(mockData);
    });

    it("should return the result from updateImageCompletedStatus service", async () => {
      const modifiedData = { ...mockData, processed: true };
      mockUpdateImageCompletedStatus.mockResolvedValue(modifiedData);

      const result = await action.execute(mockData, mockDependencies, mockContext);

      expect(result).toEqual(modifiedData);
    });

    it("should handle service function errors", async () => {
      const error = new Error("Service error");
      mockUpdateImageCompletedStatus.mockRejectedValue(error);

      await expect(action.execute(mockData, mockDependencies, mockContext)).rejects.toThrow(
        "Service error"
      );

      // Verify service function was still called
      expect(mockUpdateImageCompletedStatus).toHaveBeenCalledTimes(1);
    });

    it("should pass through all parameters correctly", async () => {
      const customData = { ...mockData, noteId: "custom-note" };
      const customDependencies = { ...mockDependencies };
      const customContext = { ...mockContext, jobId: "custom-job" };

      await action.execute(customData, customDependencies, customContext);

      expect(mockUpdateImageCompletedStatus).toHaveBeenCalledWith(
        customData,
        customDependencies.serviceContainer,
        customDependencies.logger,
        customDependencies.statusBroadcaster
      );
    });

    it("should work with minimal data", async () => {
      const minimalData = {
        noteId: "minimal-note",
        importId: "minimal-import",
        imageId: "minimal-image",
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

      expect(mockUpdateImageCompletedStatus).toHaveBeenCalledWith(
        minimalData,
        mockDependencies.serviceContainer,
        mockDependencies.logger,
        mockDependencies.statusBroadcaster
      );
    });

    it("should work with data containing optional fields", async () => {
      const dataWithOptionals = {
        ...mockData,
        r2Key: "optional-r2-key",
        r2Url: "https://optional-r2-url.com",
        r2OriginalUrl: "https://optional-original-url.com",
        r2ThumbnailUrl: "https://optional-thumbnail-url.com",
        r2Crop3x2Url: "https://optional-crop3x2-url.com",
        r2Crop4x3Url: "https://optional-crop4x3-url.com",
        r2Crop16x9Url: "https://optional-crop16x9-url.com",
      };

      await action.execute(dataWithOptionals, mockDependencies, mockContext);

      expect(mockUpdateImageCompletedStatus).toHaveBeenCalledWith(
        dataWithOptionals,
        mockDependencies.serviceContainer,
        mockDependencies.logger,
        mockDependencies.statusBroadcaster
      );
    });

    it("should work with dependencies without statusBroadcaster", async () => {
      const dependenciesWithoutBroadcaster = {
        ...mockDependencies,
        statusBroadcaster: undefined,
      };

      await action.execute(mockData, dependenciesWithoutBroadcaster, mockContext);

      expect(mockUpdateImageCompletedStatus).toHaveBeenCalledWith(
        mockData,
        dependenciesWithoutBroadcaster.serviceContainer,
        dependenciesWithoutBroadcaster.logger,
        undefined
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
        contextName: "image_completed_status",
        startMessage: "Image completed status update started",
        completionMessage: "Image completed status update completed",
      });

      // Verify the serviceCall function calls updateImageCompletedStatus
      const callArgs = executeServiceActionSpy.mock.calls[0]?.[0];
      if (callArgs && typeof callArgs === 'object' && 'serviceCall' in callArgs) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (callArgs as any).serviceCall();
        expect(mockUpdateImageCompletedStatus).toHaveBeenCalledWith(
          mockData,
          mockDependencies.serviceContainer,
          mockDependencies.logger,
          mockDependencies.statusBroadcaster
        );
      }
    });

    it("should handle executeServiceAction errors", async () => {
      const error = new Error("Service action error");
      mockUpdateImageCompletedStatus.mockRejectedValue(error);

      await expect(action.execute(mockData, mockDependencies, mockContext)).rejects.toThrow(
        "Service action error"
      );
    });
  });

  describe("status broadcaster integration", () => {
    it("should pass statusBroadcaster to service function", async () => {
      const customBroadcaster = {
        addStatusEventAndBroadcast: vi.fn().mockResolvedValue({}),
      };

      const customDependencies = {
        ...mockDependencies,
        statusBroadcaster: customBroadcaster,
      };

      await action.execute(mockData, customDependencies, mockContext);

      expect(mockUpdateImageCompletedStatus).toHaveBeenCalledWith(
        mockData,
        customDependencies.serviceContainer,
        customDependencies.logger,
        customBroadcaster
      );
    });

    it("should handle null statusBroadcaster", async () => {
      const dependenciesWithNullBroadcaster = {
        ...mockDependencies,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        statusBroadcaster: null as any,
      };

      await action.execute(mockData, dependenciesWithNullBroadcaster, mockContext);

      expect(mockUpdateImageCompletedStatus).toHaveBeenCalledWith(
        mockData,
        dependenciesWithNullBroadcaster.serviceContainer,
        dependenciesWithNullBroadcaster.logger,
        null
      );
    });
  });
});
