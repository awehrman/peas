import { promises as fs } from "fs";
import path from "path";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { IServiceContainer } from "../../../../../services/container";
import { createMockLogger } from "../../../../../test-utils/helpers";
import type { ImageJobData } from "../../../../../workers/image/types";
import { uploadOriginal } from "../../../../image/actions/upload-original/service";

// Mock dependencies
vi.mock("fs", () => ({
  promises: {
    access: vi.fn(),
  },
}));

vi.mock("path", () => ({
  default: {
    extname: vi.fn(),
    parse: vi.fn(),
  },
  extname: vi.fn(),
  parse: vi.fn(),
}));

describe("Upload Original Service", () => {
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockServiceContainer: IServiceContainer;
  let mockData: ImageJobData;
  let mockR2: { uploadFile: ReturnType<typeof vi.fn> };
  let mockFsAccess: ReturnType<typeof vi.fn>;
  let mockPathExtname: ReturnType<typeof vi.fn>;
  let mockPathParse: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Get mocked functions
    const fsModule = vi.mocked(fs);
    const pathModule = vi.mocked(path);

    mockFsAccess = vi.mocked(fsModule.access);
    mockPathExtname = vi.mocked(pathModule.extname);
    mockPathParse = vi.mocked(pathModule.parse);

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
    mockPathParse.mockReturnValue({
      name: "image",
      ext: ".jpg",
      base: "image.jpg",
      dir: "",
      root: "",
    });
    mockR2.uploadFile.mockResolvedValue({
      key: "originals/test-import-456/image.jpg",
      url: "https://r2.example.com/originals/test-import-456/image.jpg",
      size: 1024,
      etag: "test-etag",
    });
  });

  describe("uploadOriginal", () => {
    describe("successful upload", () => {
      it("should upload original image to R2 successfully", async () => {
        const result = await uploadOriginal(
          mockData,
          mockServiceContainer,
          mockLogger
        );

        expect(mockLogger.log).toHaveBeenCalledWith(
          "[UPLOAD_ORIGINAL] Starting R2 upload for note: test-note-123"
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
          "[UPLOAD_ORIGINAL] Input path: /path/to/image.jpg"
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
          "[UPLOAD_ORIGINAL] Generated R2 key: originals/test-import-456/image.jpg"
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
          "[UPLOAD_ORIGINAL] Successfully uploaded to R2"
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
          "[UPLOAD_ORIGINAL] R2 URL: https://r2.example.com/originals/test-import-456/image.jpg"
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
          "[UPLOAD_ORIGINAL] File size: 1024 bytes"
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
          "[UPLOAD_ORIGINAL] ETag: test-etag"
        );

        expect(mockFsAccess).toHaveBeenCalledWith("/path/to/image.jpg");
        expect(mockPathExtname).toHaveBeenCalledWith("image.jpg");
        expect(mockPathParse).toHaveBeenCalledWith("image.jpg");
        expect(mockR2.uploadFile).toHaveBeenCalledWith(
          "/path/to/image.jpg",
          "originals/test-import-456/image.jpg"
        );

        expect(result).toEqual({
          ...mockData,
          r2Key: "originals/test-import-456/image.jpg",
          r2Url: "https://r2.example.com/originals/test-import-456/image.jpg",
        });
      });

      it("should handle different file extensions", async () => {
        mockData.filename = "image.png";
        mockPathExtname.mockReturnValue(".png");
        mockPathParse.mockReturnValue({
          name: "image",
          ext: ".png",
          base: "image.png",
          dir: "",
          root: "",
        });

        // Update mock response for this test
        mockR2.uploadFile.mockResolvedValue({
          key: "originals/test-import-456/image.png",
          url: "https://r2.example.com/originals/test-import-456/image.png",
          size: 1024,
          etag: "test-etag",
        });

        const result = await uploadOriginal(
          mockData,
          mockServiceContainer,
          mockLogger
        );

        expect(mockPathExtname).toHaveBeenCalledWith("image.png");
        expect(mockPathParse).toHaveBeenCalledWith("image.png");
        expect(mockR2.uploadFile).toHaveBeenCalledWith(
          "/path/to/image.jpg",
          "originals/test-import-456/image.png"
        );

        expect(result.r2Key).toBe("originals/test-import-456/image.png");
      });

      it("should handle filenames with spaces and special characters", async () => {
        mockData.filename = "my image file.jpg";
        mockPathParse.mockReturnValue({
          name: "my image file",
          ext: ".jpg",
          base: "my image file.jpg",
          dir: "",
          root: "",
        });

        // Update mock response for this test
        mockR2.uploadFile.mockResolvedValue({
          key: "originals/test-import-456/my image file.jpg",
          url: "https://r2.example.com/originals/test-import-456/my image file.jpg",
          size: 1024,
          etag: "test-etag",
        });

        const result = await uploadOriginal(
          mockData,
          mockServiceContainer,
          mockLogger
        );

        expect(mockR2.uploadFile).toHaveBeenCalledWith(
          "/path/to/image.jpg",
          "originals/test-import-456/my image file.jpg"
        );

        expect(result.r2Key).toBe(
          "originals/test-import-456/my image file.jpg"
        );
      });
    });

    describe("R2 not configured", () => {
      it("should skip upload when R2 is not configured", async () => {
        mockServiceContainer.r2 = undefined;

        const result = await uploadOriginal(
          mockData,
          mockServiceContainer,
          mockLogger
        );

        expect(mockLogger.log).toHaveBeenCalledWith(
          "[UPLOAD_ORIGINAL] R2 not configured, skipping upload"
        );
        expect(mockR2.uploadFile).not.toHaveBeenCalled();
        expect(mockFsAccess).not.toHaveBeenCalled();

        expect(result).toEqual({
          ...mockData,
          r2Key: undefined,
          r2Url: undefined,
        });
      });
    });

    describe("file access errors", () => {
      it("should handle file not found error", async () => {
        mockFsAccess.mockRejectedValue(new Error("File not found"));

        const result = await uploadOriginal(
          mockData,
          mockServiceContainer,
          mockLogger
        );

        expect(mockLogger.log).toHaveBeenCalledWith(
          "[UPLOAD_ORIGINAL] Failed to upload to R2: Input file not found or not accessible: /path/to/image.jpg"
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
          "[UPLOAD_ORIGINAL] Continuing with local processing"
        );
        expect(mockR2.uploadFile).not.toHaveBeenCalled();

        expect(result).toEqual({
          ...mockData,
          r2Key: undefined,
          r2Url: undefined,
        });
      });

      it("should handle file permission error", async () => {
        mockFsAccess.mockRejectedValue(new Error("Permission denied"));

        const result = await uploadOriginal(
          mockData,
          mockServiceContainer,
          mockLogger
        );

        expect(mockLogger.log).toHaveBeenCalledWith(
          "[UPLOAD_ORIGINAL] Failed to upload to R2: Input file not found or not accessible: /path/to/image.jpg"
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
          "[UPLOAD_ORIGINAL] Continuing with local processing"
        );

        expect(result).toEqual({
          ...mockData,
          r2Key: undefined,
          r2Url: undefined,
        });
      });
    });

    describe("R2 upload errors", () => {
      it("should handle R2 upload failure", async () => {
        mockR2.uploadFile.mockRejectedValue(new Error("R2 upload failed"));

        const result = await uploadOriginal(
          mockData,
          mockServiceContainer,
          mockLogger
        );

        expect(mockLogger.log).toHaveBeenCalledWith(
          "[UPLOAD_ORIGINAL] Failed to upload to R2: R2 upload failed"
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
          "[UPLOAD_ORIGINAL] Continuing with local processing"
        );

        expect(result).toEqual({
          ...mockData,
          r2Key: undefined,
          r2Url: undefined,
        });
      });

      it("should handle non-Error exceptions", async () => {
        mockR2.uploadFile.mockRejectedValue("String error");

        const result = await uploadOriginal(
          mockData,
          mockServiceContainer,
          mockLogger
        );

        expect(mockLogger.log).toHaveBeenCalledWith(
          "[UPLOAD_ORIGINAL] Failed to upload to R2: String error"
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
          "[UPLOAD_ORIGINAL] Continuing with local processing"
        );

        expect(result).toEqual({
          ...mockData,
          r2Key: undefined,
          r2Url: undefined,
        });
      });
    });

    describe("edge cases", () => {
      it("should handle empty filename", async () => {
        mockData.filename = "";
        mockPathExtname.mockReturnValue("");
        mockPathParse.mockReturnValue({
          name: "",
          ext: "",
          base: "",
          dir: "",
          root: "",
        });

        // Update mock response for this test
        mockR2.uploadFile.mockResolvedValue({
          key: "originals/test-import-456/",
          url: "https://r2.example.com/originals/test-import-456/",
          size: 1024,
          etag: "test-etag",
        });

        const result = await uploadOriginal(
          mockData,
          mockServiceContainer,
          mockLogger
        );

        expect(mockR2.uploadFile).toHaveBeenCalledWith(
          "/path/to/image.jpg",
          "originals/test-import-456/"
        );

        expect(result.r2Key).toBe("originals/test-import-456/");
      });

      it("should handle missing noteId", async () => {
        mockData.noteId = "";

        const result = await uploadOriginal(
          mockData,
          mockServiceContainer,
          mockLogger
        );

        expect(mockLogger.log).toHaveBeenCalledWith(
          "[UPLOAD_ORIGINAL] Starting R2 upload for note: "
        );

        expect(result).toEqual({
          ...mockData,
          r2Key: "originals/test-import-456/image.jpg",
          r2Url: "https://r2.example.com/originals/test-import-456/image.jpg",
        });
      });

      it("should handle missing importId", async () => {
        mockData.importId = "";

        // Update mock response for this test
        mockR2.uploadFile.mockResolvedValue({
          key: "originals//image.jpg",
          url: "https://r2.example.com/originals//image.jpg",
          size: 1024,
          etag: "test-etag",
        });

        const result = await uploadOriginal(
          mockData,
          mockServiceContainer,
          mockLogger
        );

        expect(mockR2.uploadFile).toHaveBeenCalledWith(
          "/path/to/image.jpg",
          "originals//image.jpg"
        );

        expect(result.r2Key).toBe("originals//image.jpg");
      });
    });
  });
});
