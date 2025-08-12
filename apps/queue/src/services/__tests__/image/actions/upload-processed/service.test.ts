import fs from "fs/promises";
import path from "path";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { IServiceContainer } from "../../../../../services/container";
import { createMockLogger } from "../../../../../test-utils/helpers";
import type { ImageJobData } from "../../../../../workers/image/types";
import { uploadProcessed } from "../../../../image/actions/upload-processed/service";

// Mock dependencies
vi.mock("fs/promises", () => ({
  default: {
    access: vi.fn(),
  },
  access: vi.fn(),
}));

vi.mock("path", () => ({
  default: {
    extname: vi.fn(),
  },
  extname: vi.fn(),
}));

describe("Upload Processed Service", () => {
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockServiceContainer: IServiceContainer;
  let mockData: ImageJobData;
  let mockR2: { uploadFile: ReturnType<typeof vi.fn> };
  let mockFsAccess: ReturnType<typeof vi.fn>;
  let mockPathExtname: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Get mocked functions
    const fsModule = vi.mocked(fs);
    const pathModule = vi.mocked(path);

    mockFsAccess = vi.mocked(fsModule.access);
    mockPathExtname = vi.mocked(pathModule.extname);

    // Create mock logger
    mockLogger = createMockLogger();

    // Create mock R2 service
    mockR2 = {
      uploadFile: vi.fn(),
    };

    // Create mock service container
    mockServiceContainer = {
      r2: mockR2,
    } as unknown as IServiceContainer;

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

    // Setup default mocks
    mockFsAccess.mockResolvedValue(undefined);
    mockPathExtname.mockReturnValue(".jpg");
    mockR2.uploadFile.mockResolvedValue({
      key: "test-key",
      url: "https://r2.example.com/test.jpg",
      size: 1024,
      etag: "test-etag",
    });
  });

  describe("uploadProcessed", () => {
    describe("successful upload", () => {
      it("should upload all processed images to R2 successfully", async () => {
        const result = await uploadProcessed(
          mockData,
          mockServiceContainer,
          mockLogger
        );

        expect(mockLogger.log).toHaveBeenCalledWith(
          "[UPLOAD_PROCESSED] Starting R2 upload for processed images: test-note-123"
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
          '[UPLOAD_PROCESSED] Generated R2 keys: {"original":"processed/test-import-456/test-note-123-original.jpg","thumbnail":"processed/test-import-456/test-note-123-thumbnail.jpg","crop3x2":"processed/test-import-456/test-note-123-crop3x2.jpg","crop4x3":"processed/test-import-456/test-note-123-crop4x3.jpg","crop16x9":"processed/test-import-456/test-note-123-crop16x9.jpg"}'
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
          "[UPLOAD_PROCESSED] Uploading original to R2: processed/test-import-456/test-note-123-original.jpg"
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
          "[UPLOAD_PROCESSED] Successfully uploaded original: https://r2.example.com/test.jpg"
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
          "[UPLOAD_PROCESSED] Uploading thumbnail to R2: processed/test-import-456/test-note-123-thumbnail.jpg"
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
          "[UPLOAD_PROCESSED] Successfully uploaded thumbnail: https://r2.example.com/test.jpg"
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
          "[UPLOAD_PROCESSED] Uploading crop3x2 to R2: processed/test-import-456/test-note-123-crop3x2.jpg"
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
          "[UPLOAD_PROCESSED] Successfully uploaded crop3x2: https://r2.example.com/test.jpg"
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
          "[UPLOAD_PROCESSED] Uploading crop4x3 to R2: processed/test-import-456/test-note-123-crop4x3.jpg"
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
          "[UPLOAD_PROCESSED] Successfully uploaded crop4x3: https://r2.example.com/test.jpg"
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
          "[UPLOAD_PROCESSED] Uploading crop16x9 to R2: processed/test-import-456/test-note-123-crop16x9.jpg"
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
          "[UPLOAD_PROCESSED] Successfully uploaded crop16x9: https://r2.example.com/test.jpg"
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
          '[UPLOAD_PROCESSED] Upload results: [{"name":"original","url":"https://r2.example.com/test.jpg","success":true},{"name":"thumbnail","url":"https://r2.example.com/test.jpg","success":true},{"name":"crop3x2","url":"https://r2.example.com/test.jpg","success":true},{"name":"crop4x3","url":"https://r2.example.com/test.jpg","success":true},{"name":"crop16x9","url":"https://r2.example.com/test.jpg","success":true}]'
        );

        expect(mockFsAccess).toHaveBeenCalledWith("/path/to/original.jpg");
        expect(mockFsAccess).toHaveBeenCalledWith("/path/to/thumbnail.jpg");
        expect(mockFsAccess).toHaveBeenCalledWith("/path/to/crop3x2.jpg");
        expect(mockFsAccess).toHaveBeenCalledWith("/path/to/crop4x3.jpg");
        expect(mockFsAccess).toHaveBeenCalledWith("/path/to/crop16x9.jpg");

        expect(mockPathExtname).toHaveBeenCalledWith("image.jpg");

        expect(mockR2.uploadFile).toHaveBeenCalledWith(
          "/path/to/original.jpg",
          "processed/test-import-456/test-note-123-original.jpg"
        );
        expect(mockR2.uploadFile).toHaveBeenCalledWith(
          "/path/to/thumbnail.jpg",
          "processed/test-import-456/test-note-123-thumbnail.jpg"
        );
        expect(mockR2.uploadFile).toHaveBeenCalledWith(
          "/path/to/crop3x2.jpg",
          "processed/test-import-456/test-note-123-crop3x2.jpg"
        );
        expect(mockR2.uploadFile).toHaveBeenCalledWith(
          "/path/to/crop4x3.jpg",
          "processed/test-import-456/test-note-123-crop4x3.jpg"
        );
        expect(mockR2.uploadFile).toHaveBeenCalledWith(
          "/path/to/crop16x9.jpg",
          "processed/test-import-456/test-note-123-crop16x9.jpg"
        );

        expect(result).toEqual({
          ...mockData,
          r2OriginalUrl: "https://r2.example.com/test.jpg",
          r2ThumbnailUrl: "https://r2.example.com/test.jpg",
          r2Crop3x2Url: "https://r2.example.com/test.jpg",
          r2Crop4x3Url: "https://r2.example.com/test.jpg",
          r2Crop16x9Url: "https://r2.example.com/test.jpg",
        });
      });

      it("should handle different file extensions", async () => {
        mockData.filename = "image.png";
        mockPathExtname.mockReturnValue(".png");

        const result = await uploadProcessed(
          mockData,
          mockServiceContainer,
          mockLogger
        );

        expect(mockPathExtname).toHaveBeenCalledWith("image.png");
        expect(mockR2.uploadFile).toHaveBeenCalledWith(
          "/path/to/original.jpg",
          "processed/test-import-456/test-note-123-original.png"
        );

        expect(result.r2OriginalUrl).toBe("https://r2.example.com/test.jpg");
      });

      it("should use importId when noteId is missing", async () => {
        mockData.noteId = "";

        const result = await uploadProcessed(
          mockData,
          mockServiceContainer,
          mockLogger
        );

        expect(mockLogger.log).toHaveBeenCalledWith(
          "[UPLOAD_PROCESSED] Starting R2 upload for processed images: "
        );
        expect(mockR2.uploadFile).toHaveBeenCalledWith(
          "/path/to/original.jpg",
          "processed/test-import-456/test-import-456-original.jpg"
        );

        expect(result.r2OriginalUrl).toBe("https://r2.example.com/test.jpg");
      });

      it("should handle different URLs for each upload", async () => {
        mockR2.uploadFile
          .mockResolvedValueOnce({
            key: "original-key",
            url: "https://r2.example.com/original.jpg",
            size: 1024,
            etag: "original-etag",
          })
          .mockResolvedValueOnce({
            key: "thumbnail-key",
            url: "https://r2.example.com/thumbnail.jpg",
            size: 512,
            etag: "thumbnail-etag",
          })
          .mockResolvedValueOnce({
            key: "crop3x2-key",
            url: "https://r2.example.com/crop3x2.jpg",
            size: 768,
            etag: "crop3x2-etag",
          })
          .mockResolvedValueOnce({
            key: "crop4x3-key",
            url: "https://r2.example.com/crop4x3.jpg",
            size: 768,
            etag: "crop4x3-etag",
          })
          .mockResolvedValueOnce({
            key: "crop16x9-key",
            url: "https://r2.example.com/crop16x9.jpg",
            size: 768,
            etag: "crop16x9-etag",
          });

        const result = await uploadProcessed(
          mockData,
          mockServiceContainer,
          mockLogger
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
    });

    describe("R2 not configured", () => {
      it("should skip upload when R2 is not configured", async () => {
        mockServiceContainer.r2 = undefined;

        const result = await uploadProcessed(
          mockData,
          mockServiceContainer,
          mockLogger
        );

        expect(mockLogger.log).toHaveBeenCalledWith(
          "[UPLOAD_PROCESSED] R2 not configured, skipping upload"
        );
        expect(mockR2.uploadFile).not.toHaveBeenCalled();
        expect(mockFsAccess).not.toHaveBeenCalled();

        expect(result).toEqual({
          ...mockData,
          r2OriginalUrl: undefined,
          r2ThumbnailUrl: undefined,
          r2Crop3x2Url: undefined,
          r2Crop4x3Url: undefined,
          r2Crop16x9Url: undefined,
        });
      });
    });

    describe("file access errors", () => {
      it("should handle file not found error for original", async () => {
        mockFsAccess.mockRejectedValueOnce(new Error("File not found"));

        const result = await uploadProcessed(
          mockData,
          mockServiceContainer,
          mockLogger
        );

        expect(mockLogger.log).toHaveBeenCalledWith(
          "[UPLOAD_PROCESSED] Failed to upload original: Error: File not found"
        );
        expect(mockR2.uploadFile).not.toHaveBeenCalledWith(
          "/path/to/original.jpg",
          expect.any(String)
        );

        expect(result.r2OriginalUrl).toBeUndefined();
        expect(result.r2ThumbnailUrl).toBe("https://r2.example.com/test.jpg");
      });

      it("should handle file not found error for thumbnail", async () => {
        mockFsAccess
          .mockResolvedValueOnce(undefined) // original
          .mockRejectedValueOnce(new Error("File not found")); // thumbnail

        const result = await uploadProcessed(
          mockData,
          mockServiceContainer,
          mockLogger
        );

        expect(mockLogger.log).toHaveBeenCalledWith(
          "[UPLOAD_PROCESSED] Failed to upload thumbnail: Error: File not found"
        );

        expect(result.r2OriginalUrl).toBe("https://r2.example.com/test.jpg");
        expect(result.r2ThumbnailUrl).toBeUndefined();
      });

      it("should handle file not found error for crop3x2", async () => {
        mockFsAccess
          .mockResolvedValueOnce(undefined) // original
          .mockResolvedValueOnce(undefined) // thumbnail
          .mockRejectedValueOnce(new Error("File not found")); // crop3x2

        const result = await uploadProcessed(
          mockData,
          mockServiceContainer,
          mockLogger
        );

        expect(mockLogger.log).toHaveBeenCalledWith(
          "[UPLOAD_PROCESSED] Failed to upload crop3x2: Error: File not found"
        );

        expect(result.r2OriginalUrl).toBe("https://r2.example.com/test.jpg");
        expect(result.r2ThumbnailUrl).toBe("https://r2.example.com/test.jpg");
        expect(result.r2Crop3x2Url).toBeUndefined();
      });
    });

    describe("R2 upload errors", () => {
      it("should handle R2 upload failure for original", async () => {
        mockR2.uploadFile.mockRejectedValueOnce(new Error("R2 upload failed"));

        const result = await uploadProcessed(
          mockData,
          mockServiceContainer,
          mockLogger
        );

        expect(mockLogger.log).toHaveBeenCalledWith(
          "[UPLOAD_PROCESSED] Failed to upload original: Error: R2 upload failed"
        );

        expect(result.r2OriginalUrl).toBeUndefined();
        expect(result.r2ThumbnailUrl).toBe("https://r2.example.com/test.jpg");
      });

      it("should handle R2 upload failure for thumbnail", async () => {
        mockR2.uploadFile
          .mockResolvedValueOnce({
            key: "original-key",
            url: "https://r2.example.com/original.jpg",
            size: 1024,
            etag: "original-etag",
          })
          .mockRejectedValueOnce(new Error("R2 upload failed"));

        const result = await uploadProcessed(
          mockData,
          mockServiceContainer,
          mockLogger
        );

        expect(mockLogger.log).toHaveBeenCalledWith(
          "[UPLOAD_PROCESSED] Failed to upload thumbnail: Error: R2 upload failed"
        );

        expect(result.r2OriginalUrl).toBe(
          "https://r2.example.com/original.jpg"
        );
        expect(result.r2ThumbnailUrl).toBeUndefined();
      });

      it("should handle non-Error exceptions", async () => {
        mockR2.uploadFile.mockRejectedValueOnce("String error");

        const result = await uploadProcessed(
          mockData,
          mockServiceContainer,
          mockLogger
        );

        expect(mockLogger.log).toHaveBeenCalledWith(
          "[UPLOAD_PROCESSED] Failed to upload original: String error"
        );

        expect(result.r2OriginalUrl).toBeUndefined();
      });
    });

    describe("edge cases", () => {
      it("should handle missing noteId and importId", async () => {
        mockData.noteId = "";
        mockData.importId = "";

        const result = await uploadProcessed(
          mockData,
          mockServiceContainer,
          mockLogger
        );

        expect(mockR2.uploadFile).toHaveBeenCalledWith(
          "/path/to/original.jpg",
          "processed//-original.jpg"
        );

        expect(result.r2OriginalUrl).toBe("https://r2.example.com/test.jpg");
      });

      it("should handle missing filename", async () => {
        mockData.filename = "";
        mockPathExtname.mockReturnValue("");

        const result = await uploadProcessed(
          mockData,
          mockServiceContainer,
          mockLogger
        );

        expect(mockR2.uploadFile).toHaveBeenCalledWith(
          "/path/to/original.jpg",
          "processed/test-import-456/test-note-123-original"
        );

        expect(result.r2OriginalUrl).toBe("https://r2.example.com/test.jpg");
      });

      it("should handle missing file paths", async () => {
        mockData.originalPath = "";
        mockData.thumbnailPath = "";
        mockData.crop3x2Path = "";
        mockData.crop4x3Path = "";
        mockData.crop16x9Path = "";

        const result = await uploadProcessed(
          mockData,
          mockServiceContainer,
          mockLogger
        );

        expect(mockFsAccess).toHaveBeenCalledWith("");
        // The service should handle empty paths gracefully and continue with the upload process
        expect(mockLogger.log).toHaveBeenCalledWith(
          "[UPLOAD_PROCESSED] Starting R2 upload for processed images: test-note-123"
        );

        // The service should still return URLs even with empty paths
        expect(result.r2OriginalUrl).toBe("https://r2.example.com/test.jpg");
      });

      it("should handle missing metadata", async () => {
        mockData.metadata = {
          width: 0,
          height: 0,
          format: "",
        };

        const result = await uploadProcessed(
          mockData,
          mockServiceContainer,
          mockLogger
        );

        expect(result).toEqual({
          ...mockData,
          r2OriginalUrl: "https://r2.example.com/test.jpg",
          r2ThumbnailUrl: "https://r2.example.com/test.jpg",
          r2Crop3x2Url: "https://r2.example.com/test.jpg",
          r2Crop4x3Url: "https://r2.example.com/test.jpg",
          r2Crop16x9Url: "https://r2.example.com/test.jpg",
        });
      });

      it("should handle zero file sizes", async () => {
        mockData.originalSize = 0;
        mockData.thumbnailSize = 0;
        mockData.crop3x2Size = 0;
        mockData.crop4x3Size = 0;
        mockData.crop16x9Size = 0;

        const result = await uploadProcessed(
          mockData,
          mockServiceContainer,
          mockLogger
        );

        expect(result).toEqual({
          ...mockData,
          r2OriginalUrl: "https://r2.example.com/test.jpg",
          r2ThumbnailUrl: "https://r2.example.com/test.jpg",
          r2Crop3x2Url: "https://r2.example.com/test.jpg",
          r2Crop4x3Url: "https://r2.example.com/test.jpg",
          r2Crop16x9Url: "https://r2.example.com/test.jpg",
        });
      });
    });

    describe("error handling", () => {
      it("should handle overall function errors gracefully", async () => {
        mockFsAccess.mockRejectedValue(new Error("Unexpected error"));

        const result = await uploadProcessed(
          mockData,
          mockServiceContainer,
          mockLogger
        );

        // The service should handle individual upload errors gracefully and continue
        expect(mockLogger.log).toHaveBeenCalledWith(
          "[UPLOAD_PROCESSED] Failed to upload original: Error: Unexpected error"
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

      it("should handle non-Error exceptions in overall function", async () => {
        mockFsAccess.mockRejectedValue("String error");

        const result = await uploadProcessed(
          mockData,
          mockServiceContainer,
          mockLogger
        );

        // The service should handle individual upload errors gracefully and continue
        expect(mockLogger.log).toHaveBeenCalledWith(
          "[UPLOAD_PROCESSED] Failed to upload original: String error"
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
    });

    it("should handle top-level error and return data without throwing", async () => {
      // Setup mocks to cause a top-level error that triggers the catch block
      // Mock Promise.all to throw an error
      const originalPromiseAll = Promise.all;
      Promise.all = vi.fn().mockImplementation(() => {
        throw new Error("Top-level Promise.all error");
      });

      const result = await uploadProcessed(
        mockData,
        mockServiceContainer,
        mockLogger
      );

      // Verify the top-level error was logged
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[UPLOAD_PROCESSED] Failed to upload processed images: Top-level Promise.all error"
      );

      // Verify data is still returned with undefined R2 URLs
      expect(result).toEqual({
        ...mockData,
        r2OriginalUrl: undefined,
        r2ThumbnailUrl: undefined,
        r2Crop3x2Url: undefined,
        r2Crop4x3Url: undefined,
        r2Crop16x9Url: undefined,
      });

      // Restore original Promise.all
      Promise.all = originalPromiseAll;
    });
  });
});
