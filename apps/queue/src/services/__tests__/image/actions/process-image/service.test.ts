import { promises as fs } from "fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createMockLogger } from "../../../../../test-utils/helpers";
import { LogLevel } from "../../../../../types";
import type { ImageJobData } from "../../../../../workers/image/types";
import { processImage } from "../../../../image/actions/process-image/service";

// Mock dependencies
vi.mock("fs/promises", () => ({
  default: {
    access: vi.fn(),
  },
  access: vi.fn(),
}));

vi.mock("../../../../../utils/image-processor", () => ({
  ImageProcessor: vi.fn(),
}));

describe("Process Image Service", () => {
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockData: ImageJobData;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockImageProcessor: any;
  let mockFsAccess: ReturnType<typeof vi.fn>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockImageProcessorClass: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Get mocked functions
    const fsModule = vi.mocked(fs);
    mockFsAccess = vi.mocked(fsModule.access);

    // Also mock the default export
    const fsDefaultModule = vi.mocked(await import("fs/promises"));
    mockFsAccess = vi.mocked(fsDefaultModule.access);

    // Create mock logger
    mockLogger = createMockLogger();

    // Create mock image processor
    mockImageProcessor = {
      processImage: vi.fn(),
    };

    // Create mock ImageProcessor class
    mockImageProcessorClass = vi
      .fn()
      .mockImplementation(() => mockImageProcessor);

    // Mock the ImageProcessor import
    const imageProcessorModule = vi.mocked(
      await import("../../../../../utils/image-processor")
    );
    imageProcessorModule.ImageProcessor = mockImageProcessorClass;

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
    mockImageProcessor.processImage.mockResolvedValue({
      originalPath: "/path/to/output/original.jpg",
      thumbnailPath: "/path/to/output/thumbnail.jpg",
      crop3x2Path: "/path/to/output/crop3x2.jpg",
      crop4x3Path: "/path/to/output/crop4x3.jpg",
      crop16x9Path: "/path/to/output/crop16x9.jpg",
      originalSize: 2048,
      thumbnailSize: 1024,
      crop3x2Size: 1536,
      crop4x3Size: 1536,
      crop16x9Size: 1536,
      metadata: {
        width: 1920,
        height: 1080,
        format: "jpeg",
      },
    });
  });

  describe("processImage", () => {
    describe("successful processing", () => {
      it("should process image successfully", async () => {
        const result = await processImage(mockData, mockLogger);

        expect(mockLogger.log).toHaveBeenCalledWith(
          "[PROCESS_IMAGE] Starting image processing for note: test-note-123"
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
          "[PROCESS_IMAGE] Input path: /path/to/image.jpg"
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
          "[PROCESS_IMAGE] Filename: image.jpg"
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
          "[PROCESS_IMAGE] Output directory: /path/to/output"
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
          expect.stringMatching(
            /\[PROCESS_IMAGE\] Image processing completed in \d+ms/
          )
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
          "[PROCESS_IMAGE] Original size: 2048 bytes"
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
          "[PROCESS_IMAGE] Thumbnail size: 1024 bytes"
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
          "[PROCESS_IMAGE] 3:2 crop size: 1536 bytes"
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
          "[PROCESS_IMAGE] 4:3 crop size: 1536 bytes"
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
          "[PROCESS_IMAGE] 16:9 crop size: 1536 bytes"
        );

        expect(mockFsAccess).toHaveBeenCalledWith("/path/to/image.jpg");
        expect(mockImageProcessorClass).toHaveBeenCalledWith({}, mockLogger);
        expect(mockImageProcessor.processImage).toHaveBeenCalledWith(
          "/path/to/image.jpg",
          "/path/to/output",
          "image.jpg"
        );

        expect(result).toEqual({
          ...mockData,
          originalPath: "/path/to/output/original.jpg",
          thumbnailPath: "/path/to/output/thumbnail.jpg",
          crop3x2Path: "/path/to/output/crop3x2.jpg",
          crop4x3Path: "/path/to/output/crop4x3.jpg",
          crop16x9Path: "/path/to/output/crop16x9.jpg",
          originalSize: 2048,
          thumbnailSize: 1024,
          crop3x2Size: 1536,
          crop4x3Size: 1536,
          crop16x9Size: 1536,
          metadata: {
            width: 1920,
            height: 1080,
            format: "jpeg",
          },
        });
      });

      it("should handle different file formats", async () => {
        mockData.filename = "image.png";
        mockData.metadata.format = "png";

        const result = await processImage(mockData, mockLogger);

        expect(mockLogger.log).toHaveBeenCalledWith(
          "[PROCESS_IMAGE] Filename: image.png"
        );
        expect(mockImageProcessor.processImage).toHaveBeenCalledWith(
          "/path/to/image.jpg",
          "/path/to/output",
          "image.png"
        );

        expect(result.filename).toBe("image.png");
        expect(result.metadata.format).toBe("jpeg"); // Updated by processor
      });

      it("should handle different image dimensions", async () => {
        mockData.metadata.width = 800;
        mockData.metadata.height = 600;

        const result = await processImage(mockData, mockLogger);

        expect(mockImageProcessor.processImage).toHaveBeenCalledWith(
          "/path/to/image.jpg",
          "/path/to/output",
          "image.jpg"
        );

        expect(result.metadata.width).toBe(1920); // Updated by processor
        expect(result.metadata.height).toBe(1080); // Updated by processor
      });
    });

    describe("file access errors", () => {
      it("should handle file not found error", async () => {
        mockFsAccess.mockRejectedValue(new Error("File not found"));

        await expect(processImage(mockData, mockLogger)).rejects.toThrow(
          "Input file not found or not accessible: /path/to/image.jpg"
        );

        expect(mockLogger.log).toHaveBeenCalledWith(
          expect.stringMatching(
            /\[PROCESS_IMAGE\] Image processing failed after \d+ms: Input file not found or not accessible: \/path\/to\/image\.jpg/
          )
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
          "[PROCESS_IMAGE] Error details:",
          LogLevel.ERROR,
          expect.objectContaining({
            error: "Input file not found or not accessible: /path/to/image.jpg",
            noteId: "test-note-123",
            importId: "test-import-456",
            imagePath: "/path/to/image.jpg",
            filename: "image.jpg",
            processingTime: expect.any(Number),
          })
        );
      });

      it("should handle file permission error", async () => {
        mockFsAccess.mockRejectedValue(new Error("Permission denied"));

        await expect(processImage(mockData, mockLogger)).rejects.toThrow(
          "Input file not found or not accessible: /path/to/image.jpg"
        );

        expect(mockLogger.log).toHaveBeenCalledWith(
          expect.stringMatching(
            /\[PROCESS_IMAGE\] Image processing failed after \d+ms: Input file not found or not accessible: \/path\/to\/image\.jpg/
          )
        );
      });
    });

    describe("image processing errors", () => {
      it("should handle image processor errors", async () => {
        mockImageProcessor.processImage.mockRejectedValue(
          new Error("Processing failed")
        );

        await expect(processImage(mockData, mockLogger)).rejects.toThrow(
          "Processing failed"
        );

        expect(mockLogger.log).toHaveBeenCalledWith(
          expect.stringMatching(
            /\[PROCESS_IMAGE\] Image processing failed after \d+ms: Processing failed/
          )
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
          "[PROCESS_IMAGE] Error details:",
          LogLevel.ERROR,
          expect.objectContaining({
            error: "Processing failed",
            noteId: "test-note-123",
            importId: "test-import-456",
            imagePath: "/path/to/image.jpg",
            filename: "image.jpg",
            processingTime: expect.any(Number),
          })
        );
      });

      it("should handle extract_area errors specifically", async () => {
        mockImageProcessor.processImage.mockRejectedValue(
          new Error("extract_area failed: invalid dimensions")
        );

        await expect(processImage(mockData, mockLogger)).rejects.toThrow(
          "extract_area failed: invalid dimensions"
        );

        expect(mockLogger.log).toHaveBeenCalledWith(
          expect.stringMatching(
            /\[PROCESS_IMAGE\] Image processing failed after \d+ms: extract_area failed: invalid dimensions/
          )
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
          "[PROCESS_IMAGE] Extract area error detected - this may be due to invalid image dimensions or format"
        );
      });

      it("should handle non-Error exceptions", async () => {
        mockImageProcessor.processImage.mockRejectedValue("String error");

        await expect(processImage(mockData, mockLogger)).rejects.toThrow(
          "String error"
        );

        expect(mockLogger.log).toHaveBeenCalledWith(
          expect.stringMatching(
            /\[PROCESS_IMAGE\] Image processing failed after \d+ms: String error/
          )
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
          "[PROCESS_IMAGE] Error details:",
          LogLevel.ERROR,
          expect.objectContaining({
            error: "String error",
            noteId: "test-note-123",
            importId: "test-import-456",
            imagePath: "/path/to/image.jpg",
            filename: "image.jpg",
            processingTime: expect.any(Number),
          })
        );
      });

      it("should handle error with undefined noteId and importId", async () => {
        const dataWithUndefinedIds = {
          ...mockData,
          noteId: undefined,
          importId: undefined,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any;

        mockImageProcessor.processImage.mockRejectedValue(
          new Error("Processing failed")
        );

        await expect(
          processImage(dataWithUndefinedIds, mockLogger)
        ).rejects.toThrow("Processing failed");

        expect(mockLogger.log).toHaveBeenCalledWith(
          "[PROCESS_IMAGE] Error details:",
          LogLevel.ERROR,
          expect.objectContaining({
            error: "Processing failed",
            noteId: undefined,
            importId: undefined,
            imagePath: "/path/to/image.jpg",
            filename: "image.jpg",
            processingTime: expect.any(Number),
          })
        );
      });
    });

    describe("edge cases", () => {
      it("should handle missing noteId", async () => {
        mockData.noteId = "";

        const result = await processImage(mockData, mockLogger);

        expect(mockLogger.log).toHaveBeenCalledWith(
          "[PROCESS_IMAGE] Starting image processing for note: "
        );

        expect(result.noteId).toBe("");
      });

      it("should handle missing importId", async () => {
        mockData.importId = "";

        const result = await processImage(mockData, mockLogger);

        expect(result.importId).toBe("");
      });

      it("should handle missing imagePath", async () => {
        mockData.imagePath = "";

        const result = await processImage(mockData, mockLogger);

        // The service should still complete successfully even with empty imagePath
        // because the file access check is handled gracefully
        expect(result).toEqual({
          ...mockData,
          imagePath: "",
          originalPath: "/path/to/output/original.jpg",
          thumbnailPath: "/path/to/output/thumbnail.jpg",
          crop3x2Path: "/path/to/output/crop3x2.jpg",
          crop4x3Path: "/path/to/output/crop4x3.jpg",
          crop16x9Path: "/path/to/output/crop16x9.jpg",
          originalSize: 2048,
          thumbnailSize: 1024,
          crop3x2Size: 1536,
          crop4x3Size: 1536,
          crop16x9Size: 1536,
          metadata: {
            width: 1920,
            height: 1080,
            format: "jpeg",
          },
        });
      });

      it("should handle missing filename", async () => {
        mockData.filename = "";

        const result = await processImage(mockData, mockLogger);

        expect(mockLogger.log).toHaveBeenCalledWith(
          "[PROCESS_IMAGE] Filename: "
        );
        expect(mockImageProcessor.processImage).toHaveBeenCalledWith(
          "/path/to/image.jpg",
          "/path/to/output",
          ""
        );

        expect(result.filename).toBe("");
      });

      it("should handle missing outputDir", async () => {
        mockData.outputDir = "";

        const result = await processImage(mockData, mockLogger);

        expect(mockLogger.log).toHaveBeenCalledWith(
          "[PROCESS_IMAGE] Output directory: "
        );
        expect(mockImageProcessor.processImage).toHaveBeenCalledWith(
          "/path/to/image.jpg",
          "",
          "image.jpg"
        );

        expect(result.outputDir).toBe("");
      });

      it("should handle zero file sizes", async () => {
        mockImageProcessor.processImage.mockResolvedValue({
          originalPath: "/path/to/output/original.jpg",
          thumbnailPath: "/path/to/output/thumbnail.jpg",
          crop3x2Path: "/path/to/output/crop3x2.jpg",
          crop4x3Path: "/path/to/output/crop4x3.jpg",
          crop16x9Path: "/path/to/output/crop16x9.jpg",
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
        });

        const result = await processImage(mockData, mockLogger);

        expect(mockLogger.log).toHaveBeenCalledWith(
          "[PROCESS_IMAGE] Original size: 0 bytes"
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
          "[PROCESS_IMAGE] Thumbnail size: 0 bytes"
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
          "[PROCESS_IMAGE] 3:2 crop size: 0 bytes"
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
          "[PROCESS_IMAGE] 4:3 crop size: 0 bytes"
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
          "[PROCESS_IMAGE] 16:9 crop size: 0 bytes"
        );

        expect(result.originalSize).toBe(0);
        expect(result.thumbnailSize).toBe(0);
        expect(result.crop3x2Size).toBe(0);
        expect(result.crop4x3Size).toBe(0);
        expect(result.crop16x9Size).toBe(0);
        expect(result.metadata.width).toBe(0);
        expect(result.metadata.height).toBe(0);
        expect(result.metadata.format).toBe("unknown");
      });
    });
  });
});
