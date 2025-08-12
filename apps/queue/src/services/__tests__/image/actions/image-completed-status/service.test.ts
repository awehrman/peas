import { beforeEach, describe, expect, it, vi } from "vitest";

import type { IServiceContainer } from "../../../../../services/container";
import {
  createMockLogger,
  createMockServiceContainer,
} from "../../../../../test-utils/helpers";
import type { ImageJobData } from "../../../../../workers/image/types";
import { updateImageCompletedStatus } from "../../../../image/actions/image-completed-status/service";

describe("updateImageCompletedStatus", () => {
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockServiceContainer: IServiceContainer;
  let mockData: ImageJobData;
  let mockPrisma: { image: { update: ReturnType<typeof vi.fn> } };
  let mockStatusBroadcaster: { addStatusEventAndBroadcast: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock logger
    mockLogger = createMockLogger();

    // Create mock Prisma client
    mockPrisma = {
      image: {
        update: vi.fn(),
      },
    };

    // Create mock status broadcaster
    mockStatusBroadcaster = {
      addStatusEventAndBroadcast: vi.fn(),
    };

    // Create mock service container

    mockServiceContainer = {
      ...createMockServiceContainer(),
      database: {
        prisma: mockPrisma,
      },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

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

    // Setup default mock implementations
    mockPrisma.image.update.mockResolvedValue({
      id: "test-image-789",
      processingStatus: "COMPLETED",
      processingError: null,
    });
    mockStatusBroadcaster.addStatusEventAndBroadcast.mockResolvedValue({});
  });

  describe("successful scenarios", () => {
    it("should update image status to completed and return data", async () => {
      const result = await updateImageCompletedStatus(
        mockData,
        mockServiceContainer,
        mockLogger
      );

      // Verify database update was called correctly
      expect(mockPrisma.image.update).toHaveBeenCalledTimes(1);
      expect(mockPrisma.image.update).toHaveBeenCalledWith({
        where: { id: "test-image-789" },
        data: {
          processingStatus: "COMPLETED",
          processingError: null,
        },
      });

      // Verify logging
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[IMAGE_COMPLETED_STATUS] Updating completion status for note: test-note-123"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[IMAGE_COMPLETED_STATUS] Image status updated: test-image-789"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[IMAGE_COMPLETED_STATUS] Processing status: COMPLETED"
      );

      // Verify return value
      expect(result).toEqual(mockData);
    });

    it("should broadcast completion when statusBroadcaster is available", async () => {
      const result = await updateImageCompletedStatus(
        mockData,
        mockServiceContainer,
        mockLogger,
        mockStatusBroadcaster
      );

      // Verify status broadcaster was called
      expect(
        mockStatusBroadcaster.addStatusEventAndBroadcast
      ).toHaveBeenCalledTimes(1);
      expect(
        mockStatusBroadcaster.addStatusEventAndBroadcast
      ).toHaveBeenCalledWith({
        importId: "test-import-456",
        noteId: "test-note-123",
        status: "COMPLETED",
        message: "Added image!",
        context: "image_processing",
        indentLevel: 1,
        metadata: {
          imageId: "test-image-789",
          processingStatus: "COMPLETED",
          originalSize: 1024,
          thumbnailSize: 512,
          metadata: {
            width: 1920,
            height: 1080,
            format: "jpeg",
          },
        },
      });

      // Verify logging for broadcasting
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[IMAGE_COMPLETED_STATUS] StatusBroadcaster is available, broadcasting completion"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[IMAGE_COMPLETED_STATUS] Successfully broadcasted image completion for image test-image-789"
      );

      expect(result).toEqual(mockData);
    });

    it("should handle missing statusBroadcaster gracefully", async () => {
      const result = await updateImageCompletedStatus(
        mockData,
        mockServiceContainer,
        mockLogger,
        undefined
      );

      // Verify status broadcaster was not called
      expect(
        mockStatusBroadcaster.addStatusEventAndBroadcast
      ).not.toHaveBeenCalled();

      // Verify logging for missing broadcaster
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[IMAGE_COMPLETED_STATUS] StatusBroadcaster is not available"
      );

      expect(result).toEqual(mockData);
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

      const result = await updateImageCompletedStatus(
        minimalData,
        mockServiceContainer,
        mockLogger
      );

      expect(mockPrisma.image.update).toHaveBeenCalledWith({
        where: { id: "minimal-image" },
        data: {
          processingStatus: "COMPLETED",
          processingError: null,
        },
      });

      expect(result).toEqual(minimalData);
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

      const result = await updateImageCompletedStatus(
        dataWithOptionals,
        mockServiceContainer,
        mockLogger
      );

      expect(mockPrisma.image.update).toHaveBeenCalledWith({
        where: { id: "test-image-789" },
        data: {
          processingStatus: "COMPLETED",
          processingError: null,
        },
      });

      expect(result).toEqual(dataWithOptionals);
    });
  });

  describe("error handling scenarios", () => {
    it("should handle database update errors", async () => {
      const dbError = new Error("Database connection failed");
      mockPrisma.image.update.mockRejectedValue(dbError);

      await expect(
        updateImageCompletedStatus(mockData, mockServiceContainer, mockLogger)
      ).rejects.toThrow("Database connection failed");

      // Verify error logging
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[IMAGE_COMPLETED_STATUS] Failed to update completion status: Error: Database connection failed"
      );
    });

    it("should handle status broadcaster errors gracefully", async () => {
      const broadcastError = new Error("Broadcast failed");
      mockStatusBroadcaster.addStatusEventAndBroadcast.mockRejectedValue(
        broadcastError
      );

      const result = await updateImageCompletedStatus(
        mockData,
        mockServiceContainer,
        mockLogger,
        mockStatusBroadcaster
      );

      // Verify status broadcaster was called but error was handled
      expect(
        mockStatusBroadcaster.addStatusEventAndBroadcast
      ).toHaveBeenCalledTimes(1);

      // Verify error logging for broadcast failure
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[IMAGE_COMPLETED_STATUS] Failed to broadcast image completion: Error: Broadcast failed"
      );

      // Verify data is still returned despite broadcast error
      expect(result).toEqual(mockData);
    });

    it("should handle missing imageId", async () => {
      const dataWithoutImageId = { ...mockData, imageId: undefined };

      const result = await updateImageCompletedStatus(
        dataWithoutImageId,
        mockServiceContainer,
        mockLogger
      );

      // Verify database was called with undefined id
      expect(mockPrisma.image.update).toHaveBeenCalledWith({
        where: { id: undefined },
        data: {
          processingStatus: "COMPLETED",
          processingError: null,
        },
      });

      expect(result).toEqual(dataWithoutImageId);
    });

    it("should handle null imageId", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dataWithNullImageId = { ...mockData, imageId: null as any };

      const result = await updateImageCompletedStatus(
        dataWithNullImageId,
        mockServiceContainer,
        mockLogger
      );

      // Verify database was called with null id
      expect(mockPrisma.image.update).toHaveBeenCalledWith({
        where: { id: null },
        data: {
          processingStatus: "COMPLETED",
          processingError: null,
        },
      });

      expect(result).toEqual(dataWithNullImageId);
    });

    it("should handle empty string imageId", async () => {
      const dataWithEmptyImageId = { ...mockData, imageId: "" };

      const result = await updateImageCompletedStatus(
        dataWithEmptyImageId,
        mockServiceContainer,
        mockLogger
      );

      // Verify database was called with empty string id
      expect(mockPrisma.image.update).toHaveBeenCalledWith({
        where: { id: "" },
        data: {
          processingStatus: "COMPLETED",
          processingError: null,
        },
      });

      expect(result).toEqual(dataWithEmptyImageId);
    });
  });

  describe("status broadcaster integration", () => {
    it("should pass correct metadata to status broadcaster", async () => {
      const customData = {
        ...mockData,
        originalSize: 2048,
        thumbnailSize: 1024,
        metadata: {
          width: 3840,
          height: 2160,
          format: "webp",
        },
      };

      await updateImageCompletedStatus(
        customData,
        mockServiceContainer,
        mockLogger,
        mockStatusBroadcaster
      );

      const broadcastCall =
        mockStatusBroadcaster.addStatusEventAndBroadcast.mock.calls[0]?.[0];
      expect(broadcastCall.metadata).toEqual({
        imageId: "test-image-789",
        processingStatus: "COMPLETED",
        originalSize: 2048,
        thumbnailSize: 1024,
        metadata: {
          width: 3840,
          height: 2160,
          format: "webp",
        },
      });
    });

    it("should handle status broadcaster with different return types", async () => {
      const customBroadcaster = {
        addStatusEventAndBroadcast: vi.fn().mockResolvedValue({
          eventId: "event-123",
          timestamp: new Date(),
        }),
      };

      const result = await updateImageCompletedStatus(
        mockData,
        mockServiceContainer,
        mockLogger,
        customBroadcaster
      );

      expect(
        customBroadcaster.addStatusEventAndBroadcast
      ).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockData);
    });
  });

  describe("database integration", () => {
    it("should handle different database response formats", async () => {
      const customDbResponse = {
        id: "test-image-789",
        processingStatus: "COMPLETED",
        processingError: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        noteId: "test-note-123",
        originalImageUrl: "https://example.com/image.jpg",
      };

      mockPrisma.image.update.mockResolvedValue(customDbResponse);

      const result = await updateImageCompletedStatus(
        mockData,
        mockServiceContainer,
        mockLogger
      );

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[IMAGE_COMPLETED_STATUS] Image status updated: test-image-789"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[IMAGE_COMPLETED_STATUS] Processing status: COMPLETED"
      );

      expect(result).toEqual(mockData);
    });

    it("should handle database response with different processing status", async () => {
      const dbResponseWithError = {
        id: "test-image-789",
        processingStatus: "FAILED",
        processingError: "Some error occurred",
      };

      mockPrisma.image.update.mockResolvedValue(dbResponseWithError);

      const result = await updateImageCompletedStatus(
        mockData,
        mockServiceContainer,
        mockLogger
      );

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[IMAGE_COMPLETED_STATUS] Processing status: FAILED"
      );

      expect(result).toEqual(mockData);
    });
  });
});
