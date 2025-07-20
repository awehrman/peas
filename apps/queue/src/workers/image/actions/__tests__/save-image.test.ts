import { describe, it, expect, beforeEach, vi } from "vitest";
import { SaveImageAction } from "../save-image";
import { ActionContext } from "../../../core/types";

describe("SaveImageAction", () => {
  let action: SaveImageAction;
  let mockContext: ActionContext;

  const mockImageData = {
    success: true,
    processedImageUrl: "https://example.com/processed/test-note-123.jpg",
    thumbnailUrl: "https://example.com/thumbnails/test-note-123.jpg",
    imageMetadata: {
      width: 800,
      height: 600,
      size: 102400,
      format: "JPEG",
    },
    processingTime: 100,
  };

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

    action = new SaveImageAction();
  });

  describe("execute", () => {
    it("should save image successfully with all data", async () => {
      const input = {
        noteId: "test-note-123",
        imageData: mockImageData,
      };

      const result = await action.execute(input, {}, mockContext);

      expect(result).toEqual({
        success: true,
        imageUrl: "https://example.com/processed/test-note-123.jpg",
        thumbnailUrl: "https://example.com/thumbnails/test-note-123.jpg",
      });

      expect(console.log).toHaveBeenCalledWith(
        "Saving image data for note test-note-123:",
        {
          processedImageUrl: "https://example.com/processed/test-note-123.jpg",
          thumbnailUrl: "https://example.com/thumbnails/test-note-123.jpg",
          metadata: {
            width: 800,
            height: 600,
            size: 102400,
            format: "JPEG",
          },
        }
      );
    });

    it("should save image without thumbnail", async () => {
      const input = {
        noteId: "test-note-456",
        imageData: {
          ...mockImageData,
          thumbnailUrl: undefined,
        },
      };

      const result = await action.execute(input, {}, mockContext);

      expect(result).toEqual({
        success: true,
        imageUrl: "https://example.com/processed/test-note-123.jpg",
        thumbnailUrl: undefined,
      });
    });

    it("should save image without metadata", async () => {
      const input = {
        noteId: "test-note-789",
        imageData: {
          ...mockImageData,
          imageMetadata: undefined,
        },
      };

      const result = await action.execute(input, {}, mockContext);

      expect(result).toEqual({
        success: true,
        imageUrl: "https://example.com/processed/test-note-123.jpg",
        thumbnailUrl: "https://example.com/thumbnails/test-note-123.jpg",
      });

      expect(console.log).toHaveBeenCalledWith(
        "Saving image data for note test-note-789:",
        {
          processedImageUrl: "https://example.com/processed/test-note-123.jpg",
          thumbnailUrl: "https://example.com/thumbnails/test-note-123.jpg",
          metadata: undefined,
        }
      );
    });

    it("should save image with empty processedImageUrl", async () => {
      const input = {
        noteId: "test-note-101",
        imageData: {
          ...mockImageData,
          processedImageUrl: "",
        },
      };

      const result = await action.execute(input, {}, mockContext);

      expect(result).toEqual({
        success: true,
        imageUrl: "",
        thumbnailUrl: "https://example.com/thumbnails/test-note-123.jpg",
      });
    });

    it("should save image with null processedImageUrl", async () => {
      const input = {
        noteId: "test-note-202",
        imageData: {
          ...mockImageData,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          processedImageUrl: null as any,
        },
      };

      const result = await action.execute(input, {}, mockContext);

      expect(result).toEqual({
        success: true,
        imageUrl: "",
        thumbnailUrl: "https://example.com/thumbnails/test-note-123.jpg",
      });
    });

    it("should save image with undefined processedImageUrl", async () => {
      const input = {
        noteId: "test-note-303",
        imageData: {
          ...mockImageData,
          processedImageUrl: undefined,
        },
      };

      const result = await action.execute(input, {}, mockContext);

      expect(result).toEqual({
        success: true,
        imageUrl: "",
        thumbnailUrl: "https://example.com/thumbnails/test-note-123.jpg",
      });
    });

    it("should handle save error", async () => {
      // Create a mock action that throws an error during save
      const errorAction = new SaveImageAction();

      // Mock console.log to throw an error
      vi.spyOn(console, "log").mockImplementation(() => {
        throw new Error("Database save failed");
      });

      const input = {
        noteId: "test-note-404",
        imageData: mockImageData,
      };

      await expect(errorAction.execute(input, {}, mockContext)).rejects.toThrow(
        "Failed to save image: Error: Database save failed"
      );

      // Restore console.log
      vi.restoreAllMocks();
    });

    it("should handle empty noteId", async () => {
      const input = {
        noteId: "",
        imageData: mockImageData,
      };

      const result = await action.execute(input, {}, mockContext);

      expect(result).toEqual({
        success: true,
        imageUrl: "https://example.com/processed/test-note-123.jpg",
        thumbnailUrl: "https://example.com/thumbnails/test-note-123.jpg",
      });

      expect(console.log).toHaveBeenCalledWith("Saving image data for note :", {
        processedImageUrl: "https://example.com/processed/test-note-123.jpg",
        thumbnailUrl: "https://example.com/thumbnails/test-note-123.jpg",
        metadata: {
          width: 800,
          height: 600,
          size: 102400,
          format: "JPEG",
        },
      });
    });

    it("should handle very long noteId", async () => {
      const longNoteId = "a".repeat(1000);
      const input = {
        noteId: longNoteId,
        imageData: mockImageData,
      };

      const result = await action.execute(input, {}, mockContext);

      expect(result).toEqual({
        success: true,
        imageUrl: "https://example.com/processed/test-note-123.jpg",
        thumbnailUrl: "https://example.com/thumbnails/test-note-123.jpg",
      });
    });

    it("should handle special characters in noteId", async () => {
      const input = {
        noteId: "test-note-505-with-special-chars!@#$%",
        imageData: mockImageData,
      };

      const result = await action.execute(input, {}, mockContext);

      expect(result).toEqual({
        success: true,
        imageUrl: "https://example.com/processed/test-note-123.jpg",
        thumbnailUrl: "https://example.com/thumbnails/test-note-123.jpg",
      });
    });

    it("should handle image with complex metadata", async () => {
      const complexMetadata = {
        width: 1920,
        height: 1080,
        size: 2048000,
        format: "PNG",
        colorSpace: "sRGB",
        hasAlpha: true,
        compression: "lossless",
      };

      const input = {
        noteId: "test-note-606",
        imageData: {
          ...mockImageData,
          imageMetadata: complexMetadata,
        },
      };

      const result = await action.execute(input, {}, mockContext);

      expect(result).toEqual({
        success: true,
        imageUrl: "https://example.com/processed/test-note-123.jpg",
        thumbnailUrl: "https://example.com/thumbnails/test-note-123.jpg",
      });

      expect(console.log).toHaveBeenCalledWith(
        "Saving image data for note test-note-606:",
        {
          processedImageUrl: "https://example.com/processed/test-note-123.jpg",
          thumbnailUrl: "https://example.com/thumbnails/test-note-123.jpg",
          metadata: complexMetadata,
        }
      );
    });

    it("should handle image with very long URLs", async () => {
      const longUrl =
        "https://example.com/very/long/path/to/image/with/many/subdirectories/and/a/very/long/filename/that/exceeds/normal/lengths/image.jpg";
      const input = {
        noteId: "test-note-707",
        imageData: {
          ...mockImageData,
          processedImageUrl: longUrl,
          thumbnailUrl: longUrl.replace("image.jpg", "thumb.jpg"),
        },
      };

      const result = await action.execute(input, {}, mockContext);

      expect(result).toEqual({
        success: true,
        imageUrl: longUrl,
        thumbnailUrl: longUrl.replace("image.jpg", "thumb.jpg"),
      });
    });

    it("should handle image with different processing times", async () => {
      const input = {
        noteId: "test-note-808",
        imageData: {
          ...mockImageData,
          processingTime: 5000, // 5 seconds
        },
      };

      const result = await action.execute(input, {}, mockContext);

      expect(result).toEqual({
        success: true,
        imageUrl: "https://example.com/processed/test-note-123.jpg",
        thumbnailUrl: "https://example.com/thumbnails/test-note-123.jpg",
      });
    });

    it("should handle failed image processing", async () => {
      const failedImageData = {
        success: false,
        processedImageUrl: undefined,
        thumbnailUrl: undefined,
        imageMetadata: undefined,
        processingTime: 0,
        errorMessage: "Image processing failed",
      };

      const input = {
        noteId: "test-note-909",
        imageData: failedImageData,
      };

      const result = await action.execute(input, {}, mockContext);

      expect(result).toEqual({
        success: true,
        imageUrl: "",
        thumbnailUrl: undefined,
      });
    });
  });

  describe("action properties", () => {
    it("should have correct name", () => {
      expect(action.name).toBe("save-image");
    });

    it("should be retryable by default", () => {
      expect(action.retryable).toBe(true);
    });

    it("should have default priority", () => {
      expect(action.priority).toBe(0);
    });
  });

  describe("integration scenarios", () => {
    it("should handle multiple image save operations", async () => {
      const images = [
        {
          noteId: "test-note-1001",
          imageData: {
            ...mockImageData,
            processedImageUrl: "https://example.com/processed/image1.jpg",
            thumbnailUrl: "https://example.com/thumbnails/image1.jpg",
          },
        },
        {
          noteId: "test-note-1002",
          imageData: {
            ...mockImageData,
            processedImageUrl: "https://example.com/processed/image2.jpg",
            thumbnailUrl: "https://example.com/thumbnails/image2.jpg",
          },
        },
        {
          noteId: "test-note-1003",
          imageData: {
            ...mockImageData,
            processedImageUrl: "https://example.com/processed/image3.jpg",
            thumbnailUrl: "https://example.com/thumbnails/image3.jpg",
          },
        },
      ];

      const results = await Promise.all(
        images.map((image) => action.execute(image, {}, mockContext))
      );

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.imageUrl).toBe(
          images[index]?.imageData.processedImageUrl
        );
        expect(result.thumbnailUrl).toBe(images[index]?.imageData.thumbnailUrl);
      });
    });

    it("should handle mixed success/failure scenarios", async () => {
      const mixedImages = [
        {
          noteId: "test-note-2001",
          imageData: {
            success: true,
            processedImageUrl: "https://example.com/processed/success.jpg",
            thumbnailUrl: "https://example.com/thumbnails/success.jpg",
            imageMetadata: {
              width: 800,
              height: 600,
              size: 102400,
              format: "JPEG",
            },
            processingTime: 100,
          },
        },
        {
          noteId: "test-note-2002",
          imageData: {
            success: false,
            processedImageUrl: undefined,
            thumbnailUrl: undefined,
            imageMetadata: undefined,
            processingTime: 0,
            errorMessage: "Processing failed",
          },
        },
        {
          noteId: "test-note-2003",
          imageData: {
            success: true,
            processedImageUrl:
              "https://example.com/processed/another-success.jpg",
            thumbnailUrl: undefined,
            imageMetadata: {
              width: 400,
              height: 300,
              size: 51200,
              format: "PNG",
            },
            processingTime: 50,
          },
        },
      ];

      const results = await Promise.all(
        mixedImages.map((image) => action.execute(image, {}, mockContext))
      );

      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({
        success: true,
        imageUrl: "https://example.com/processed/success.jpg",
        thumbnailUrl: "https://example.com/thumbnails/success.jpg",
      });
      expect(results[1]).toEqual({
        success: true,
        imageUrl: "",
        thumbnailUrl: undefined,
      });
      expect(results[2]).toEqual({
        success: true,
        imageUrl: "https://example.com/processed/another-success.jpg",
        thumbnailUrl: undefined,
      });
    });
  });
});
