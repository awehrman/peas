import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createMockLogger,
  createMockQueue,
} from "../../../../../test-utils/helpers";
import type { StructuredLogger } from "../../../../../types";
import { ActionName } from "../../../../../types";
import type { NotePipelineData } from "../../../../../types/notes";
import type { BaseWorkerDependencies } from "../../../../../workers/types";
import { processImages } from "../../../../note/actions/schedule-images/service";

// Mock dependencies
vi.mock("../../../../../utils/image-utils", () => ({
  findImageDirectoryForHtmlFile: vi.fn(),
  getImageFilesWithMetadata: vi.fn(),
  findImagesForImport: vi.fn(),
}));

vi.mock("../../../../note/actions/track-completion/service", () => ({
  setTotalImageJobs: vi.fn(),
}));

vi.mock("fs", () => ({
  promises: {
    access: vi.fn(),
    readdir: vi.fn(),
  },
}));

vi.mock("path", () => ({
  default: {
    join: vi.fn((...args: string[]) => args.join("/")),
    cwd: vi.fn(() => "/test/cwd"),
  },
  join: vi.fn((...args: string[]) => args.join("/")),
  cwd: vi.fn(() => "/test/cwd"),
}));

// Mock process.cwd before any imports
process.cwd = vi.fn(() => "/test/cwd");

