import { describe, it, expect, beforeEach, vi } from "vitest";
import { ProcessImageAction } from "../process-image";
import { ActionContext } from "../../../core/types";

describe("ProcessImageAction", () => {
  let action: ProcessImageAction;
  let mockContext: ActionContext;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock console.log to avoid noise in tests
    vi.spyOn(console, "log").mockImplementation(() => {});

    mockContext = {
      jobId: "test-job-123",
      retryCount: 0,
      queueName: "test-queue",
      operation: "test-operation",
      startTime: Date.now(),
      workerName: "test-worker",
      attemptNumber: 1,
    };

    action = new ProcessImageAction();
  });

  describe("execute", () => {
    it("should process image with URL successfully", async () => {
      const input = {
        noteId: "test-note-123",
        imageUrl: "https://example.com/original-image.jpg",
        imageType: "image/jpeg",
        fileName: "original-image.jpg",
      };

      const result = await action.execute(input, {}, mockContext);

      expect(result).toEqual({
        success: true,
        processedImageUrl: "https://example.com/original-image.jpg",
        thumbnailUrl: "https://example.com/thumbnails/test-note-123.jpg",
        imageMetadata: {
          width: 800,
          height: 600,
          size: 102400,
          format: "JPEG",
        },
        processingTime: 100,
      });

      expect(console.log).toHaveBeenCalledWith(
        "Processing image for note test-note-123:",
        {
          hasImageUrl: true,
          hasImageData: false,
          imageType: "image/jpeg",
          fileName: "original-image.jpg",
        }
      );
    });

    it("should process image with base64 data successfully", async () => {
      const input = {
        noteId: "test-note-456",
        imageData:
          "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=",
        imageType: "image/jpeg",
        fileName: "base64-image.jpg",
      };

      const result = await action.execute(input, {}, mockContext);

      expect(result).toEqual({
        success: true,
        processedImageUrl: "https://example.com/processed/test-note-456.jpg",
        thumbnailUrl: "https://example.com/thumbnails/test-note-456.jpg",
        imageMetadata: {
          width: 800,
          height: 600,
          size: 102400,
          format: "JPEG",
        },
        processingTime: 100,
      });

      expect(console.log).toHaveBeenCalledWith(
        "Processing image for note test-note-456:",
        {
          hasImageUrl: false,
          hasImageData: true,
          imageType: "image/jpeg",
          fileName: "base64-image.jpg",
        }
      );
    });

    it("should process image with minimal input", async () => {
      const input = {
        noteId: "test-note-789",
      };

      const result = await action.execute(input, {}, mockContext);

      expect(result).toEqual({
        success: true,
        processedImageUrl: "https://example.com/processed/test-note-789.jpg",
        thumbnailUrl: "https://example.com/thumbnails/test-note-789.jpg",
        imageMetadata: {
          width: 800,
          height: 600,
          size: 102400,
          format: "JPEG",
        },
        processingTime: 100,
      });

      expect(console.log).toHaveBeenCalledWith(
        "Processing image for note test-note-789:",
        {
          hasImageUrl: false,
          hasImageData: false,
          imageType: undefined,
          fileName: undefined,
        }
      );
    });

    it("should process image with different image types", async () => {
      const input = {
        noteId: "test-note-101",
        imageUrl: "https://example.com/png-image.png",
        imageType: "image/png",
        fileName: "png-image.png",
      };

      const result = await action.execute(input, {}, mockContext);

      expect(result).toEqual({
        success: true,
        processedImageUrl: "https://example.com/png-image.png",
        thumbnailUrl: "https://example.com/thumbnails/test-note-101.jpg",
        imageMetadata: {
          width: 800,
          height: 600,
          size: 102400,
          format: "JPEG",
        },
        processingTime: 100,
      });
    });

    it("should process image with webp format", async () => {
      const input = {
        noteId: "test-note-202",
        imageUrl: "https://example.com/webp-image.webp",
        imageType: "image/webp",
        fileName: "webp-image.webp",
      };

      const result = await action.execute(input, {}, mockContext);

      expect(result).toEqual({
        success: true,
        processedImageUrl: "https://example.com/webp-image.webp",
        thumbnailUrl: "https://example.com/thumbnails/test-note-202.jpg",
        imageMetadata: {
          width: 800,
          height: 600,
          size: 102400,
          format: "JPEG",
        },
        processingTime: 100,
      });
    });

    it("should handle image with special characters in filename", async () => {
      const input = {
        noteId: "test-note-303",
        imageUrl: "https://example.com/special-chars!@#$%^&*().jpg",
        imageType: "image/jpeg",
        fileName: "special-chars!@#$%^&*().jpg",
      };

      const result = await action.execute(input, {}, mockContext);

      expect(result).toEqual({
        success: true,
        processedImageUrl: "https://example.com/special-chars!@#$%^&*().jpg",
        thumbnailUrl: "https://example.com/thumbnails/test-note-303.jpg",
        imageMetadata: {
          width: 800,
          height: 600,
          size: 102400,
          format: "JPEG",
        },
        processingTime: 100,
      });
    });

    it("should handle very long noteId", async () => {
      const longNoteId = "a".repeat(1000);
      const input = {
        noteId: longNoteId,
        imageUrl: "https://example.com/long-note-image.jpg",
      };

      const result = await action.execute(input, {}, mockContext);

      expect(result).toEqual({
        success: true,
        processedImageUrl: "https://example.com/long-note-image.jpg",
        thumbnailUrl: `https://example.com/thumbnails/${longNoteId}.jpg`,
        imageMetadata: {
          width: 800,
          height: 600,
          size: 102400,
          format: "JPEG",
        },
        processingTime: 100,
      });
    });

    it("should handle image with logger dependency", async () => {
      const mockLogger = {
        log: vi.fn(),
      };

      const input = {
        noteId: "test-note-404",
        imageUrl: "https://example.com/logger-test.jpg",
        imageType: "image/jpeg",
        fileName: "logger-test.jpg",
      };

      const result = await action.execute(
        input,
        { logger: mockLogger },
        mockContext
      );

      expect(result).toEqual({
        success: true,
        processedImageUrl: "https://example.com/logger-test.jpg",
        thumbnailUrl: "https://example.com/thumbnails/test-note-404.jpg",
        imageMetadata: {
          width: 800,
          height: 600,
          size: 102400,
          format: "JPEG",
        },
        processingTime: 100,
      });

      expect(mockLogger.log).toHaveBeenCalledWith(
        "Processing image for note test-note-404: hasImageUrl=true, hasImageData=false, imageType=image/jpeg, fileName=logger-test.jpg"
      );
    });

    it("should handle processing error", async () => {
      // Create a mock action that throws an error during processing
      const errorAction = new ProcessImageAction();

      // Mock the setTimeout to throw an error
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.spyOn(global, "setTimeout").mockImplementation((_callback: any) => {
        throw new Error("Image processing failed");
      });

      const input = {
        noteId: "test-note-505",
        imageUrl: "https://example.com/error-image.jpg",
      };

      await expect(errorAction.execute(input, {}, mockContext)).rejects.toThrow(
        "Image processing failed: Error: Image processing failed"
      );

      // Restore setTimeout
      vi.restoreAllMocks();
    });

    it("should handle empty strings gracefully", async () => {
      const input = {
        noteId: "",
        imageUrl: "",
        imageData: "",
        imageType: "",
        fileName: "",
      };

      const result = await action.execute(input, {}, mockContext);

      expect(result).toEqual({
        success: true,
        processedImageUrl: "https://example.com/processed/.jpg",
        thumbnailUrl: "https://example.com/thumbnails/.jpg",
        imageMetadata: {
          width: 800,
          height: 600,
          size: 102400,
          format: "JPEG",
        },
        processingTime: 100,
      });
    });

    it("should handle null and undefined values", async () => {
      const input = {
        noteId: "test-note-606",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        imageUrl: null as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        imageData: undefined as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        imageType: null as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fileName: undefined as any,
      };

      const result = await action.execute(input, {}, mockContext);

      expect(result).toEqual({
        success: true,
        processedImageUrl: "https://example.com/processed/test-note-606.jpg",
        thumbnailUrl: "https://example.com/thumbnails/test-note-606.jpg",
        imageMetadata: {
          width: 800,
          height: 600,
          size: 102400,
          format: "JPEG",
        },
        processingTime: 100,
      });
    });
  });

  describe("action properties", () => {
    it("should have correct name", () => {
      expect(action.name).toBe("process-image");
    });

    it("should be retryable by default", () => {
      expect(action.retryable).toBe(true);
    });

    it("should have default priority", () => {
      expect(action.priority).toBe(0);
    });
  });

  describe("processing time simulation", () => {
    it("should simulate processing time correctly", async () => {
      const startTime = Date.now();

      const input = {
        noteId: "test-note-707",
        imageUrl: "https://example.com/timing-test.jpg",
      };

      const result = await action.execute(input, {}, mockContext);

      const endTime = Date.now();
      const actualProcessingTime = endTime - startTime;

      expect(result.processingTime).toBe(100);
      // Allow for small timing variations due to JavaScript event loop precision
      expect(actualProcessingTime).toBeGreaterThanOrEqual(95);
    });
  });

  describe("integration scenarios", () => {
    it("should handle multiple image processing operations", async () => {
      const images = [
        { noteId: "test-note-801", imageUrl: "https://example.com/image1.jpg" },
        { noteId: "test-note-802", imageUrl: "https://example.com/image2.jpg" },
        { noteId: "test-note-803", imageUrl: "https://example.com/image3.jpg" },
      ];

      const results = await Promise.all(
        images.map((image) => action.execute(image, {}, mockContext))
      );

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.processedImageUrl).toBe(images[index]?.imageUrl);
        expect(result.thumbnailUrl).toBe(
          `https://example.com/thumbnails/${images[index]?.noteId}.jpg`
        );
        expect(result.imageMetadata).toEqual({
          width: 800,
          height: 600,
          size: 102400,
          format: "JPEG",
        });
        expect(result.processingTime).toBe(100);
      });
    });
  });
});
