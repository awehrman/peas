import { promises as fs } from "fs";
import path from "path";
import sharp from "sharp";

export interface ImageProcessingOptions {
  originalWidth?: number;
  originalHeight?: number;
  thumbnailWidth?: number;
  thumbnailHeight?: number;
  crop3x2Width?: number;
  crop3x2Height?: number;
  crop4x3Width?: number;
  crop4x3Height?: number;
  crop16x9Width?: number;
  crop16x9Height?: number;
  quality?: number;
  format?: "jpeg" | "png" | "webp";
}

export interface ImageProcessingResult {
  originalPath: string;
  thumbnailPath: string;
  crop3x2Path: string;
  crop4x3Path: string;
  crop16x9Path: string;
  originalSize: number;
  thumbnailSize: number;
  crop3x2Size: number;
  crop4x3Size: number;
  crop16x9Size: number;
  processingTime: number;
  metadata: {
    width: number;
    height: number;
    format: string;
  };
}

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
}

export class ImageProcessor {
  private options: Required<ImageProcessingOptions>;

  constructor(options: ImageProcessingOptions = {}) {
    this.options = {
      originalWidth: options.originalWidth || 1920,
      originalHeight: options.originalHeight || 1080,
      thumbnailWidth: options.thumbnailWidth || 300,
      thumbnailHeight: options.thumbnailHeight || 300, // 1:1 aspect ratio
      crop3x2Width: options.crop3x2Width || 1200,
      crop3x2Height: options.crop3x2Height || 800, // 3:2 aspect ratio
      crop4x3Width: options.crop4x3Width || 1200,
      crop4x3Height: options.crop4x3Height || 900, // 4:3 aspect ratio
      crop16x9Width: options.crop16x9Width || 1280,
      crop16x9Height: options.crop16x9Height || 720, // 16:9 aspect ratio
      quality: options.quality || 85,
      format: options.format || "jpeg",
    };
  }

  /**
   * Process an image file to create original and multiple aspect ratio crops
   */
  async processImage(
    inputPath: string,
    outputDir: string,
    filename: string
  ): Promise<ImageProcessingResult> {
    const startTime = Date.now();

    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    // Generate output file paths
    const baseName = path.parse(filename).name;
    const originalPath = path.join(
      outputDir,
      `${baseName}_original.${this.options.format}`
    );
    const thumbnailPath = path.join(
      outputDir,
      `${baseName}_thumbnail.${this.options.format}`
    );
    const crop3x2Path = path.join(
      outputDir,
      `${baseName}_3x2.${this.options.format}`
    );
    const crop4x3Path = path.join(
      outputDir,
      `${baseName}_4x3.${this.options.format}`
    );
    const crop16x9Path = path.join(
      outputDir,
      `${baseName}_16x9.${this.options.format}`
    );

    try {
      // Load the image
      const image = sharp(inputPath);
      const metadata = await image.metadata();

      if (!metadata.width || !metadata.height) {
        throw new Error("Invalid image: unable to determine dimensions");
      }

      // Process original image (resize if too large)
      const originalImage = await this.processOriginal(image, metadata);
      await originalImage.toFile(originalPath);

      // Process thumbnail (1:1 aspect ratio)
      const thumbnailImage = await this.processThumbnail(image, metadata);
      await thumbnailImage.toFile(thumbnailPath);

      // Process 3:2 crop
      const crop3x2Image = await this.processCrop(
        image,
        metadata,
        3 / 2,
        this.options.crop3x2Width,
        this.options.crop3x2Height
      );
      await crop3x2Image.toFile(crop3x2Path);

      // Process 4:3 crop
      const crop4x3Image = await this.processCrop(
        image,
        metadata,
        4 / 3,
        this.options.crop4x3Width,
        this.options.crop4x3Height
      );
      await crop4x3Image.toFile(crop4x3Path);

      // Process 16:9 crop
      const crop16x9Image = await this.processCrop(
        image,
        metadata,
        16 / 9,
        this.options.crop16x9Width,
        this.options.crop16x9Height
      );
      await crop16x9Image.toFile(crop16x9Path);

      // Get file sizes
      const [
        originalSize,
        thumbnailSize,
        crop3x2Size,
        crop4x3Size,
        crop16x9Size,
      ] = await Promise.all([
        fs.stat(originalPath).then((stat) => stat.size),
        fs.stat(thumbnailPath).then((stat) => stat.size),
        fs.stat(crop3x2Path).then((stat) => stat.size),
        fs.stat(crop4x3Path).then((stat) => stat.size),
        fs.stat(crop16x9Path).then((stat) => stat.size),
      ]);

      const processingTime = Date.now() - startTime;

      return {
        originalPath,
        thumbnailPath,
        crop3x2Path,
        crop4x3Path,
        crop16x9Path,
        originalSize,
        thumbnailSize,
        crop3x2Size,
        crop4x3Size,
        crop16x9Size,
        processingTime,
        metadata: {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format || "unknown",
        },
      };
    } catch (error) {
      // Clean up any created files on error
      await this.cleanupFiles([
        originalPath,
        thumbnailPath,
        crop3x2Path,
        crop4x3Path,
        crop16x9Path,
      ]);
      throw error;
    }
  }