describe("Schedule Images Service", () => {
  let mockLogger: StructuredLogger;
  let mockQueues: BaseWorkerDependencies["queues"];
  let mockImageQueue: ReturnType<typeof createMockQueue>;
  let mockData: NotePipelineData;

  // Import mocked functions
  let findImageDirectoryForHtmlFile: ReturnType<typeof vi.fn>;
  let getImageFilesWithMetadata: ReturnType<typeof vi.fn>;
  let findImagesForImport: ReturnType<typeof vi.fn>;
  let setTotalImageJobs: ReturnType<typeof vi.fn>;
  let access: ReturnType<typeof vi.fn>;
  let readdir: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Get mocked functions
    const imageUtils = await import("../../../../../utils/image-utils");
    const trackCompletion = await import(
      "../../../../note/actions/track-completion/service"
    );
    const fs = await import("fs");

    findImageDirectoryForHtmlFile = vi.mocked(
      imageUtils.findImageDirectoryForHtmlFile
    );
    getImageFilesWithMetadata = vi.mocked(imageUtils.getImageFilesWithMetadata);
    findImagesForImport = vi.mocked(imageUtils.findImagesForImport);
    setTotalImageJobs = vi.mocked(trackCompletion.setTotalImageJobs);
    access = vi.mocked(fs.promises.access);
    readdir = vi.mocked(fs.promises.readdir);

    mockLogger = createMockLogger();
    mockImageQueue = createMockQueue("image-queue");
    mockQueues = {
      imageQueue: mockImageQueue,
    } as BaseWorkerDependencies["queues"];

    mockData = {
      noteId: "test-note-123",
      importId: "test-import-456",
      content: "<html><body>Test content</body></html>",
      metadata: {},
    };

    // Reset all mocks
    findImageDirectoryForHtmlFile.mockResolvedValue(null);
    getImageFilesWithMetadata.mockResolvedValue([]);
    findImagesForImport.mockResolvedValue([]);
    setTotalImageJobs.mockImplementation(() => {});
    access.mockResolvedValue(undefined);
    readdir.mockResolvedValue([]);
  });

  describe("processImages", () => {
    describe("input validation", () => {
      it("should throw error when noteId is missing", async () => {
        const dataWithoutNoteId = { ...mockData, noteId: undefined };

        await expect(
          processImages(dataWithoutNoteId, mockLogger, mockQueues)
        ).rejects.toThrow("No note ID available for image processing");
      });
    });

    describe("Method 1: HTML file association", () => {
      it("should find images via originalFilePath", async () => {
        const dataWithFilePath = {
          ...mockData,
          metadata: { originalFilePath: "/test/path/recipe.html" },
        };

        const mockImageFiles = [
          {
            fileName: "image1.jpg",
            filePath: "/test/path/images/image1.jpg",
            size: 1024,
            extension: ".jpg",
          },
          {
            fileName: "image2.png",
            filePath: "/test/path/images/image2.png",
            size: 2048,
            extension: ".png",
          },
        ];

        vi.mocked(findImageDirectoryForHtmlFile).mockResolvedValue(
          "/test/path/images"
        );
        vi.mocked(getImageFilesWithMetadata).mockResolvedValue(mockImageFiles);

        const result = await processImages(
          dataWithFilePath,
          mockLogger,
          mockQueues
        );

        expect(findImageDirectoryForHtmlFile).toHaveBeenCalledWith(
          "/test/path/recipe.html"
        );
        expect(getImageFilesWithMetadata).toHaveBeenCalledWith(
          "/test/path/images"
        );
        expect(setTotalImageJobs).toHaveBeenCalledWith(
          "test-note-123",
          2,
          mockLogger
        );
        expect(mockImageQueue.add).toHaveBeenCalledTimes(2);
        expect(result).toEqual(dataWithFilePath);
      });

      it("should handle case when no image directory found via originalFilePath", async () => {
        const dataWithFilePath = {
          ...mockData,
          metadata: { originalFilePath: "/test/path/recipe.html" },
        };

        findImageDirectoryForHtmlFile.mockResolvedValue(null);
        findImagesForImport.mockResolvedValue([]);
        // Mock all fs.access calls to fail so Method 3 doesn't find images
        access.mockRejectedValue(new Error("Not found"));

        await processImages(dataWithFilePath, mockLogger, mockQueues);

        expect(findImageDirectoryForHtmlFile).toHaveBeenCalledWith(
          "/test/path/recipe.html"
        );
        expect(getImageFilesWithMetadata).not.toHaveBeenCalled();
        expect(findImagesForImport).toHaveBeenCalledWith("test-import-456");
      });
    });

    describe("Method 2: Enhanced image detection", () => {
      it("should find images via enhanced detection when Method 1 fails", async () => {
        const dataWithFilePath = {
          ...mockData,
          metadata: { originalFilePath: "/test/path/recipe.html" },
        };

        const mockImageFiles = [
          {
            fileName: "image1.jpg",
            filePath: "/uploads/images/test-import-456/image1.jpg",
            size: 1024,
            extension: ".jpg",
          },
        ];

        vi.mocked(findImageDirectoryForHtmlFile).mockResolvedValue(null);
        vi.mocked(findImagesForImport).mockResolvedValue(mockImageFiles);

        const result = await processImages(
          dataWithFilePath,
          mockLogger,
          mockQueues
        );

        expect(findImagesForImport).toHaveBeenCalledWith("test-import-456");
        expect(setTotalImageJobs).toHaveBeenCalledWith(
          "test-note-123",
          1,
          mockLogger
        );
        expect(mockImageQueue.add).toHaveBeenCalledTimes(1);
        expect(result).toEqual(dataWithFilePath);
      });

      it("should skip enhanced detection when Method 1 succeeds", async () => {
        const dataWithFilePath = {
          ...mockData,
          metadata: { originalFilePath: "/test/path/recipe.html" },
        };

        const mockImageFiles = [
          {
            fileName: "image1.jpg",
            filePath: "/test/path/images/image1.jpg",
            size: 1024,
            extension: ".jpg",
          },
        ];

        vi.mocked(findImageDirectoryForHtmlFile).mockResolvedValue(
          "/test/path/images"
        );
        vi.mocked(getImageFilesWithMetadata).mockResolvedValue(mockImageFiles);

        await processImages(dataWithFilePath, mockLogger, mockQueues);

        expect(findImagesForImport).not.toHaveBeenCalled();
      });
    });

    describe("Method 3: Common directory patterns", () => {
      it("should check common paths when no images found via other methods", async () => {
        const mockImageFiles = [
          {
            fileName: "image1.jpg",
            filePath: "/test/cwd/uploads/images/test-import-456/image1.jpg",
            size: 1024,
            extension: ".jpg",
          },
        ];

        findImageDirectoryForHtmlFile.mockResolvedValue(null);
        findImagesForImport.mockResolvedValue([]);
        access.mockRejectedValueOnce(new Error("Not found")); // First path fails
        access.mockResolvedValueOnce(undefined); // Second path exists
        readdir.mockResolvedValueOnce(["image1.jpg", "image2.png"] as string[]);
        getImageFilesWithMetadata.mockResolvedValueOnce(mockImageFiles);

        const result = await processImages(mockData, mockLogger, mockQueues);

        expect(access).toHaveBeenCalledWith(
          "/test/cwd//public/files/test-import-456_files"
        );
        expect(getImageFilesWithMetadata).toHaveBeenCalledWith(
          "/test/cwd//public/files/test-import-456_files"
        );
        expect(setTotalImageJobs).toHaveBeenCalledWith(
          "test-note-123",
          1,
          mockLogger
        );
        expect(mockImageQueue.add).toHaveBeenCalledTimes(1);
        expect(result).toEqual(mockData);
      });

      it("should handle directory access errors gracefully", async () => {
        findImageDirectoryForHtmlFile.mockResolvedValue(null);
        findImagesForImport.mockResolvedValue([]);
        access.mockRejectedValue(new Error("Access denied"));

        const result = await processImages(mockData, mockLogger, mockQueues);

        expect(setTotalImageJobs).toHaveBeenCalledWith(
          "test-note-123",
          0,
          mockLogger
        );
        expect(mockImageQueue.add).not.toHaveBeenCalled();
        expect(result).toEqual(mockData);
      });

      it("should handle readdir errors gracefully", async () => {
        findImageDirectoryForHtmlFile.mockResolvedValue(null);
        findImagesForImport.mockResolvedValue([]);
        access.mockResolvedValue(undefined);
        readdir.mockRejectedValue(new Error("Cannot read directory"));

        const result = await processImages(mockData, mockLogger, mockQueues);

        expect(setTotalImageJobs).toHaveBeenCalledWith(
          "test-note-123",
          0,
          mockLogger
        );
        expect(mockImageQueue.add).not.toHaveBeenCalled();
        expect(result).toEqual(mockData);
      });

      it("should continue checking paths when one path has no images", async () => {
        findImageDirectoryForHtmlFile.mockResolvedValue(null);
        findImagesForImport.mockResolvedValue([]);
        access.mockResolvedValue(undefined);
        readdir.mockResolvedValue(["image1.jpg"] as string[]);
        getImageFilesWithMetadata
          .mockResolvedValueOnce([]) // First path has no images
          .mockResolvedValueOnce([
            {
              fileName: "image1.jpg",
              filePath:
                "/test/cwd/public/files/test-import-456_files/image1.jpg",
              size: 1024,
              extension: ".jpg",
            },
          ]); // Second path has images

        const result = await processImages(mockData, mockLogger, mockQueues);

        expect(getImageFilesWithMetadata).toHaveBeenCalledTimes(2);
        expect(setTotalImageJobs).toHaveBeenCalledWith(
          "test-note-123",
          1,
          mockLogger
        );
        expect(mockImageQueue.add).toHaveBeenCalledTimes(1);
        expect(result).toEqual(mockData);
      });
    });

    describe("no images found", () => {
      it("should handle case when no images are found by any method", async () => {
        findImageDirectoryForHtmlFile.mockResolvedValue(null);
        findImagesForImport.mockResolvedValue([]);
        access.mockRejectedValue(new Error("Not found"));

        const result = await processImages(mockData, mockLogger, mockQueues);

        expect(setTotalImageJobs).toHaveBeenCalledWith(
          "test-note-123",
          0,
          mockLogger
        );
        expect(mockImageQueue.add).not.toHaveBeenCalled();
        expect(result).toEqual(mockData);
      });
    });

    describe("image queue scheduling", () => {
      it("should schedule image jobs with correct data structure", async () => {
        const mockImageFiles = [
          {
            fileName: "image1.jpg",
            filePath: "/test/path/image1.jpg",
            size: 1024,
            extension: ".jpg",
          },
          {
            fileName: "image2.png",
            filePath: "/test/path/image2.png",
            size: 2048,
            extension: ".png",
          },
        ];

        findImageDirectoryForHtmlFile.mockResolvedValue("/test/path");
        getImageFilesWithMetadata.mockResolvedValue(mockImageFiles);

        await processImages(mockData, mockLogger, mockQueues);

        expect(mockImageQueue.add).toHaveBeenCalledTimes(2);

        // Check first job
        expect(mockImageQueue.add).toHaveBeenNthCalledWith(
          1,
          ActionName.UPLOAD_ORIGINAL,
          {
            noteId: "test-note-123",
            importId: "test-import-456",
            imagePath: "/test/path/image1.jpg",
            filename: "image1.jpg",
            outputDir: "/test/cwd/uploads/processed",
            originalPath: "",
            thumbnailPath: "",
            crop3x2Path: "",
            crop4x3Path: "",
            crop16x9Path: "",
            originalSize: 0,
            thumbnailSize: 0,
            crop3x2Size: 0,
            crop4x3Size: 0,
            crop16x9Size: 0,
            metadata: {
              width: 0,
              height: 0,
              format: "unknown",
            },
            r2Key: undefined,
            r2Url: undefined,
          }
        );

        // Check second job
        expect(mockImageQueue.add).toHaveBeenNthCalledWith(
          2,
          ActionName.UPLOAD_ORIGINAL,
          {
            noteId: "test-note-123",
            importId: "test-import-456",
            imagePath: "/test/path/image2.png",
            filename: "image2.png",
            outputDir: "/test/cwd/uploads/processed",
            originalPath: "",
            thumbnailPath: "",
            crop3x2Path: "",
            crop4x3Path: "",
            crop16x9Path: "",
            originalSize: 0,
            thumbnailSize: 0,
            crop3x2Size: 0,
            crop4x3Size: 0,
            crop16x9Size: 0,
            metadata: {
              width: 0,
              height: 0,
              format: "unknown",
            },
            r2Key: undefined,
            r2Url: undefined,
          }
        );
      });

      it("should throw error when image queue is not available", async () => {
        const mockImageFiles = [
          {
            fileName: "image1.jpg",
            filePath: "/test/path/image1.jpg",
            size: 1024,
            extension: ".jpg",
          },
        ];

        findImageDirectoryForHtmlFile.mockResolvedValue("/test/path");
        getImageFilesWithMetadata.mockResolvedValue(mockImageFiles);

        const queuesWithoutImageQueue = {
          ...mockQueues,
          imageQueue: undefined,
        };

        await expect(
          processImages(mockData, mockLogger, queuesWithoutImageQueue)
        ).rejects.toThrow("Image queue not available in dependencies");
      });
    });

    describe("error handling", () => {
      it("should handle errors gracefully and continue processing", async () => {
        const error = new Error("Test error");
        // Mock the first method to throw an error
        findImageDirectoryForHtmlFile.mockRejectedValue(error);
        // Ensure no images are found so the service continues to other methods
        findImagesForImport.mockResolvedValue([]);
        // Mock all fs.access calls to fail so Method 3 doesn't find images
        access.mockRejectedValue(new Error("Not found"));
        // Mock getImageFilesWithMetadata to return empty array
        getImageFilesWithMetadata.mockResolvedValue([]);

        const result = await processImages(mockData, mockLogger, mockQueues);

        // The service should handle the error gracefully and return the data
        expect(result).toEqual(mockData);
        expect(setTotalImageJobs).toHaveBeenCalledWith(
          "test-note-123",
          0,
          mockLogger
        );
      });

      it("should handle errors in image queue scheduling", async () => {
        const mockImageFiles = [
          {
            fileName: "image1.jpg",
            filePath: "/test/path/image1.jpg",
            size: 1024,
            extension: ".jpg",
          },
        ];

        findImageDirectoryForHtmlFile.mockResolvedValue("/test/path");
        getImageFilesWithMetadata.mockResolvedValue(mockImageFiles);
        vi.mocked(mockImageQueue.add).mockRejectedValue(
          new Error("Queue error")
        );

        await expect(
          processImages(mockData, mockLogger, mockQueues)
        ).rejects.toThrow("Queue error");

        expect(mockLogger.log).toHaveBeenCalledWith(
          "[SCHEDULE_IMAGES] Failed to schedule images: Error: Queue error"
        );
      });
    });

    describe("logging", () => {
      it("should log appropriate messages throughout the process", async () => {
        const mockImageFiles = [
          {
            fileName: "image1.jpg",
            filePath: "/test/path/image1.jpg",
            size: 1024,
            extension: ".jpg",
          },
        ];

        const dataWithFilePath = {
          ...mockData,
          metadata: { originalFilePath: "/test/path/recipe.html" },
        };

        findImageDirectoryForHtmlFile.mockResolvedValue("/test/path");
        getImageFilesWithMetadata.mockResolvedValue(mockImageFiles);

        await processImages(dataWithFilePath, mockLogger, mockQueues);

        expect(mockLogger.log).toHaveBeenCalledWith(
          "[SCHEDULE_IMAGES] Starting image processing for note: test-note-123"
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
          "[SCHEDULE_IMAGES] Found image directory: /test/path"
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
          "[SCHEDULE_IMAGES] Found 1 image files to process"
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
          "[SCHEDULE_IMAGES] Processing image 1/1: image1.jpg"
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
          "[SCHEDULE_IMAGES] Adding job to queue for image 0: image1.jpg"
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
          "[SCHEDULE_IMAGES] Successfully scheduled 1 image jobs"
        );
      });

      it("should log when no images are found", async () => {
        vi.mocked(findImageDirectoryForHtmlFile).mockResolvedValue(null);
        vi.mocked(findImagesForImport).mockResolvedValue([]);
        vi.mocked(access).mockRejectedValue(new Error("Not found"));

        await processImages(mockData, mockLogger, mockQueues);

        expect(mockLogger.log).toHaveBeenCalledWith(
          "[SCHEDULE_IMAGES] No image files found for note: test-note-123"
        );
      });
    });
  });
});
