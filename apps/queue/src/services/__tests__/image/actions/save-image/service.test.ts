import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import type { IServiceContainer } from "../../../../../services/container";
import {
  createMockLogger,
  createMockServiceContainer,
} from "../../../../../test-utils/helpers";
import type { ImageJobData } from "../../../../../workers/image/types";
import { saveImage } from "../../../../image/actions/save-image/service";

const LOCAL_IMAGE_DIR = "/srv/peas-media";
const IMPORT_DIR = `${LOCAL_IMAGE_DIR}/test-import-456`;
const LOCAL_BASE_URL = "http://localhost:4200/media/images/test-import-456";

function buildExpectedUpsert(
  urls: {
    original: string;
    thumbnail: string;
    crop3x2: string;
    crop4x3: string;
    crop16x9: string;
  },
  overrides: {
    importId?: string;
    noteId?: string;
    originalWidth?: number;
    originalHeight?: number;
    originalSize?: number;
    originalFormat?: string;
  } = {}
) {
  const fields = {
    originalImageUrl: urls.original,
    thumbnailImageUrl: urls.thumbnail,
    crop3x2ImageUrl: urls.crop3x2,
    crop4x3ImageUrl: urls.crop4x3,
    crop16x9ImageUrl: urls.crop16x9,
    originalWidth: overrides.originalWidth ?? 1920,
    originalHeight: overrides.originalHeight ?? 1080,
    originalSize: overrides.originalSize ?? 1024,
    originalFormat: overrides.originalFormat ?? "jpeg",
    processingStatus: "COMPLETED",
  };
  const importId = overrides.importId ?? "test-import-456";
  const noteId = overrides.noteId ?? "test-note-123";

  return {
    where: { importId },
    update: { ...fields, processingError: null, noteId },
    create: { ...fields, noteId, importId },
  };
}

const localUrls = {
  original: `${LOCAL_BASE_URL}/original.jpg`,
  thumbnail: `${LOCAL_BASE_URL}/thumbnail.jpg`,
  crop3x2: `${LOCAL_BASE_URL}/crop3x2.jpg`,
  crop4x3: `${LOCAL_BASE_URL}/crop4x3.jpg`,
  crop16x9: `${LOCAL_BASE_URL}/crop16x9.jpg`,
};

