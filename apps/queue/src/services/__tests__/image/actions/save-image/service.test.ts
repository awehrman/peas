import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { IServiceContainer } from "../../../../../services/container";
import {
  createMockLogger,
  createMockServiceContainer,
} from "../../../../../test-utils/helpers";
import type { ImageJobData } from "../../../../../workers/image/types";
import { saveImage } from "../../../../image/actions/save-image/service";

// Mock path module
vi.mock("path");

describe("saveImage", () => {
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockServiceContainer: IServiceContainer;
  let mockData: ImageJobData;
  let mockPrisma: { image: { upsert: ReturnType<typeof vi.fn> } };
  let mockPathBasename: ReturnType<typeof vi.fn>;
  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Store original environment
    originalEnv = process.env;

    // Create mock logger
    mockLogger = createMockLogger();

    // Create mock Prisma client
    mockPrisma = {
      image: {
        upsert: vi.fn(),
      },
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

    // Setup default mocks
    mockPathBasename = vi.mocked(path.basename);
    mockPathBasename.mockImplementation((path: string) => {
      if (path.includes("original")) return "original.jpg";
      if (path.includes("thumbnail")) return "thumbnail.jpg";
      if (path.includes("crop3x2")) return "crop3x2.jpg";
      if (path.includes("crop4x3")) return "crop4x3.jpg";
      if (path.includes("crop16x9")) return "crop16x9.jpg";
      return "unknown.jpg";
    });

    mockPrisma.image.upsert.mockResolvedValue({
      id: "saved-image-123",
      originalImageUrl: "/images/original.jpg",
      thumbnailImageUrl: "/images/thumbnail.jpg",
      crop3x2ImageUrl: "/images/crop3x2.jpg",
      crop4x3ImageUrl: "/images/crop4x3.jpg",
      crop16x9ImageUrl: "/images/crop16x9.jpg",
    });

    // Reset environment
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe("successful scenarios", () => {
    it("should save image with local URLs when no R2 URLs are provided", async () => {
      const result = await saveImage(
        mockData,
        mockServiceContainer,
        mockLogger
      );

      // Verify database upsert was called correctly
      expect(mockPrisma.image.upsert).toHaveBeenCalledTimes(1);
      expect(mockPrisma.image.upsert).toHaveBeenCalledWith({
        where: {
          importId: "test-import-456",
        },
        update: {
          originalImageUrl: "/images/original.jpg",
          thumbnailImageUrl: "/images/thumbnail.jpg",
          crop3x2ImageUrl: "/images/crop3x2.jpg",
          crop4x3ImageUrl: "/images/crop4x3.jpg",
          crop16x9ImageUrl: "/images/crop16x9.jpg",
          originalWidth: 1920,
          originalHeight: 1080,
          originalSize: 1024,
          originalFormat: "jpeg",
          processingStatus: "COMPLETED",
          processingError: null,
          noteId: "test-note-123",
        },
        create: {
          originalImageUrl: "/images/original.jpg",
          thumbnailImageUrl: "/images/thumbnail.jpg",
          crop3x2ImageUrl: "/images/crop3x2.jpg",
          crop4x3ImageUrl: "/images/crop4x3.jpg",
          crop16x9ImageUrl: "/images/crop16x9.jpg",
          originalWidth: 1920,
          originalHeight: 1080,
          originalSize: 1024,
          originalFormat: "jpeg",
          processingStatus: "COMPLETED",
          noteId: "test-note-123",
          importId: "test-import-456",
        },
      });

      // Verify logging
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[SAVE_IMAGE] Saving image URLs for note: test-note-123"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[SAVE_IMAGE] Upserting image record for importId: test-import-456"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[SAVE_IMAGE] ✅ Image record upserted with ID: saved-image-123"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[SAVE_IMAGE] Original: /images/original.jpg (local)"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[SAVE_IMAGE] Thumbnail: /images/thumbnail.jpg (local)"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[SAVE_IMAGE] 3:2 crop: /images/crop3x2.jpg (local)"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[SAVE_IMAGE] 4:3 crop: /images/crop4x3.jpg (local)"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[SAVE_IMAGE] 16:9 crop: /images/crop16x9.jpg (local)"
      );

      // Verify return value
      expect(result).toEqual({
        ...mockData,
        imageId: "saved-image-123",
      });
    });

    it("should save image with R2 URLs when provided", async () => {
      const dataWithR2Urls = {
        ...mockData,
        r2OriginalUrl: "https://r2.example.com/original.jpg",
        r2ThumbnailUrl: "https://r2.example.com/thumbnail.jpg",
        r2Crop3x2Url: "https://r2.example.com/crop3x2.jpg",
        r2Crop4x3Url: "https://r2.example.com/crop4x3.jpg",
        r2Crop16x9Url: "https://r2.example.com/crop16x9.jpg",
      };

      const result = await saveImage(
        dataWithR2Urls,
        mockServiceContainer,
        mockLogger
      );

      // Verify database upsert was called with R2 URLs
      expect(mockPrisma.image.upsert).toHaveBeenCalledWith({
        where: {
          importId: "test-import-456",
        },
        update: {
          originalImageUrl: "https://r2.example.com/original.jpg",
          thumbnailImageUrl: "https://r2.example.com/thumbnail.jpg",
          crop3x2ImageUrl: "https://r2.example.com/crop3x2.jpg",
          crop4x3ImageUrl: "https://r2.example.com/crop4x3.jpg",
          crop16x9ImageUrl: "https://r2.example.com/crop16x9.jpg",
          originalWidth: 1920,
          originalHeight: 1080,
          originalSize: 1024,
          originalFormat: "jpeg",
          processingStatus: "COMPLETED",
          processingError: null,
          noteId: "test-note-123",
        },
        create: {
          originalImageUrl: "https://r2.example.com/original.jpg",
          thumbnailImageUrl: "https://r2.example.com/thumbnail.jpg",
          crop3x2ImageUrl: "https://r2.example.com/crop3x2.jpg",
          crop4x3ImageUrl: "https://r2.example.com/crop4x3.jpg",
          crop16x9ImageUrl: "https://r2.example.com/crop16x9.jpg",
          originalWidth: 1920,
          originalHeight: 1080,
          originalSize: 1024,
          originalFormat: "jpeg",
          processingStatus: "COMPLETED",
          noteId: "test-note-123",
          importId: "test-import-456",
        },
      });

      // Verify logging shows R2 URLs
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[SAVE_IMAGE] Original: https://r2.example.com/original.jpg (R2)"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[SAVE_IMAGE] Thumbnail: https://r2.example.com/thumbnail.jpg (R2)"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[SAVE_IMAGE] 3:2 crop: https://r2.example.com/crop3x2.jpg (R2)"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[SAVE_IMAGE] 4:3 crop: https://r2.example.com/crop4x3.jpg (R2)"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[SAVE_IMAGE] 16:9 crop: https://r2.example.com/crop16x9.jpg (R2)"
      );

      expect(result).toEqual({
        ...dataWithR2Urls,
        imageId: "saved-image-123",
      });
    });

    it("should use r2Url as fallback for original when r2OriginalUrl is not available", async () => {
      const dataWithR2Fallback = {
        ...mockData,
        r2Url: "https://r2.example.com/fallback.jpg",
      };

      const result = await saveImage(
        dataWithR2Fallback,
        mockServiceContainer,
        mockLogger
      );

      // Verify database upsert was called with fallback R2 URL
      expect(mockPrisma.image.upsert).toHaveBeenCalledWith({
        where: {
          importId: "test-import-456",
        },
        update: {
          originalImageUrl: "https://r2.example.com/fallback.jpg",
          thumbnailImageUrl: "/images/thumbnail.jpg",
          crop3x2ImageUrl: "/images/crop3x2.jpg",
          crop4x3ImageUrl: "/images/crop4x3.jpg",
          crop16x9ImageUrl: "/images/crop16x9.jpg",
          originalWidth: 1920,
          originalHeight: 1080,
          originalSize: 1024,
          originalFormat: "jpeg",
          processingStatus: "COMPLETED",
          processingError: null,
          noteId: "test-note-123",
        },
        create: {
          originalImageUrl: "https://r2.example.com/fallback.jpg",
          thumbnailImageUrl: "/images/thumbnail.jpg",
          crop3x2ImageUrl: "/images/crop3x2.jpg",
          crop4x3ImageUrl: "/images/crop4x3.jpg",
          crop16x9ImageUrl: "/images/crop16x9.jpg",
          originalWidth: 1920,
          originalHeight: 1080,
          originalSize: 1024,
          originalFormat: "jpeg",
          processingStatus: "COMPLETED",
          noteId: "test-note-123",
          importId: "test-import-456",
        },
      });

      expect(result).toEqual({
        ...dataWithR2Fallback,
        imageId: "saved-image-123",
      });
    });

    it("should use custom IMAGE_BASE_URL from environment", async () => {
      process.env.IMAGE_BASE_URL = "https://custom.example.com/images";

      const result = await saveImage(
        mockData,
        mockServiceContainer,
        mockLogger
      );

      // Verify database upsert was called with custom base URL
      expect(mockPrisma.image.upsert).toHaveBeenCalledWith({
        where: {
          importId: "test-import-456",
        },
        update: {
          originalImageUrl: "https://custom.example.com/images/original.jpg",
          thumbnailImageUrl: "https://custom.example.com/images/thumbnail.jpg",
          crop3x2ImageUrl: "https://custom.example.com/images/crop3x2.jpg",
          crop4x3ImageUrl: "https://custom.example.com/images/crop4x3.jpg",
          crop16x9ImageUrl: "https://custom.example.com/images/crop16x9.jpg",
          originalWidth: 1920,
          originalHeight: 1080,
          originalSize: 1024,
          originalFormat: "jpeg",
          processingStatus: "COMPLETED",
          processingError: null,
          noteId: "test-note-123",
        },
        create: {
          originalImageUrl: "https://custom.example.com/images/original.jpg",
          thumbnailImageUrl: "https://custom.example.com/images/thumbnail.jpg",
          crop3x2ImageUrl: "https://custom.example.com/images/crop3x2.jpg",
          crop4x3ImageUrl: "https://custom.example.com/images/crop4x3.jpg",
          crop16x9ImageUrl: "https://custom.example.com/images/crop16x9.jpg",
          originalWidth: 1920,
          originalHeight: 1080,
          originalSize: 1024,
          originalFormat: "jpeg",
          processingStatus: "COMPLETED",
          noteId: "test-note-123",
          importId: "test-import-456",
        },
      });

      expect(result).toEqual({
        ...mockData,
        imageId: "saved-image-123",
      });
    });

    it("should handle mixed R2 and local URLs", async () => {
      const dataWithMixedUrls = {
        ...mockData,
        r2OriginalUrl: "https://r2.example.com/original.jpg",
        r2ThumbnailUrl: "https://r2.example.com/thumbnail.jpg",
        // crop3x2, crop4x3, crop16x9 use local URLs
      };

      const result = await saveImage(
        dataWithMixedUrls,
        mockServiceContainer,
        mockLogger
      );

      // Verify database upsert was called with mixed URLs
      expect(mockPrisma.image.upsert).toHaveBeenCalledWith({
        where: {
          importId: "test-import-456",
        },
        update: {
          originalImageUrl: "https://r2.example.com/original.jpg",
          thumbnailImageUrl: "https://r2.example.com/thumbnail.jpg",
          crop3x2ImageUrl: "/images/crop3x2.jpg",
          crop4x3ImageUrl: "/images/crop4x3.jpg",
          crop16x9ImageUrl: "/images/crop16x9.jpg",
          originalWidth: 1920,
          originalHeight: 1080,
          originalSize: 1024,
          originalFormat: "jpeg",
          processingStatus: "COMPLETED",
          processingError: null,
          noteId: "test-note-123",
        },
        create: {
          originalImageUrl: "https://r2.example.com/original.jpg",
          thumbnailImageUrl: "https://r2.example.com/thumbnail.jpg",
          crop3x2ImageUrl: "/images/crop3x2.jpg",
          crop4x3ImageUrl: "/images/crop4x3.jpg",
          crop16x9ImageUrl: "/images/crop16x9.jpg",
          originalWidth: 1920,
          originalHeight: 1080,
          originalSize: 1024,
          originalFormat: "jpeg",
          processingStatus: "COMPLETED",
          noteId: "test-note-123",
          importId: "test-import-456",
        },
      });

      // Verify logging shows mixed URLs
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[SAVE_IMAGE] Original: https://r2.example.com/original.jpg (R2)"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[SAVE_IMAGE] Thumbnail: https://r2.example.com/thumbnail.jpg (R2)"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[SAVE_IMAGE] 3:2 crop: /images/crop3x2.jpg (local)"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[SAVE_IMAGE] 4:3 crop: /images/crop4x3.jpg (local)"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[SAVE_IMAGE] 16:9 crop: /images/crop16x9.jpg (local)"
      );

      expect(result).toEqual({
        ...dataWithMixedUrls,
        imageId: "saved-image-123",
      });
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

      // The path.basename mock is already set up to handle all paths correctly

      const result = await saveImage(
        minimalData,
        mockServiceContainer,
        mockLogger
      );

      expect(mockPrisma.image.upsert).toHaveBeenCalledWith({
        where: {
          importId: "minimal-import",
        },
        update: {
          originalImageUrl: "/images/original.jpg",
          thumbnailImageUrl: "/images/thumbnail.jpg",
          crop3x2ImageUrl: "/images/crop3x2.jpg",
          crop4x3ImageUrl: "/images/crop4x3.jpg",
          crop16x9ImageUrl: "/images/crop16x9.jpg",
          originalWidth: 100,
          originalHeight: 100,
          originalSize: 100,
          originalFormat: "png",
          processingStatus: "COMPLETED",
          processingError: null,
          noteId: "minimal-note",
        },
        create: {
          originalImageUrl: "/images/original.jpg",
          thumbnailImageUrl: "/images/thumbnail.jpg",
          crop3x2ImageUrl: "/images/crop3x2.jpg",
          crop4x3ImageUrl: "/images/crop4x3.jpg",
          crop16x9ImageUrl: "/images/crop16x9.jpg",
          originalWidth: 100,
          originalHeight: 100,
          originalSize: 100,
          originalFormat: "png",
          processingStatus: "COMPLETED",
          noteId: "minimal-note",
          importId: "minimal-import",
        },
      });

      expect(result).toEqual({
        ...minimalData,
        imageId: "saved-image-123",
      });
    });
  });

  describe("error handling scenarios", () => {
    it("should handle database upsert errors", async () => {
      const dbError = new Error("Database connection failed");
      mockPrisma.image.upsert.mockRejectedValue(dbError);

      await expect(
        saveImage(mockData, mockServiceContainer, mockLogger)
      ).rejects.toThrow("Database connection failed");

      // Verify error logging
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[SAVE_IMAGE] ❌ Failed to save image URLs: Error: Database connection failed"
      );
    });

    it("should handle missing importId", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dataWithoutImportId = { ...mockData, importId: undefined } as any;

      const result = await saveImage(
        dataWithoutImportId,
        mockServiceContainer,
        mockLogger
      );

      // Verify database was called with undefined importId
      expect(mockPrisma.image.upsert).toHaveBeenCalledWith({
        where: {
          importId: undefined,
        },
        update: expect.any(Object),
        create: expect.any(Object),
      });

      expect(result).toEqual({
        ...dataWithoutImportId,
        imageId: "saved-image-123",
      });
    });

    it("should handle missing noteId", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dataWithoutNoteId = { ...mockData, noteId: undefined } as any;

      const result = await saveImage(
        dataWithoutNoteId,
        mockServiceContainer,
        mockLogger
      );

      // Verify database was called with undefined noteId
      expect(mockPrisma.image.upsert).toHaveBeenCalledWith({
        where: {
          importId: "test-import-456",
        },
        update: expect.objectContaining({
          noteId: undefined,
        }),
        create: expect.objectContaining({
          noteId: undefined,
        }),
      });

      expect(result).toEqual({
        ...dataWithoutNoteId,
        imageId: "saved-image-123",
      });
    });

    it("should handle missing metadata", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dataWithoutMetadata = { ...mockData, metadata: undefined } as any;

      await expect(
        saveImage(dataWithoutMetadata, mockServiceContainer, mockLogger)
      ).rejects.toThrow();

      // Verify error logging
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringMatching(/\[SAVE_IMAGE\] ❌ Failed to save image URLs: /)
      );
    });

    it("should handle path.basename errors", async () => {
      mockPathBasename.mockImplementation(() => {
        throw new Error("Path basename failed");
      });

      await expect(
        saveImage(mockData, mockServiceContainer, mockLogger)
      ).rejects.toThrow("Path basename failed");

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[SAVE_IMAGE] ❌ Failed to save image URLs: Error: Path basename failed"
      );
    });
  });

  describe("URL generation edge cases", () => {
    it("should handle empty file paths", async () => {
      const dataWithEmptyPaths = {
        ...mockData,
        originalPath: "",
        thumbnailPath: "",
        crop3x2Path: "",
        crop4x3Path: "",
        crop16x9Path: "",
      };

      // Override the path.basename mock for empty paths
      mockPathBasename.mockImplementation(() => "");

      const result = await saveImage(
        dataWithEmptyPaths,
        mockServiceContainer,
        mockLogger
      );

      expect(mockPrisma.image.upsert).toHaveBeenCalledWith({
        where: {
          importId: "test-import-456",
        },
        update: {
          originalImageUrl: "/images/",
          thumbnailImageUrl: "/images/",
          crop3x2ImageUrl: "/images/",
          crop4x3ImageUrl: "/images/",
          crop16x9ImageUrl: "/images/",
          originalWidth: 1920,
          originalHeight: 1080,
          originalSize: 1024,
          originalFormat: "jpeg",
          processingStatus: "COMPLETED",
          processingError: null,
          noteId: "test-note-123",
        },
        create: {
          originalImageUrl: "/images/",
          thumbnailImageUrl: "/images/",
          crop3x2ImageUrl: "/images/",
          crop4x3ImageUrl: "/images/",
          crop16x9ImageUrl: "/images/",
          originalWidth: 1920,
          originalHeight: 1080,
          originalSize: 1024,
          originalFormat: "jpeg",
          processingStatus: "COMPLETED",
          noteId: "test-note-123",
          importId: "test-import-456",
        },
      });

      expect(result).toEqual({
        ...dataWithEmptyPaths,
        imageId: "saved-image-123",
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

      const result = await saveImage(
        dataWithZeroSizes,
        mockServiceContainer,
        mockLogger
      );

      expect(mockPrisma.image.upsert).toHaveBeenCalledWith({
        where: {
          importId: "test-import-456",
        },
        update: {
          originalImageUrl: "/images/original.jpg",
          thumbnailImageUrl: "/images/thumbnail.jpg",
          crop3x2ImageUrl: "/images/crop3x2.jpg",
          crop4x3ImageUrl: "/images/crop4x3.jpg",
          crop16x9ImageUrl: "/images/crop16x9.jpg",
          originalWidth: 1920,
          originalHeight: 1080,
          originalSize: 0,
          originalFormat: "jpeg",
          processingStatus: "COMPLETED",
          processingError: null,
          noteId: "test-note-123",
        },
        create: {
          originalImageUrl: "/images/original.jpg",
          thumbnailImageUrl: "/images/thumbnail.jpg",
          crop3x2ImageUrl: "/images/crop3x2.jpg",
          crop4x3ImageUrl: "/images/crop4x3.jpg",
          crop16x9ImageUrl: "/images/crop16x9.jpg",
          originalWidth: 1920,
          originalHeight: 1080,
          originalSize: 0,
          originalFormat: "jpeg",
          processingStatus: "COMPLETED",
          noteId: "test-note-123",
          importId: "test-import-456",
        },
      });

      expect(result).toEqual({
        ...dataWithZeroSizes,
        imageId: "saved-image-123",
      });
    });
  });
});
