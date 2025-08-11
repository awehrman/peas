import type { Metadata, Sharp } from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StructuredLogger } from "../../types";
import { ImageProcessor } from "../image-processor";

// Define proper types for our mocks
interface MockSharpInstance {
  metadata: ReturnType<typeof vi.fn>;
  resize: ReturnType<typeof vi.fn>;
  extract: ReturnType<typeof vi.fn>;
  toFile: ReturnType<typeof vi.fn>;
  ensureAlpha: ReturnType<typeof vi.fn>;
  removeAlpha: ReturnType<typeof vi.fn>;
  flatten: ReturnType<typeof vi.fn>;
}

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

describe("ImageProcessor", () => {
  let processor: ImageProcessor;
  let mockLogger: StructuredLogger;

  beforeEach(() => {
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
  });

  describe("processCrop", () => {
    it("should handle crop operation successfully", async () => {
      const mockImage: MockSharpInstance = {
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
        mockImage as unknown as Sharp,
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
      const mockImage: MockSharpInstance = {
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
        mockImage as unknown as Sharp,
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
      const mockImage: MockSharpInstance = {
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
        mockImage as unknown as Sharp,
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
  });
});