describe("saveImage", () => {
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockServiceContainer: IServiceContainer;
  let mockData: ImageJobData;
  let mockPrisma: { image: { upsert: Mock } };
  let originalEnv: typeof process.env;

  beforeEach(() => {
    vi.clearAllMocks();

    originalEnv = process.env;
    process.env = { ...originalEnv, LOCAL_IMAGE_DIR, PORT: "4200" };
    delete process.env.IMAGE_BASE_URL;

    mockLogger = createMockLogger();

    mockPrisma = {
      image: {
        upsert: vi.fn(),
      },
    };

    mockServiceContainer = {
      ...createMockServiceContainer(),
      database: {
        prisma: mockPrisma,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    mockData = {
      noteId: "test-note-123",
      importId: "test-import-456",
      imageId: "test-import-456",
      imagePath: "/uploads/temp/image.jpg",
      outputDir: IMPORT_DIR,
      filename: "image.jpg",
      originalPath: `${IMPORT_DIR}/original.jpg`,
      thumbnailPath: `${IMPORT_DIR}/thumbnail.jpg`,
      crop3x2Path: `${IMPORT_DIR}/crop3x2.jpg`,
      crop4x3Path: `${IMPORT_DIR}/crop4x3.jpg`,
      crop16x9Path: `${IMPORT_DIR}/crop16x9.jpg`,
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

    mockPrisma.image.upsert.mockResolvedValue({ id: "saved-image-123" });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("successful scenarios", () => {
    it("should save locally served URLs when no R2 URLs are provided", async () => {
      const result = await saveImage(
        mockData,
        mockServiceContainer,
        mockLogger
      );

      expect(mockPrisma.image.upsert).toHaveBeenCalledTimes(1);
      expect(mockPrisma.image.upsert).toHaveBeenCalledWith(
        buildExpectedUpsert(localUrls)
      );

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
        `[SAVE_IMAGE] Original: ${localUrls.original} (local)`
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        `[SAVE_IMAGE] 16:9 crop: ${localUrls.crop16x9} (local)`
      );

      expect(result).toEqual({
        ...mockData,
        imageId: "saved-image-123",
      });
    });

    it("should save image with R2 URLs when provided", async () => {
      const r2Urls = {
        original: "https://r2.example.com/original.jpg",
        thumbnail: "https://r2.example.com/thumbnail.jpg",
        crop3x2: "https://r2.example.com/crop3x2.jpg",
        crop4x3: "https://r2.example.com/crop4x3.jpg",
        crop16x9: "https://r2.example.com/crop16x9.jpg",
      };
      const dataWithR2Urls = {
        ...mockData,
        r2OriginalUrl: r2Urls.original,
        r2ThumbnailUrl: r2Urls.thumbnail,
        r2Crop3x2Url: r2Urls.crop3x2,
        r2Crop4x3Url: r2Urls.crop4x3,
        r2Crop16x9Url: r2Urls.crop16x9,
      };

      const result = await saveImage(
        dataWithR2Urls,
        mockServiceContainer,
        mockLogger
      );

      expect(mockPrisma.image.upsert).toHaveBeenCalledWith(
        buildExpectedUpsert(r2Urls)
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[SAVE_IMAGE] Original: https://r2.example.com/original.jpg (R2)"
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

      await saveImage(dataWithR2Fallback, mockServiceContainer, mockLogger);

      expect(mockPrisma.image.upsert).toHaveBeenCalledWith(
        buildExpectedUpsert({
          ...localUrls,
          original: "https://r2.example.com/fallback.jpg",
        })
      );
    });

    it("should use custom IMAGE_BASE_URL from environment", async () => {
      process.env.IMAGE_BASE_URL = "https://queue.example.com/media/images/";

      await saveImage(mockData, mockServiceContainer, mockLogger);

      const customBase = "https://queue.example.com/media/images/test-import-456";
      expect(mockPrisma.image.upsert).toHaveBeenCalledWith(
        buildExpectedUpsert({
          original: `${customBase}/original.jpg`,
          thumbnail: `${customBase}/thumbnail.jpg`,
          crop3x2: `${customBase}/crop3x2.jpg`,
          crop4x3: `${customBase}/crop4x3.jpg`,
          crop16x9: `${customBase}/crop16x9.jpg`,
        })
      );
    });

    it("should handle mixed R2 and local URLs", async () => {
      const dataWithMixedUrls = {
        ...mockData,
        r2OriginalUrl: "https://r2.example.com/original.jpg",
        r2ThumbnailUrl: "https://r2.example.com/thumbnail.jpg",
      };

      await saveImage(dataWithMixedUrls, mockServiceContainer, mockLogger);

      expect(mockPrisma.image.upsert).toHaveBeenCalledWith(
        buildExpectedUpsert({
          ...localUrls,
          original: "https://r2.example.com/original.jpg",
          thumbnail: "https://r2.example.com/thumbnail.jpg",
        })
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[SAVE_IMAGE] Thumbnail: https://r2.example.com/thumbnail.jpg (R2)"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        `[SAVE_IMAGE] 3:2 crop: ${localUrls.crop3x2} (local)`
      );
    });

    it("should URL-encode file names with spaces and symbols", async () => {
      const dataWithSpaces = {
        ...mockData,
        originalPath: `${IMPORT_DIR}/Screen Shot 2019@2x-original.png`,
      };

      await saveImage(dataWithSpaces, mockServiceContainer, mockLogger);

      expect(mockPrisma.image.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            originalImageUrl: `${LOCAL_BASE_URL}/Screen%20Shot%202019%402x-original.png`,
          }),
        })
      );
    });

    it("should build the upsert key from importId and filename when imageId is missing", async () => {
      const dataWithoutImageId = { ...mockData, imageId: undefined };

      await saveImage(dataWithoutImageId, mockServiceContainer, mockLogger);

      expect(mockPrisma.image.upsert).toHaveBeenCalledWith(
        buildExpectedUpsert(localUrls, { importId: "test-import-456-image.jpg" })
      );
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

      await saveImage(dataWithZeroSizes, mockServiceContainer, mockLogger);

      expect(mockPrisma.image.upsert).toHaveBeenCalledWith(
        buildExpectedUpsert(localUrls, { originalSize: 0 })
      );
    });
  });

  describe("error handling scenarios", () => {
    it("should handle database upsert errors", async () => {
      mockPrisma.image.upsert.mockRejectedValue(
        new Error("Database connection failed")
      );

      await expect(
        saveImage(mockData, mockServiceContainer, mockLogger)
      ).rejects.toThrow("Database connection failed");

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[SAVE_IMAGE] ❌ Failed to save image URLs: Error: Database connection failed"
      );
    });

    it("should handle missing noteId", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dataWithoutNoteId = { ...mockData, noteId: undefined } as any;

      await saveImage(dataWithoutNoteId, mockServiceContainer, mockLogger);

      expect(mockPrisma.image.upsert).toHaveBeenCalledWith({
        where: { importId: "test-import-456" },
        update: expect.objectContaining({ noteId: undefined }),
        create: expect.objectContaining({ noteId: undefined }),
      });
    });

    it("should handle missing metadata", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dataWithoutMetadata = { ...mockData, metadata: undefined } as any;

      await expect(
        saveImage(dataWithoutMetadata, mockServiceContainer, mockLogger)
      ).rejects.toThrow();

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringMatching(/\[SAVE_IMAGE\] ❌ Failed to save image URLs: /)
      );
    });

    it("should reject processed images outside local storage when R2 is not used", async () => {
      const dataOutsideStorage = {
        ...mockData,
        thumbnailPath: "/somewhere/else/thumbnail.jpg",
      };

      await expect(
        saveImage(dataOutsideStorage, mockServiceContainer, mockLogger)
      ).rejects.toThrow(
        "Image is outside local image storage: /somewhere/else/thumbnail.jpg"
      );
      expect(mockPrisma.image.upsert).not.toHaveBeenCalled();
    });

    it("should reject empty processed image paths when R2 is not used", async () => {
      const dataWithEmptyPaths = { ...mockData, originalPath: "" };

      await expect(
        saveImage(dataWithEmptyPaths, mockServiceContainer, mockLogger)
      ).rejects.toThrow("Image is outside local image storage");
      expect(mockPrisma.image.upsert).not.toHaveBeenCalled();
    });
  });
});
