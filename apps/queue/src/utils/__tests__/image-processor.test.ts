import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { Stats } from 'fs';
import path from 'path';
import sharp from 'sharp';
import { ImageProcessor } from '../image-processor';

// Mock sharp to avoid actual image processing in tests
vi.mock('sharp', () => {
  const mockSharp = vi.fn();
  mockSharp.mockReturnValue({
    metadata: vi.fn(),
    resize: vi.fn().mockReturnThis(),
    extract: vi.fn().mockReturnThis(),
    toFile: vi.fn().mockResolvedValue(undefined),
  });
  return { default: mockSharp };
});

describe('ImageProcessor', () => {
  let processor: ImageProcessor;
  let mockSharp: ReturnType<typeof vi.fn>;
  let testOutputDir: string;

  beforeEach(() => {
    processor = new ImageProcessor();
    mockSharp = sharp as unknown as ReturnType<typeof vi.fn>;
    testOutputDir = path.join(process.cwd(), 'test-output');

    // Mock fs.mkdir and fs.stat
    vi.spyOn(fs, 'mkdir').mockResolvedValue(undefined);
    vi.spyOn(fs, 'stat').mockResolvedValue({ size: 1024 } as Stats);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('processCrop - Edge Cases', () => {
    it('should handle very small images gracefully', async () => {
      // Mock metadata for a very small image
      const mockMetadata: sharp.Metadata = { 
        width: 5, 
        height: 5,
        format: 'jpeg',
        space: 'srgb',
        channels: 3,
        depth: 'uchar',
        density: 72,
        hasProfile: false,
        hasAlpha: false,
        autoOrient: { width: 5, height: 5 },
        isProgressive: false,
        isPalette: false
      };
      mockSharp.mockReturnValue({
        metadata: vi.fn().mockResolvedValue(mockMetadata),
        resize: vi.fn().mockReturnThis(),
        extract: vi.fn().mockReturnThis(),
        toFile: vi.fn().mockResolvedValue(undefined),
      });

      const image = sharp('test.jpg');
      await processor['processCrop'](image, mockMetadata, 16/9, 1280, 720);

      // Should fall back to resize instead of crop
      expect(mockSharp().resize).toHaveBeenCalledWith(1280, 720, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    });

    it('should handle 1x1 pixel images', async () => {
      const mockMetadata: sharp.Metadata = { 
        width: 1, 
        height: 1,
        format: 'jpeg',
        space: 'srgb',
        channels: 3,
        depth: 'uchar',
        density: 72,
        hasProfile: false,
        hasAlpha: false,
        autoOrient: { width: 1, height: 1 },
        isProgressive: false,
        isPalette: false
      };
      mockSharp.mockReturnValue({
        metadata: vi.fn().mockResolvedValue(mockMetadata),
        resize: vi.fn().mockReturnThis(),
        extract: vi.fn().mockReturnThis(),
        toFile: vi.fn().mockResolvedValue(undefined),
      });

      const image = sharp('test.jpg');
      await processor['processCrop'](image, mockMetadata, 3/2, 1200, 800);

      // Should fall back to resize
      expect(mockSharp().resize).toHaveBeenCalledWith(1200, 800, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    });

    it('should handle extremely wide images', async () => {
      const mockMetadata: sharp.Metadata = { 
        width: 10000, 
        height: 10,
        format: 'jpeg',
        space: 'srgb',
        channels: 3,
        depth: 'uchar',
        density: 72,
        hasProfile: false,
        hasAlpha: false,
        autoOrient: { width: 10000, height: 10 },
        isProgressive: false,
        isPalette: false
      };
      mockSharp.mockReturnValue({
        metadata: vi.fn().mockResolvedValue(mockMetadata),
        resize: vi.fn().mockReturnThis(),
        extract: vi.fn().mockReturnThis(),
        toFile: vi.fn().mockResolvedValue(undefined),
      });

      const image = sharp('test.jpg');
      await processor['processCrop'](image, mockMetadata, 16/9, 1280, 720);

      // Should use crop but with proper bounds checking
      expect(mockSharp().extract).toHaveBeenCalledWith({
        left: expect.any(Number),
        top: expect.any(Number),
        width: expect.any(Number),
        height: expect.any(Number),
      });
    });

    it('should handle extremely tall images', async () => {
      const mockMetadata: sharp.Metadata = { 
        width: 10, 
        height: 10000,
        format: 'jpeg',
        space: 'srgb',
        channels: 3,
        depth: 'uchar',
        density: 72,
        hasProfile: false,
        hasAlpha: false,
        autoOrient: { width: 10, height: 10000 },
        isProgressive: false,
        isPalette: false
      };
      mockSharp.mockReturnValue({
        metadata: vi.fn().mockResolvedValue(mockMetadata),
        resize: vi.fn().mockReturnThis(),
        extract: vi.fn().mockReturnThis(),
        toFile: vi.fn().mockResolvedValue(undefined),
      });

      const image = sharp('test.jpg');
      await processor['processCrop'](image, mockMetadata, 4/3, 1200, 900);

      // Should use crop but with proper bounds checking
      expect(mockSharp().extract).toHaveBeenCalledWith({
        left: expect.any(Number),
        top: expect.any(Number),
        width: expect.any(Number),
        height: expect.any(Number),
      });
    });

    it('should handle extract errors gracefully', async () => {
      const mockMetadata: sharp.Metadata = { 
        width: 100, 
        height: 100,
        format: 'jpeg',
        space: 'srgb',
        channels: 3,
        depth: 'uchar',
        density: 72,
        hasProfile: false,
        hasAlpha: false,
        autoOrient: { width: 100, height: 100 },
        isProgressive: false,
        isPalette: false
      };
      mockSharp.mockReturnValue({
        metadata: vi.fn().mockResolvedValue(mockMetadata),
        resize: vi.fn().mockReturnThis(),
        extract: vi.fn().mockImplementation(() => {
          throw new Error('extract_area: bad extract area');
        }),
        toFile: vi.fn().mockResolvedValue(undefined),
      });

      const image = sharp('test.jpg');
      await processor['processCrop'](image, mockMetadata, 16/9, 1280, 720);

      // Should fall back to resize after extract fails
      expect(mockSharp().resize).toHaveBeenCalledWith(1280, 720, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    });

    it('should validate crop dimensions properly', async () => {
      const mockMetadata: sharp.Metadata = { 
        width: 50, 
        height: 50,
        format: 'jpeg',
        space: 'srgb',
        channels: 3,
        depth: 'uchar',
        density: 72,
        hasProfile: false,
        hasAlpha: false,
        autoOrient: { width: 50, height: 50 },
        isProgressive: false,
        isPalette: false
      };
      mockSharp.mockReturnValue({
        metadata: vi.fn().mockResolvedValue(mockMetadata),
        resize: vi.fn().mockReturnThis(),
        extract: vi.fn().mockReturnThis(),
        toFile: vi.fn().mockResolvedValue(undefined),
      });

      const image = sharp('test.jpg');
      await processor['processCrop'](image, mockMetadata, 16/9, 1280, 720);

      // Should calculate valid crop dimensions
      const extractCall = mockSharp().extract.mock.calls[0][0];
      expect(extractCall.left).toBeGreaterThanOrEqual(0);
      expect(extractCall.top).toBeGreaterThanOrEqual(0);
      expect(extractCall.width).toBeGreaterThan(0);
      expect(extractCall.height).toBeGreaterThan(0);
      expect(extractCall.left + extractCall.width).toBeLessThanOrEqual(mockMetadata.width);
      expect(extractCall.top + extractCall.height).toBeLessThanOrEqual(mockMetadata.height);
    });
  });

  describe('processImage - Input Validation', () => {
    it('should reject images with invalid dimensions', async () => {
      mockSharp.mockReturnValue({
        metadata: vi.fn().mockResolvedValue({ width: 0, height: 100 }),
        resize: vi.fn().mockReturnThis(),
        extract: vi.fn().mockReturnThis(),
        toFile: vi.fn().mockResolvedValue(undefined),
      });

      await expect(
        processor.processImage('test.jpg', testOutputDir, 'test.jpg')
      ).rejects.toThrow('Image too small: 0x100. Minimum dimensions: 1x1');
    });

    it('should handle missing width or height', async () => {
      mockSharp.mockReturnValue({
        metadata: vi.fn().mockResolvedValue({ width: 100 }), // Missing height
        resize: vi.fn().mockReturnThis(),
        extract: vi.fn().mockReturnThis(),
        toFile: vi.fn().mockResolvedValue(undefined),
      });

      await expect(
        processor.processImage('test.jpg', testOutputDir, 'test.jpg')
      ).rejects.toThrow('Invalid image: unable to determine dimensions');
    });

    it('should reject images that are too small', async () => {
      mockSharp.mockReturnValue({
        metadata: vi.fn().mockResolvedValue({ width: 0, height: 0 }),
        resize: vi.fn().mockReturnThis(),
        extract: vi.fn().mockReturnThis(),
        toFile: vi.fn().mockResolvedValue(undefined),
      });

      await expect(
        processor.processImage('test.jpg', testOutputDir, 'test.jpg')
      ).rejects.toThrow('Image too small: 0x0. Minimum dimensions: 1x1');
    });
  });

  describe('isSupportedImage', () => {
    it('should recognize supported image formats', () => {
      expect(ImageProcessor.isSupportedImage('test.jpg')).toBe(true);
      expect(ImageProcessor.isSupportedImage('test.jpeg')).toBe(true);
      expect(ImageProcessor.isSupportedImage('test.png')).toBe(true);
      expect(ImageProcessor.isSupportedImage('test.webp')).toBe(true);
      expect(ImageProcessor.isSupportedImage('test.gif')).toBe(true);
      expect(ImageProcessor.isSupportedImage('test.bmp')).toBe(true);
    });

    it('should reject unsupported formats', () => {
      expect(ImageProcessor.isSupportedImage('test.txt')).toBe(false);
      expect(ImageProcessor.isSupportedImage('test.pdf')).toBe(false);
      expect(ImageProcessor.isSupportedImage('test.doc')).toBe(false);
    });

    it('should handle case insensitive extensions', () => {
      expect(ImageProcessor.isSupportedImage('test.JPG')).toBe(true);
      expect(ImageProcessor.isSupportedImage('test.PNG')).toBe(true);
    });
  });
});
