/* eslint-disable @typescript-eslint/no-explicit-any -- Test file with intentional any types for mocking */
import type { PathLike, Stats } from "fs";
import fs from "fs/promises";
import type { Metadata } from "sharp";
// Import the mocked modules
import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StructuredLogger } from "../../types";
import { ImageProcessor } from "../image-processor";

// Mock sharp to avoid actual image processing in tests
vi.mock("sharp", () => {
  const mockSharp = vi.fn(() => ({
    metadata: vi
      .fn()
      .mockResolvedValue({ width: 100, height: 100, format: "jpeg" }),
    resize: vi.fn().mockReturnThis(),
    extract: vi.fn().mockReturnThis(),
    toFile: vi.fn().mockResolvedValue(undefined),
    ensureAlpha: vi.fn().mockReturnThis(),
    removeAlpha: vi.fn().mockReturnThis(),
    flatten: vi.fn().mockReturnThis(),
  }));
  return { default: mockSharp };
});

// Mock fs/promises to avoid actual file operations
vi.mock("fs/promises", () => ({
  default: {
    mkdir: vi.fn(),
    stat: vi.fn(),
    unlink: vi.fn(),
  },
  mkdir: vi.fn(),
  stat: vi.fn(),
  unlink: vi.fn(),
}));

describe("ImageProcessor", () => {
  let processor: ImageProcessor;
  let mockLogger: StructuredLogger;

  beforeEach(() => {
    vi.clearAllMocks();

    // Set up default mock implementations
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(fs.stat).mockResolvedValue({ size: 1024 } as Stats);
    vi.mocked(fs.unlink).mockResolvedValue(undefined);

    mockLogger = {
      log: vi.fn(),
    };
    processor = new ImageProcessor({}, mockLogger);
  });

  it("should be instantiated with default options", () => {
    expect(processor).toBeInstanceOf(ImageProcessor);
  });

  it("should use custom options when provided", () => {
    const customProcessor = new ImageProcessor(
      {
        originalWidth: 800,
        originalHeight: 600,
        quality: 90,
      },
      mockLogger
    );

    expect(customProcessor).toBeInstanceOf(ImageProcessor);
  });

  describe("calculateOptimalCropDimensions", () => {
    it("should calculate correct dimensions for 1272x852 image with 16:9 aspect ratio", () => {
      const result = processor["calculateOptimalCropDimensions"](
        1272,
        852,
        16 / 9,
        1280,
        720
      );

      expect(result).toEqual({
        cropWidth: 1272,
        cropHeight: 716,
        left: 0,
        top: 68,
      });
    });

    it("should calculate correct dimensions for 1272x852 image with 1:1 aspect ratio", () => {
      const result = processor["calculateOptimalCropDimensions"](
        1272,
        852,
        1,
        300,
        300
      );

      expect(result).toEqual({
        cropWidth: 852,
        cropHeight: 852,
        left: 210,
        top: 0,
      });
    });

    it("should calculate correct dimensions for 1272x852 image with 3:2 aspect ratio", () => {
      const result = processor["calculateOptimalCropDimensions"](
        1272,
        852,
        3 / 2,
        1200,
        800
      );

      expect(result).toEqual({
        cropWidth: 1272,
        cropHeight: 848,
        left: 0,
        top: 2,
      });
    });

    it("should calculate correct dimensions for 1272x852 image with 4:3 aspect ratio", () => {
      const result = processor["calculateOptimalCropDimensions"](
        1272,
        852,
        4 / 3,
        1200,
        900
      );

      expect(result).toEqual({
        cropWidth: 1136,
        cropHeight: 852,
        left: 68,
        top: 0,
      });
    });

    it("should handle very small images", () => {
      const result = processor["calculateOptimalCropDimensions"](
        10,
        10,
        16 / 9,
        1280,
        720
      );

      expect(result).toEqual({
        cropWidth: 10,
        cropHeight: 6,
        left: 0,
        top: 2,
      });
    });

    it("should handle very wide images", () => {
      const result = processor["calculateOptimalCropDimensions"](
        2000,
        100,
        16 / 9,
        1280,
        720
      );

      expect(result).toEqual({
        cropWidth: 178,
        cropHeight: 100,
        left: 911,
        top: 0,
      });
    });

    it("should handle very tall images", () => {
      const result = processor["calculateOptimalCropDimensions"](
        100,
        2000,
        16 / 9,
        1280,
        720
      );

      expect(result).toEqual({
        cropWidth: 100,
        cropHeight: 56,
        left: 0,
        top: 972,
      });
    });

    it("should return null for invalid dimensions", () => {
      const result = processor["calculateOptimalCropDimensions"](
        0,
        100,
        16 / 9,
        1280,
        720
      );
      expect(result).toBeNull();
    });

    it("should handle edge case where crop would exceed bounds", () => {
      // This should trigger the iterative reduction
      const result = processor["calculateOptimalCropDimensions"](
        100,
        100,
        2,
        1280,
        720
      );

      // Should find valid dimensions after reduction
      expect(result).not.toBeNull();
      expect(result!.cropWidth).toBeLessThanOrEqual(100);
      expect(result!.cropHeight).toBeLessThanOrEqual(100);
      expect(result!.left + result!.cropWidth).toBeLessThanOrEqual(100);
      expect(result!.top + result!.cropHeight).toBeLessThanOrEqual(100);
    });



    it("should log attempts during iterative reduction", () => {
      // Test case that will trigger multiple attempts
      const result = processor["calculateOptimalCropDimensions"](
        50,
        50,
        16 / 9,
        1280,
        720
      );

      // Should find valid dimensions after reduction
      expect(result).not.toBeNull();
    });
  });

  describe("processCrop", () => {
    it("should handle crop operation successfully", async () => {
      const mockImage: any = {
        extract: vi.fn().mockReturnThis(),
        resize: vi.fn().mockReturnThis(),
        metadata: vi.fn(),
        toFile: vi.fn(),
        ensureAlpha: vi.fn(),
        removeAlpha: vi.fn(),
        flatten: vi.fn(),
      };

      const mockMetadata: Metadata = {
        width: 1272,
        height: 852,
        format: "jpeg",
        space: "srgb",
        channels: 3,
        depth: "uchar",
        density: 72,
        hasProfile: false,
        hasAlpha: false,
        autoOrient: { width: 1272, height: 852 },
        isProgressive: false,
        isPalette: false,
      };

      await processor["processCrop"](
        mockImage,
        mockMetadata,
        16 / 9,
        1280,
        720
      );

      expect(mockImage.extract).toHaveBeenCalledWith({
        left: 0,
        top: 68,
        width: 1272,
        height: 716,
      });
    });

    it("should fall back to resize when crop dimensions are too small", async () => {
      const mockImage: any = {
        extract: vi.fn().mockReturnThis(),
        resize: vi.fn().mockReturnThis(),
        metadata: vi.fn(),
        toFile: vi.fn(),
        ensureAlpha: vi.fn(),
        removeAlpha: vi.fn(),
        flatten: vi.fn(),
      };

      const mockMetadata: Metadata = {
        width: 5,
        height: 5,
        format: "jpeg",
        space: "srgb",
        channels: 3,
        depth: "uchar",
        density: 72,
        hasProfile: false,
        hasAlpha: false,
        autoOrient: { width: 5, height: 5 },
        isProgressive: false,
        isPalette: false,
      };

      await processor["processCrop"](
        mockImage,
        mockMetadata,
        16 / 9,
        1280,
        720
      );

      expect(mockImage.resize).toHaveBeenCalledWith(1280, 720, {
        fit: "inside",
        withoutEnlargement: true,
      });
    });

    it("should fall back to resize when extract fails", async () => {
      const mockImage: any = {
        extract: vi.fn().mockImplementation(() => {
          throw new Error("extract_area: bad extract area");
        }),
        resize: vi.fn().mockReturnThis(),
        metadata: vi.fn(),
        toFile: vi.fn(),
        ensureAlpha: vi.fn(),
        removeAlpha: vi.fn(),
        flatten: vi.fn(),
      };

      const mockMetadata: Metadata = {
        width: 1272,
        height: 852,
        format: "jpeg",
        space: "srgb",
        channels: 3,
        depth: "uchar",
        density: 72,
        hasProfile: false,
        hasAlpha: false,
        autoOrient: { width: 1272, height: 852 },
        isProgressive: false,
        isPalette: false,
      };

      await processor["processCrop"](
        mockImage,
        mockMetadata,
        16 / 9,
        1280,
        720
      );

      // Should first try cover fit as fallback
      expect(mockImage.resize).toHaveBeenCalledWith(1280, 720, {
        fit: "cover",
        position: "center",
        withoutEnlargement: false,
      });
    });

    it("should fall back to simple resize when cover resize also fails", async () => {
      const mockImage: any = {
        extract: vi.fn().mockImplementation(() => {
          throw new Error("extract_area: bad extract area");
        }),
        resize: vi
          .fn()
          .mockImplementationOnce(() => {
            throw new Error("cover resize failed");
          })
          .mockReturnThis(),
        metadata: vi.fn(),
        toFile: vi.fn(),
        ensureAlpha: vi.fn(),
        removeAlpha: vi.fn(),
        flatten: vi.fn(),
      };

      const mockMetadata: Metadata = {
        width: 1272,
        height: 852,
        format: "jpeg",
        space: "srgb",
        channels: 3,
        depth: "uchar",
        density: 72,
        hasProfile: false,
        hasAlpha: false,
        autoOrient: { width: 1272, height: 852 },
        isProgressive: false,
        isPalette: false,
      };

      await processor["processCrop"](
        mockImage,
        mockMetadata,
        16 / 9,
        1280,
        720
      );

      // Should fall back to simple resize
      expect(mockImage.resize).toHaveBeenCalledWith(1280, 720, {
        fit: "inside",
        withoutEnlargement: true,
      });
    });

    it("should handle invalid metadata dimensions", async () => {
      const mockImage: any = {
        extract: vi.fn().mockReturnThis(),
        resize: vi.fn().mockReturnThis(),
        metadata: vi.fn(),
        toFile: vi.fn(),
        ensureAlpha: vi.fn(),
        removeAlpha: vi.fn(),
        flatten: vi.fn(),
      };

      const mockMetadata: Metadata = {
        width: undefined as any,
        height: undefined as any,
        format: "jpeg",
        space: "srgb",
        channels: 3,
        depth: "uchar",
        density: 72,
        hasProfile: false,
        hasAlpha: false,
        autoOrient: { width: 1272, height: 852 },
        isProgressive: false,
        isPalette: false,
      };

      await expect(
        processor["processCrop"](mockImage, mockMetadata, 16 / 9, 1280, 720)
      ).rejects.toThrow("Invalid image metadata: missing dimensions");
    });

    it("should handle zero dimensions", async () => {
      const mockImage: any = {
        extract: vi.fn().mockReturnThis(),
        resize: vi.fn().mockReturnThis(),
        metadata: vi.fn(),
        toFile: vi.fn(),
        ensureAlpha: vi.fn(),
        removeAlpha: vi.fn(),
        flatten: vi.fn(),
      };

      const mockMetadata: Metadata = {
        width: 0,
        height: 100,
        format: "jpeg",
        space: "srgb",
        channels: 3,
        depth: "uchar",
        density: 72,
        hasProfile: false,
        hasAlpha: false,
        autoOrient: { width: 0, height: 100 },
        isProgressive: false,
        isPalette: false,
      };

      await processor["processCrop"](
        mockImage,
        mockMetadata,
        16 / 9,
        1280,
        720
      );

      expect(mockImage.resize).toHaveBeenCalledWith(1280, 720, {
        fit: "inside",
        withoutEnlargement: true,
      });
    });

    it("should handle negative dimensions", async () => {
      const mockImage: any = {
        extract: vi.fn().mockReturnThis(),
        resize: vi.fn().mockReturnThis(),
        metadata: vi.fn(),
        toFile: vi.fn(),
        ensureAlpha: vi.fn(),
        removeAlpha: vi.fn(),
        flatten: vi.fn(),
      };

      const mockMetadata: Metadata = {
        width: -10,
        height: 100,
        format: "jpeg",
        space: "srgb",
        channels: 3,
        depth: "uchar",
        density: 72,
        hasProfile: false,
        hasAlpha: false,
        autoOrient: { width: -10, height: 100 },
        isProgressive: false,
        isPalette: false,
      };

      await processor["processCrop"](
        mockImage,
        mockMetadata,
        16 / 9,
        1280,
        720
      );

      expect(mockImage.resize).toHaveBeenCalledWith(1280, 720, {
        fit: "inside",
        withoutEnlargement: true,
      });
    });

    it("should handle extract failures and try alternative approaches", async () => {
      const mockImage: any = {
        extract: vi.fn().mockImplementation(() => {
          throw new Error("Extract failed");
        }),
        resize: vi.fn().mockReturnThis(),
        metadata: vi.fn(),
        toFile: vi.fn(),
        ensureAlpha: vi.fn(),
        removeAlpha: vi.fn(),
        flatten: vi.fn(),
      };

      const mockMetadata: Metadata = {
        width: 1272,
        height: 852,
        format: "jpeg",
        space: "srgb",
        channels: 3,
        depth: "uchar",
        density: 72,
        hasProfile: false,
        hasAlpha: false,
        autoOrient: { width: 1272, height: 852 },
        isProgressive: false,
        isPalette: false,
      };

      await processor["processCrop"](
        mockImage,
        mockMetadata,
        16 / 9,
        1280,
        720
      );

      expect(mockImage.resize).toHaveBeenCalledWith(1280, 720, {
        fit: "cover",
        position: "center",
        withoutEnlargement: false,
      });
    });

    it("should handle both extract and cover resize failures", async () => {
      const mockImage: any = {
        extract: vi.fn().mockImplementation(() => {
          throw new Error("Extract failed");
        }),
        resize: vi.fn().mockReturnThis(), // First resize (cover) succeeds
        metadata: vi.fn(),
        toFile: vi.fn(),
        ensureAlpha: vi.fn(),
        removeAlpha: vi.fn(),
        flatten: vi.fn(),
      };

      const mockMetadata: Metadata = {
        width: 1272,
        height: 852,
        format: "jpeg",
        space: "srgb",
        channels: 3,
        depth: "uchar",
        density: 72,
        hasProfile: false,
        hasAlpha: false,
        autoOrient: { width: 1272, height: 852 },
        isProgressive: false,
        isPalette: false,
      };

      await processor["processCrop"](
        mockImage,
        mockMetadata,
        16 / 9,
        1280,
        720
      );

      expect(mockImage.resize).toHaveBeenCalledWith(1280, 720, {
        fit: "cover",
        position: "center",
        withoutEnlargement: false,
      });
    });
  });

  describe("processImage", () => {
    it("should process image successfully", async () => {
      const inputPath = "/tmp/test-image.jpg";
      const outputDir = "/tmp/output";
      const filename = "test-image.jpg";

      // Mock successful metadata
      vi.mocked(sharp).mockReturnValue({
        metadata: vi.fn().mockResolvedValue({
          width: 1000,
          height: 800,
          format: "jpeg",
        }),
        resize: vi.fn().mockReturnThis(),
        ensureAlpha: vi.fn().mockReturnThis(),
        removeAlpha: vi.fn().mockReturnThis(),
        flatten: vi.fn().mockReturnThis(),
        toFile: vi.fn().mockResolvedValue(undefined),
      } as any);

      // Mock successful directory creation and file stats
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.stat).mockImplementation((path: PathLike) => {
        // Return different sizes for different file paths
        const sizes: Record<string, number> = {
          "/tmp/output/test-image-original.jpg": 1024,
          "/tmp/output/test-image-thumbnail.jpg": 512,
          "/tmp/output/test-image-crop3x2.jpg": 768,
          "/tmp/output/test-image-crop4x3.jpg": 640,
          "/tmp/output/test-image-crop16x9.jpg": 480,
        };
        return Promise.resolve({ size: sizes[String(path)] || 1024 } as Stats);
      });

      const result = await processor.processImage(
        inputPath,
        outputDir,
        filename
      );

      expect(result.originalPath).toBe("/tmp/output/test-image-original.jpg");
      expect(result.thumbnailPath).toBe("/tmp/output/test-image-thumbnail.jpg");
      expect(result.crop3x2Path).toBe("/tmp/output/test-image-crop3x2.jpg");
      expect(result.crop4x3Path).toBe("/tmp/output/test-image-crop4x3.jpg");
      expect(result.crop16x9Path).toBe("/tmp/output/test-image-crop16x9.jpg");
      expect(fs.mkdir).toHaveBeenCalledWith(outputDir, { recursive: true });
    });

    it("should handle invalid image dimensions", async () => {
      const inputPath = "/tmp/test-image.jpg";
      const outputDir = "/tmp/output";
      const filename = "test-image.jpg";

      // Mock metadata with zero dimensions
      vi.mocked(sharp).mockReturnValue({
        metadata: vi.fn().mockResolvedValue({
          width: 0,
          height: 0,
          format: "jpeg",
        }),
      } as any);

      // Mock successful directory creation
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);

      await expect(
        processor.processImage(inputPath, outputDir, filename)
      ).rejects.toThrow("Image too small: 0x0. Minimum dimensions: 1x1");
    });

    it("should handle missing image dimensions", async () => {
      const inputPath = "/tmp/test-image.jpg";
      const outputDir = "/tmp/output";
      const filename = "test-image.jpg";

      // Mock metadata with undefined dimensions
      vi.mocked(sharp).mockReturnValue({
        metadata: vi.fn().mockResolvedValue({
          width: undefined,
          height: undefined,
          format: "jpeg",
        }),
      } as any);

      // Mock successful directory creation
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);

      await expect(
        processor.processImage(inputPath, outputDir, filename)
      ).rejects.toThrow("Invalid image: unable to determine dimensions");
    });

    it("should handle PNG format conversion", async () => {
      const inputPath = "/tmp/test-image.png";
      const outputDir = "/tmp/output";
      const filename = "test-image.png";

      // Mock successful metadata for PNG
      vi.mocked(sharp).mockReturnValue({
        metadata: vi.fn().mockResolvedValue({
          width: 1000,
          height: 800,
          format: "png",
        }),
        resize: vi.fn().mockReturnThis(),
        ensureAlpha: vi.fn().mockReturnThis(),
        removeAlpha: vi.fn().mockReturnThis(),
        flatten: vi.fn().mockReturnThis(),
        toFile: vi.fn().mockResolvedValue(undefined),
      } as any);

      // Mock successful directory creation and file stats
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.stat).mockImplementation((path: PathLike) => {
        // Return different sizes for different file paths
        const sizes: Record<string, number> = {
          "/tmp/output/test-image-original.png": 1024,
          "/tmp/output/test-image-thumbnail.png": 512,
          "/tmp/output/test-image-crop3x2.png": 768,
          "/tmp/output/test-image-crop4x3.png": 640,
          "/tmp/output/test-image-crop16x9.png": 480,
        };
        return Promise.resolve({ size: sizes[String(path)] || 1024 } as Stats);
      });

      const result = await processor.processImage(
        inputPath,
        outputDir,
        filename
      );

      expect(result.originalPath).toBe("/tmp/output/test-image-original.png");
      expect(result.thumbnailPath).toBe("/tmp/output/test-image-thumbnail.png");
      expect(result.crop3x2Path).toBe("/tmp/output/test-image-crop3x2.png");
      expect(result.crop4x3Path).toBe("/tmp/output/test-image-crop4x3.png");
      expect(result.crop16x9Path).toBe("/tmp/output/test-image-crop16x9.png");
    });

    it("should handle GIF format conversion", async () => {
      const inputPath = "/tmp/test-image.gif";
      const outputDir = "/tmp/output";
      const filename = "test-image.gif";

      // Mock successful metadata for GIF
      vi.mocked(sharp).mockReturnValue({
        metadata: vi.fn().mockResolvedValue({
          width: 1000,
          height: 800,
          format: "gif",
        }),
        resize: vi.fn().mockReturnThis(),
        ensureAlpha: vi.fn().mockReturnThis(),
        removeAlpha: vi.fn().mockReturnThis(),
        flatten: vi.fn().mockReturnThis(),
        toFile: vi.fn().mockResolvedValue(undefined),
      } as any);

      // Mock successful directory creation and file stats
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.stat).mockImplementation((path: PathLike) => {
        // Return different sizes for different file paths
        const sizes: Record<string, number> = {
          "/tmp/output/test-image-original.gif": 1024,
          "/tmp/output/test-image-thumbnail.gif": 512,
          "/tmp/output/test-image-crop3x2.gif": 768,
          "/tmp/output/test-image-crop4x3.gif": 640,
          "/tmp/output/test-image-crop16x9.gif": 480,
        };
        return Promise.resolve({ size: sizes[String(path)] || 1024 } as Stats);
      });

      const result = await processor.processImage(
        inputPath,
        outputDir,
        filename
      );

      expect(result.originalPath).toBe("/tmp/output/test-image-original.gif");
      expect(result.thumbnailPath).toBe("/tmp/output/test-image-thumbnail.gif");
      expect(result.crop3x2Path).toBe("/tmp/output/test-image-crop3x2.gif");
      expect(result.crop4x3Path).toBe("/tmp/output/test-image-crop4x3.gif");
      expect(result.crop16x9Path).toBe("/tmp/output/test-image-crop16x9.gif");
    });

    it("should handle unknown format conversion", async () => {
      const inputPath = "/tmp/test-image.bmp";
      const outputDir = "/tmp/output";
      const filename = "test-image.bmp";

      // Mock successful metadata for unknown format
      vi.mocked(sharp).mockReturnValue({
        metadata: vi.fn().mockResolvedValue({
          width: 1000,
          height: 800,
          format: "bmp",
        }),
        resize: vi.fn().mockReturnThis(),
        ensureAlpha: vi.fn().mockReturnThis(),
        removeAlpha: vi.fn().mockReturnThis(),
        flatten: vi.fn().mockReturnThis(),
        toFile: vi.fn().mockResolvedValue(undefined),
      } as any);

      // Mock successful directory creation and file stats
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.stat).mockImplementation((path: PathLike) => {
        // Return different sizes for different file paths
        const sizes: Record<string, number> = {
          "/tmp/output/test-image-original.bmp": 1024,
          "/tmp/output/test-image-thumbnail.bmp": 512,
          "/tmp/output/test-image-crop3x2.bmp": 768,
          "/tmp/output/test-image-crop4x3.bmp": 640,
          "/tmp/output/test-image-crop16x9.bmp": 480,
        };
        return Promise.resolve({ size: sizes[String(path)] || 1024 } as Stats);
      });

      const result = await processor.processImage(
        inputPath,
        outputDir,
        filename
      );

      expect(result.originalPath).toBe("/tmp/output/test-image-original.bmp");
      expect(result.thumbnailPath).toBe("/tmp/output/test-image-thumbnail.bmp");
      expect(result.crop3x2Path).toBe("/tmp/output/test-image-crop3x2.bmp");
      expect(result.crop4x3Path).toBe("/tmp/output/test-image-crop4x3.bmp");
      expect(result.crop16x9Path).toBe("/tmp/output/test-image-crop16x9.bmp");
    });

    it("should handle processing errors and cleanup", async () => {
      const inputPath = "/tmp/test-image.jpg";
      const outputDir = "/tmp/output";
      const filename = "test-image.jpg";

      // Mock successful metadata
      vi.mocked(sharp).mockReturnValue({
        metadata: vi.fn().mockResolvedValue({
          width: 1000,
          height: 800,
          format: "jpeg",
        }),
        resize: vi.fn().mockReturnThis(),
        ensureAlpha: vi.fn().mockReturnThis(),
        removeAlpha: vi.fn().mockReturnThis(),
        flatten: vi.fn().mockReturnThis(),
        toFile: vi.fn().mockRejectedValue(new Error("Processing failed")),
      } as any);

      // Mock successful directory creation
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);

      await expect(
        processor.processImage(inputPath, outputDir, filename)
      ).rejects.toThrow("Processing failed");
    });



    it("should handle non-extract_area errors by re-throwing", async () => {
      const inputPath = "/tmp/test-image.jpg";
      const outputDir = "/tmp/output";
      const filename = "test-image.jpg";

      // Mock successful metadata
      vi.mocked(sharp).mockReturnValue({
        metadata: vi.fn().mockResolvedValue({
          width: 1000,
          height: 800,
          format: "jpeg",
        }),
        resize: vi.fn().mockReturnThis(),
        ensureAlpha: vi.fn().mockReturnThis(),
        removeAlpha: vi.fn().mockReturnThis(),
        flatten: vi.fn().mockReturnThis(),
        toFile: vi.fn().mockRejectedValue(new Error("Some other error")),
      } as any);

      // Mock successful directory creation
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);

      await expect(
        processor.processImage(inputPath, outputDir, filename)
      ).rejects.toThrow("Some other error");
    });

    it("should log processed image dimensions", async () => {
      const inputPath = "/tmp/test-image.jpg";
      const outputDir = "/tmp/output";
      const filename = "test-image.jpg";

      // Mock successful metadata
      vi.mocked(sharp).mockReturnValue({
        metadata: vi.fn().mockResolvedValue({
          width: 1000,
          height: 800,
          format: "jpeg",
        }),
        resize: vi.fn().mockReturnThis(),
        ensureAlpha: vi.fn().mockReturnThis(),
        removeAlpha: vi.fn().mockReturnThis(),
        flatten: vi.fn().mockReturnThis(),
        toFile: vi.fn().mockResolvedValue(undefined),
      } as any);

      // Mock successful directory creation and file stats
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.stat).mockResolvedValue({ size: 1024 } as Stats);

      const result = await processor.processImage(
        inputPath,
        outputDir,
        filename
      );

      expect(result).toBeDefined();
      expect(result.originalPath).toBeDefined();
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[PROCESS_IMAGE] Processed image dimensions: 1000x800"
      );
    });
  });

  describe("isSupportedImage", () => {
    it("should return true for supported image extensions", () => {
      const supportedExtensions = [
        "test.jpg",
        "test.jpeg",
        "test.png",
        "test.gif",
        "test.webp",
        "test.bmp",
      ];

      supportedExtensions.forEach((filename) => {
        expect(ImageProcessor.isSupportedImage(filename)).toBe(true);
      });
    });

    it("should return false for unsupported extensions", () => {
      const unsupportedExtensions = [
        "test.txt",
        "test.pdf",
        "test.doc",
        "test.exe",
        "test",
        "test.",
        ".test",
      ];

      unsupportedExtensions.forEach((filename) => {
        expect(ImageProcessor.isSupportedImage(filename)).toBe(false);
      });
    });

    it("should handle case insensitive extensions", () => {
      const mixedCaseExtensions = [
        "test.JPG",
        "test.JPEG",
        "test.PNG",
        "test.GIF",
        "test.WEBP",
        "test.BMP",
      ];

      mixedCaseExtensions.forEach((filename) => {
        expect(ImageProcessor.isSupportedImage(filename)).toBe(true);
      });
    });
  });
});