  /**
   * Process original image - resize if too large
   */
  private async processOriginal(
    image: sharp.Sharp,
    metadata: sharp.Metadata
  ): Promise<sharp.Sharp> {
    const { width, height } = metadata;

    if (!width || !height) {
      throw new Error("Invalid image dimensions");
    }

    // If image is larger than max dimensions, resize it
    if (
      width > this.options.originalWidth ||
      height > this.options.originalHeight
    ) {
      return image.resize(
        this.options.originalWidth,
        this.options.originalHeight,
        {
          fit: "inside",
          withoutEnlargement: true,
        }
      );
    }

    return image;
  }

  /**
   * Process thumbnail image (1:1 aspect ratio)
   */
  private async processThumbnail(
    image: sharp.Sharp,
    metadata: sharp.Metadata
  ): Promise<sharp.Sharp> {
    const { width, height } = metadata;

    if (!width || !height) {
      throw new Error("Invalid image dimensions");
    }

    return image.resize(
      this.options.thumbnailWidth,
      this.options.thumbnailHeight,
      {
        fit: "cover",
        position: "center",
      }
    );
  }

  /**
   * Process crop with specified aspect ratio
   */
  private async processCrop(
    image: sharp.Sharp,
    metadata: sharp.Metadata,
    targetRatio: number,
    targetWidth: number,
    targetHeight: number
  ): Promise<sharp.Sharp> {
    const { width, height } = metadata;

    if (!width || !height) {
      throw new Error("Invalid image dimensions");
    }

    // Calculate crop dimensions to maintain target aspect ratio
    let cropWidth = width;
    let cropHeight = height;

    if (width / height > targetRatio) {
      // Image is wider than target ratio, crop width
      cropWidth = Math.round(height * targetRatio);
    } else {
      // Image is taller than target ratio, crop height
      cropHeight = Math.round(width / targetRatio);
    }

    // Center the crop
    const left = Math.round((width - cropWidth) / 2);
    const top = Math.round((height - cropHeight) / 2);

    // Validate crop dimensions
    if (
      left < 0 ||
      top < 0 ||
      cropWidth <= 0 ||
      cropHeight <= 0 ||
      left + cropWidth > width ||
      top + cropHeight > height
    ) {
      throw new Error(
        `Invalid crop dimensions: left=${left}, top=${top}, width=${cropWidth}, height=${cropHeight} for image ${width}x${height}`
      );
    }

    return image
      .extract({ left, top, width: cropWidth, height: cropHeight })
      .resize(targetWidth, targetHeight, {
        fit: "fill",
        withoutEnlargement: true,
      });
  }

  /**
   * Get image metadata
   */
  async getImageMetadata(filePath: string): Promise<ImageMetadata> {
    const metadata = await sharp(filePath).metadata();

    if (!metadata.width || !metadata.height || !metadata.format) {
      throw new Error("Unable to read image metadata");
    }

    const stats = await fs.stat(filePath);

    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: stats.size,
    };
  }

  /**
   * Clean up files on error
   */
  private async cleanupFiles(filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      try {
        await fs.unlink(filePath);
      } catch (error) {
        // Ignore errors when cleaning up
        console.warn(`Failed to cleanup file ${filePath}:`, error);
      }
    }
  }

  /**
   * Validate if file is a supported image
   */
  static isSupportedImage(filename: string): boolean {
    const supportedExtensions = [
      ".jpg",
      ".jpeg",
      ".png",
      ".webp",
      ".gif",
      ".bmp",
    ];
    const ext = path.extname(filename).toLowerCase();
    return supportedExtensions.includes(ext);
  }
}
