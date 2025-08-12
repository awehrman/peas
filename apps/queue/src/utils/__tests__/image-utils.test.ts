/* eslint-disable @typescript-eslint/no-explicit-any */
import { promises as fs } from "fs";
import path from "path";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  findImageDirectoryForHtmlFile,
  findImagesForImport,
  getImageFiles,
  getImageFilesWithMetadata,
  isImageFile,
  isImageFileByContent,
  isImageFileEnhanced,
} from "../image-utils";

// Mock fs module
vi.mock("fs", () => ({
  promises: {
    open: vi.fn(),
    access: vi.fn(),
    readdir: vi.fn(),
    stat: vi.fn(),
    constants: {
      R_OK: 4,
    },
  },
}));

// Mock path module
vi.mock("path", () => ({
  default: {
    extname: vi.fn(),
    basename: vi.fn(),
    dirname: vi.fn(),
    join: vi.fn(),
  },
  extname: vi.fn(),
  basename: vi.fn(),
  dirname: vi.fn(),
  join: vi.fn(),
}));

// Mock process.cwd
vi.mock("process", () => ({
  default: {
    cwd: vi.fn(() => "/test/cwd"),
  },
  cwd: vi.fn(() => "/test/cwd"),
}));

describe("Image Utils", () => {
  let mockFs: any;
  let mockPath: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Get mocked modules
    mockFs = vi.mocked(fs);
    mockPath = vi.mocked(path);

    // Setup default path mocks
    mockPath.extname.mockReturnValue(".jpg");
    mockPath.basename.mockReturnValue("test.jpg");
    mockPath.dirname.mockReturnValue("/test/dir");
    mockPath.join.mockImplementation((...args: string[]) => args.join("/"));
  });

  describe("isImageFile", () => {
    it("should return true for valid image extensions", () => {
      const validExtensions = [
        ".jpg",
        ".jpeg",
        ".png",
        ".gif",
        ".webp",
        ".bmp",
        ".tiff",
        ".tif",
      ];

      validExtensions.forEach((ext) => {
        mockPath.extname.mockReturnValue(ext);
        expect(isImageFile("test" + ext)).toBe(true);
      });
    });

    it("should return false for invalid extensions", () => {
      const invalidExtensions = [".txt", ".pdf", ".doc", ".mp4", ".mp3", ""];

      invalidExtensions.forEach((ext) => {
        mockPath.extname.mockReturnValue(ext);
        expect(isImageFile("test" + ext)).toBe(false);
      });
    });

    it("should handle case insensitive extensions", () => {
      mockPath.extname.mockReturnValue(".JPG");
      expect(isImageFile("test.JPG")).toBe(true);

      mockPath.extname.mockReturnValue(".Png");
      expect(isImageFile("test.Png")).toBe(true);
    });
  });

  describe("isImageFileByContent", () => {
    let mockFileHandle: any;

    beforeEach(() => {
      mockFileHandle = {
        read: vi.fn(),
        close: vi.fn(),
      };
      mockFs.open.mockResolvedValue(mockFileHandle);
    });

    it("should detect JPEG images by magic bytes", async () => {
      const jpegBytes = [
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      ];
      mockFileHandle.read.mockResolvedValue({ bytesRead: 12 });

      // Mock Buffer.alloc and subarray
      const mockBuffer = {
        subarray: vi.fn().mockReturnValue(jpegBytes),
      };
      const originalBuffer = global.Buffer;
      global.Buffer = {
        ...originalBuffer,
        alloc: vi.fn().mockReturnValue(mockBuffer),
      } as any;

      const result = await isImageFileByContent("/test/image.jpg");

      expect(result).toBe(true);
      expect(mockFs.open).toHaveBeenCalledWith("/test/image.jpg", "r");
      expect(mockFileHandle.read).toHaveBeenCalledWith(mockBuffer, 0, 12, 0);
      expect(mockFileHandle.close).toHaveBeenCalled();

      // Restore original Buffer
      global.Buffer = originalBuffer;
    });

    it("should detect PNG images by magic bytes", async () => {
      const pngBytes = [
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00,
      ];
      mockFileHandle.read.mockResolvedValue({ bytesRead: 12 });

      const mockBuffer = {
        subarray: vi.fn().mockReturnValue(pngBytes),
      };
      const originalBuffer = global.Buffer;
      global.Buffer = {
        ...originalBuffer,
        alloc: vi.fn().mockReturnValue(mockBuffer),
      } as any;

      const result = await isImageFileByContent("/test/image.png");

      expect(result).toBe(true);

      global.Buffer = originalBuffer;
    });

    it("should detect GIF images by magic bytes", async () => {
      const gifBytes = [
        0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      ];
      mockFileHandle.read.mockResolvedValue({ bytesRead: 12 });

      const mockBuffer = {
        subarray: vi.fn().mockReturnValue(gifBytes),
      };
      const originalBuffer = global.Buffer;
      global.Buffer = {
        ...originalBuffer,
        alloc: vi.fn().mockReturnValue(mockBuffer),
      } as any;

      const result = await isImageFileByContent("/test/image.gif");

      expect(result).toBe(true);

      global.Buffer = originalBuffer;
    });

    it("should detect BMP images by magic bytes", async () => {
      const bmpBytes = [
        0x42, 0x4d, 0x36, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x36, 0x04,
      ];
      mockFileHandle.read.mockResolvedValue({ bytesRead: 12 });

      const mockBuffer = {
        subarray: vi.fn().mockReturnValue(bmpBytes),
      };
      const originalBuffer = global.Buffer;
      global.Buffer = {
        ...originalBuffer,
        alloc: vi.fn().mockReturnValue(mockBuffer),
      } as any;

      const result = await isImageFileByContent("/test/image.bmp");

      expect(result).toBe(true);

      global.Buffer = originalBuffer;
    });

    it("should detect TIFF images by magic bytes", async () => {
      const tiffBytes = [
        0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x0e, 0x00, 0x00, 0x00,
      ];
      mockFileHandle.read.mockResolvedValue({ bytesRead: 12 });

      const mockBuffer = {
        subarray: vi.fn().mockReturnValue(tiffBytes),
      };
      const originalBuffer = global.Buffer;
      global.Buffer = {
        ...originalBuffer,
        alloc: vi.fn().mockReturnValue(mockBuffer),
      } as any;

      const result = await isImageFileByContent("/test/image.tiff");

      expect(result).toBe(true);

      global.Buffer = originalBuffer;
    });

    it("should detect WebP images by magic bytes", async () => {
      const webpBytes = [
        0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x65, 0x62, 0x50,
      ];
      mockFileHandle.read.mockResolvedValue({ bytesRead: 12 });

      const mockBuffer = {
        subarray: vi.fn().mockReturnValue(webpBytes),
      };
      const originalBuffer = global.Buffer;
      global.Buffer = {
        ...originalBuffer,
        alloc: vi.fn().mockReturnValue(mockBuffer),
      } as any;

      const result = await isImageFileByContent("/test/image.webp");

      expect(result).toBe(true);

      global.Buffer = originalBuffer;
    });

    it("should return false for files too small to be images", async () => {
      mockFileHandle.read.mockResolvedValue({ bytesRead: 3 });

      const mockBuffer = {
        subarray: vi.fn().mockReturnValue([0x00, 0x00, 0x00]),
      };
      const originalBuffer = global.Buffer;
      global.Buffer = {
        ...originalBuffer,
        alloc: vi.fn().mockReturnValue(mockBuffer),
      } as any;

      const result = await isImageFileByContent("/test/small.txt");

      expect(result).toBe(false);

      global.Buffer = originalBuffer;
    });

    it("should return false for non-image files", async () => {
      const nonImageBytes = [
        0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xc7, 0xec,
      ];
      mockFileHandle.read.mockResolvedValue({ bytesRead: 12 });

      const mockBuffer = {
        subarray: vi.fn().mockReturnValue(nonImageBytes),
      };
      const originalBuffer = global.Buffer;
      global.Buffer = {
        ...originalBuffer,
        alloc: vi.fn().mockReturnValue(mockBuffer),
      } as any;

      const result = await isImageFileByContent("/test/document.pdf");

      expect(result).toBe(false);

      global.Buffer = originalBuffer;
    });

    it("should handle file access errors gracefully", async () => {
      mockFs.open.mockRejectedValue(new Error("File not found"));

      const result = await isImageFileByContent("/test/nonexistent.jpg");

      expect(result).toBe(false);
    });
  });

  describe("isImageFileEnhanced", () => {
    it("should return true for files with valid extensions", async () => {
      mockPath.extname.mockReturnValue(".jpg");

      const result = await isImageFileEnhanced("test.jpg", "/test/test.jpg");

      expect(result).toBe(true);
    });

    it("should check content for files without valid extensions", async () => {
      mockPath.extname.mockReturnValue(".bin");
      mockFs.open.mockResolvedValue({
        read: vi.fn().mockResolvedValue({ bytesRead: 12 }),
        close: vi.fn(),
      });

      const mockBuffer = {
        subarray: vi
          .fn()
          .mockReturnValue([
            0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00,
            0x01,
          ]),
      };
      const originalBuffer = global.Buffer;
      global.Buffer = {
        ...originalBuffer,
        alloc: vi.fn().mockReturnValue(mockBuffer),
      } as any;

      const result = await isImageFileEnhanced("test.bin", "/test/test.bin");

      expect(result).toBe(true);

      global.Buffer = originalBuffer;
    });
  });

  describe("getImageFiles", () => {
    beforeEach(() => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue([
        "image1.jpg",
        "image2.png",
        "document.txt",
      ]);
    });

    it("should return empty array for non-existent directory", async () => {
      mockFs.access.mockRejectedValue(new Error("Directory not found"));

      const result = await getImageFiles("/nonexistent/dir");

      expect(result).toEqual([]);
    });

    it("should throw error for unreadable directory", async () => {
      mockFs.access.mockResolvedValueOnce(undefined); // First call succeeds
      mockFs.access.mockRejectedValueOnce(new Error("Permission denied")); // Second call fails

      await expect(getImageFiles("/unreadable/dir")).rejects.toThrow(
        "Cannot read directory: /unreadable/dir"
      );
    });

    it("should return image files from directory", async () => {
      mockPath.extname
        .mockReturnValueOnce(".jpg")
        .mockReturnValueOnce(".png")
        .mockReturnValueOnce(".txt");

      const result = await getImageFiles("/test/dir");

      expect(result).toEqual(["image1.jpg", "image2.png"]);
      expect(mockFs.access).toHaveBeenCalledWith("/test/dir");
      expect(mockFs.readdir).toHaveBeenCalledWith("/test/dir");
    });

        it("should exclude specified files", async () => {
      mockPath.extname
        .mockReturnValueOnce(".jpg")
        .mockReturnValueOnce(".png")
        .mockReturnValueOnce(".txt");
      
      const result = await getImageFiles("/test/dir", ["image1.jpg"]);
      
      expect(result).toEqual(["image2.png", "document.txt"]);
    });

    it("should handle content-based detection for files without extensions", async () => {
      mockFs.readdir.mockResolvedValue(["image1", "image2.bin"]);
      mockPath.extname
        .mockReturnValueOnce("") // No extension
        .mockReturnValueOnce(".bin");

      // Mock content detection for first file
      mockFs.open.mockResolvedValue({
        read: vi.fn().mockResolvedValue({ bytesRead: 12 }),
        close: vi.fn(),
      });

      const mockBuffer = {
        subarray: vi
          .fn()
          .mockReturnValue([
            0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00,
            0x01,
          ]),
      };
      const originalBuffer = global.Buffer;
      global.Buffer = {
        ...originalBuffer,
        alloc: vi.fn().mockReturnValue(mockBuffer),
      } as any;

      const result = await getImageFiles("/test/dir");

      expect(result).toEqual(["image1", "image2.bin"]);

      global.Buffer = originalBuffer;
    });
  });

  describe("getImageFilesWithMetadata", () => {
    beforeEach(() => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue(["image1.jpg", "image2.png"]);
      mockFs.stat.mockResolvedValue({ size: 1024 });
      mockPath.extname.mockReturnValueOnce(".jpg").mockReturnValueOnce(".png");
    });

    it("should return image files with metadata", async () => {
      const result = await getImageFilesWithMetadata("/test/dir");

      expect(result).toEqual([
        {
          fileName: "image2.png",
          filePath: "/test/dir/image2.png",
          size: 1024,
          extension: ".png",
        },
      ]);
    });

    it("should handle files without extensions", async () => {
      mockFs.readdir.mockResolvedValue(["image1"]);
      mockPath.extname.mockReturnValue("");

      const result = await getImageFilesWithMetadata("/test/dir");

      expect(result[0]?.extension).toBe(".png");
    });

    it("should skip files that cannot be accessed", async () => {
      mockFs.stat.mockRejectedValueOnce(new Error("Permission denied"));

      const result = await getImageFilesWithMetadata("/test/dir");

      expect(result).toHaveLength(1); // Only the second file
    });

    it("should exclude specified files", async () => {
      const result = await getImageFilesWithMetadata("/test/dir", [
        "image1.jpg",
      ]);

      expect(result).toHaveLength(1);
      expect(result[0]?.fileName).toBe("image2.png");
    });
  });

  describe("findImageDirectoryForHtmlFile", () => {
    beforeEach(() => {
      mockPath.dirname.mockReturnValue("/test/dir");
      mockPath.basename.mockReturnValue("test");
      mockPath.extname.mockReturnValue(".html");
    });

    it("should find directory with same name as HTML file", async () => {
      mockFs.stat.mockResolvedValue({ isDirectory: () => true });
      mockFs.readdir.mockResolvedValue(["image1.jpg", "image2.png"]);
      mockPath.extname
        .mockReturnValueOnce(".html") // For basename call
        .mockReturnValueOnce(".jpg")
        .mockReturnValueOnce(".png");

      const result = await findImageDirectoryForHtmlFile("/test/dir/test.html");

      expect(result).toBe("/test/dir/test");
      expect(mockFs.stat).toHaveBeenCalledWith("/test/dir/test");
      expect(mockFs.readdir).toHaveBeenCalledWith("/test/dir/test");
    });

    it("should find directory with _files suffix", async () => {
      mockFs.stat
        .mockRejectedValueOnce(new Error("Not found")) // First directory doesn't exist
        .mockResolvedValueOnce({ isDirectory: () => true }); // Second directory exists
      mockFs.readdir.mockResolvedValue(["image1.jpg"]);
      mockPath.extname.mockReturnValueOnce(".html").mockReturnValueOnce(".jpg");

      const result = await findImageDirectoryForHtmlFile("/test/dir/test.html");

      expect(result).toBe("/test/dir/test_files");
    });

    it("should find directory with .files suffix", async () => {
      mockFs.stat
        .mockRejectedValueOnce(new Error("Not found")) // First directory doesn't exist
        .mockRejectedValueOnce(new Error("Not found")) // Second directory doesn't exist
        .mockResolvedValueOnce({ isDirectory: () => true }); // Third directory exists
      mockFs.readdir.mockResolvedValue(["image1.jpg"]);
      mockPath.extname.mockReturnValueOnce(".html").mockReturnValueOnce(".jpg");

      const result = await findImageDirectoryForHtmlFile("/test/dir/test.html");

      expect(result).toBe("/test/dir/test.files");
    });

    it("should find directory with _images suffix", async () => {
      // Make first directory exist but contain no images
      mockFs.stat.mockResolvedValueOnce({ isDirectory: () => true });
      mockFs.readdir.mockResolvedValueOnce([]); // No images in first directory
      
      // Make second and third directories not exist
      mockFs.stat
        .mockRejectedValueOnce(new Error("Not found"))
        .mockRejectedValueOnce(new Error("Not found"));
      
      // Make fourth directory exist and contain images
      mockFs.stat.mockResolvedValueOnce({ isDirectory: () => true });
      mockFs.readdir.mockResolvedValueOnce(["image1.jpg"]);
      
      mockPath.extname
        .mockReturnValueOnce(".html")
        .mockReturnValueOnce(".jpg");

      const result = await findImageDirectoryForHtmlFile("/test/dir/test.html");

      expect(result).toBe("/test/dir/test_images");
    });

    it("should find directory with .images suffix", async () => {
      // Make first 4 directories exist but contain no images
      for (let i = 0; i < 4; i++) {
        mockFs.stat.mockResolvedValueOnce({ isDirectory: () => true });
        mockFs.readdir.mockResolvedValueOnce([]); // No images
      }
      
      // Make fifth directory exist and contain images
      mockFs.stat.mockResolvedValueOnce({ isDirectory: () => true });
      mockFs.readdir.mockResolvedValueOnce(["image1.jpg"]);
      
      mockPath.extname
        .mockReturnValueOnce(".html")
        .mockReturnValueOnce(".jpg");

      const result = await findImageDirectoryForHtmlFile("/test/dir/test.html");

      expect(result).toBe("/test/dir/test.images");
    });

    it("should find generic images directory", async () => {
      // Make first 5 directories exist but contain no images
      for (let i = 0; i < 5; i++) {
        mockFs.stat.mockResolvedValueOnce({ isDirectory: () => true });
        mockFs.readdir.mockResolvedValueOnce([]); // No images
      }
      
      // Make sixth directory exist and contain images
      mockFs.stat.mockResolvedValueOnce({ isDirectory: () => true });
      mockFs.readdir.mockResolvedValueOnce(["image1.jpg"]);
      
      mockPath.extname
        .mockReturnValueOnce(".html")
        .mockReturnValueOnce(".jpg");

      const result = await findImageDirectoryForHtmlFile("/test/dir/test.html");

      expect(result).toBe("/test/dir/images");
    });

    it("should find generic assets directory", async () => {
      // Make first 6 directories exist but contain no images
      for (let i = 0; i < 6; i++) {
        mockFs.stat.mockResolvedValueOnce({ isDirectory: () => true });
        mockFs.readdir.mockResolvedValueOnce([]); // No images
      }
      
      // Make seventh directory exist and contain images
      mockFs.stat.mockResolvedValueOnce({ isDirectory: () => true });
      mockFs.readdir.mockResolvedValueOnce(["image1.jpg"]);
      
      mockPath.extname
        .mockReturnValueOnce(".html")
        .mockReturnValueOnce(".jpg");

      const result = await findImageDirectoryForHtmlFile("/test/dir/test.html");

      expect(result).toBe("/test/dir/assets");
    });

    it("should return null if no directory contains images", async () => {
      mockFs.stat.mockResolvedValue({ isDirectory: () => true });
      mockFs.readdir.mockResolvedValue([]); // No images

      const result = await findImageDirectoryForHtmlFile("/test/dir/test.html");

      expect(result).toBeNull();
    });

    it("should return null if no directory exists", async () => {
      mockFs.stat.mockRejectedValue(new Error("Not found"));

      const result = await findImageDirectoryForHtmlFile("/test/dir/test.html");

      expect(result).toBeNull();
    });
  });

  describe("findImagesForImport", () => {
    beforeEach(() => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue(["image1.jpg", "image2.png"]);
      mockFs.stat.mockResolvedValue({ size: 1024 });
      mockPath.extname.mockReturnValueOnce(".jpg").mockReturnValueOnce(".png");
    });

    it("should find images in coordinated upload directory", async () => {
      const result = await findImagesForImport("test-import-123");

      expect(result).toHaveLength(2);
      expect(result[0]?.fileName).toBe("image1.jpg");
      expect(result[0]?.filePath).toBe(
        "/Users/awehrman/projects/peas/apps/queue/uploads/images/test-import-123/image1.jpg"
      );
      expect(result[0]?.size).toBe(1024);
      expect(result[0]?.extension).toBe(".jpg");
    });

    it("should try legacy patterns if coordinated directory fails", async () => {
      mockFs.access
        .mockRejectedValueOnce(new Error("Not found")) // First path fails
        .mockResolvedValueOnce(undefined); // Second path succeeds

      const result = await findImagesForImport("test-import-123");

      expect(result).toHaveLength(2);
      expect(result[0]?.filePath).toContain(
        "public/files/test-import-123_files"
      );
    });

    it("should try .files pattern if _files fails", async () => {
      mockFs.access
        .mockRejectedValueOnce(new Error("Not found")) // First path fails
        .mockRejectedValueOnce(new Error("Not found")) // Second path fails
        .mockResolvedValueOnce(undefined); // Third path succeeds

      const result = await findImagesForImport("test-import-123");

      expect(result).toHaveLength(2);
      expect(result[0]?.filePath).toContain(
        "public/files/test-import-123.files"
      );
    });

    it("should try _images pattern if .files fails", async () => {
      // Make first 2 paths exist but contain no images
      mockFs.access.mockResolvedValueOnce(undefined); // First path exists
      mockFs.readdir.mockResolvedValueOnce([]); // No images in first path
      mockFs.access.mockResolvedValueOnce(undefined); // Second path exists
      mockFs.readdir.mockResolvedValueOnce([]); // No images in second path
      
      // Make third path exist and contain images
      mockFs.access.mockResolvedValueOnce(undefined); // Third path succeeds

      const result = await findImagesForImport("test-import-123");

      expect(result).toHaveLength(2);
      expect(result[0]?.filePath).toContain(
        "public/files/test-import-123.files"
      );
    });

    it("should try nested images directory if _images fails", async () => {
      // Make first 3 paths exist but contain no images
      for (let i = 0; i < 3; i++) {
        mockFs.access.mockResolvedValueOnce(undefined); // Path exists
        mockFs.readdir.mockResolvedValueOnce([]); // No images
      }
      
      // Make fourth path exist and contain images
      mockFs.access.mockResolvedValueOnce(undefined); // Fourth path succeeds

      const result = await findImagesForImport("test-import-123");

      expect(result).toHaveLength(2);
      expect(result[0]?.filePath).toContain(
        "public/files/test-import-123_images"
      );
    });

    it("should try generic images directory if nested fails", async () => {
      // Make first 4 paths exist but contain no images
      for (let i = 0; i < 4; i++) {
        mockFs.access.mockResolvedValueOnce(undefined); // Path exists
        mockFs.readdir.mockResolvedValueOnce([]); // No images
      }
      
      // Make fifth path exist and contain images
      mockFs.access.mockResolvedValueOnce(undefined); // Fifth path succeeds

      const result = await findImagesForImport("test-import-123");

      expect(result).toHaveLength(2);
      expect(result[0]?.filePath).toContain("public/files/test-import-123/images");
    });

    it("should try test directory as fallback", async () => {
      // Make first 6 paths exist but contain no images
      for (let i = 0; i < 6; i++) {
        mockFs.access.mockResolvedValueOnce(undefined); // Path exists
        mockFs.readdir.mockResolvedValueOnce([]); // No images
      }
      
      // Make test directory exist and contain images
      mockFs.access.mockResolvedValueOnce(undefined); // Test directory succeeds

      const result = await findImagesForImport("test-import-123");

      expect(result).toHaveLength(2);
      expect(result[0]?.filePath).toContain("uploads/test-images");
    });

    it("should return empty array if no images found", async () => {
      mockFs.access.mockRejectedValue(new Error("Not found"));

      const result = await findImagesForImport("test-import-123");

      expect(result).toEqual([]);
    });

    it("should handle errors gracefully and continue checking other paths", async () => {
      mockFs.access
        .mockRejectedValueOnce(new Error("Permission denied")) // First path fails
        .mockResolvedValueOnce(undefined); // Second path succeeds

      const result = await findImagesForImport("test-import-123");

      expect(result).toHaveLength(2);
    });
  });
});
