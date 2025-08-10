import fs from "fs/promises";
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
      thumbnailHeight: options.thumbnailHeight || 300,
      crop3x2Width: options.crop3x2Width || 1200,
      crop3x2Height: options.crop3x2Height || 800,
      crop4x3Width: options.crop4x3Width || 1200,
      crop4x3Height: options.crop4x3Height || 900,
      crop16x9Width: options.crop16x9Width || 1280,
      crop16x9Height: options.crop16x9Height || 720,
      quality: options.quality || 85,
      format: options.format || "jpeg",
    };
  }

  async processImage(
    inputPath: string,
    outputDir: string,
    filename: string
  ): Promise<ImageProcessingResult> {
    const startTime = Date.now();

    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    // Generate output filenames with consistent naming
    const baseName = path.parse(filename).name;
    const fileExt = path.extname(filename);

    const originalPath = path.join(outputDir, `${baseName}-original${fileExt}`);
    const thumbnailPath = path.join(
      outputDir,
      `${baseName}-thumbnail${fileExt}`
    );
    const crop3x2Path = path.join(outputDir, `${baseName}-crop3x2${fileExt}`);
    const crop4x3Path = path.join(outputDir, `${baseName}-crop4x3${fileExt}`);
    const crop16x9Path = path.join(outputDir, `${baseName}-crop16x9${fileExt}`);

    try {
      // Load the image and get metadata
      const image = sharp(inputPath);
      const metadata = await image.metadata();

      console.log(`[PROCESS_IMAGE] Processing image: ${filename}`);
      console.log(
        `[PROCESS_IMAGE] Image dimensions: ${metadata.width}x${metadata.height}`
      );
      console.log(
        `[PROCESS_IMAGE] Image format: ${metadata.format || "unknown"}`
      );

      // Validate image dimensions
      if (metadata.width === undefined || metadata.height === undefined) {
        throw new Error("Invalid image: unable to determine dimensions");
      }

      if (metadata.width < 1 || metadata.height < 1) {
        throw new Error(
          `Image too small: ${metadata.width}x${metadata.height}. Minimum dimensions: 1x1`
        );
      }

      // STUBBED: Image processing is currently disabled
      console.log(
        `[PROCESS_IMAGE] STUBBED: Image processing disabled - would process variants with cropping and resizing`
      );
      console.log(
        `[PROCESS_IMAGE] Would create: original (${this.options.originalWidth}x${this.options.originalHeight}), thumbnail (${this.options.thumbnailWidth}x${this.options.thumbnailHeight}), crops (3:2, 4:3, 16:9)`
      );

      // STUBBED: Just copy the original image to all output paths
      console.log(
        `[PROCESS_IMAGE] STUBBED: Copying original image to all variant paths`
      );
      await image.toFile(originalPath);
      await image.toFile(thumbnailPath);
      await image.toFile(crop3x2Path);
      await image.toFile(crop4x3Path);
      await image.toFile(crop16x9Path);

      // STUBBED: Get file sizes (all will be the same since we're copying the original)
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
   * STUBBED: Process image cropping with aspect ratio and target dimensions
   * This method is currently disabled as image processing is stubbed out
   */
  private async processCrop(
    image: sharp.Sharp,
    metadata: sharp.Metadata,
    aspectRatio: number,
    targetWidth: number,
    targetHeight: number
  ): Promise<sharp.Sharp> {
    console.log(
      `[PROCESS_CROP] STUBBED: Would crop image to ${targetWidth}x${targetHeight} with aspect ratio ${aspectRatio}`
    );

    // STUBBED: Just return the original image
    return image;

    // COMMENTED OUT: Original cropping logic
    /*
    if (metadata.width === undefined || metadata.height === undefined) {
      throw new Error("Invalid image metadata: missing dimensions");
    }

    const { width: originalWidth, height: originalHeight } = metadata;

    // Calculate crop dimensions to maintain aspect ratio
    let cropWidth = originalWidth;
    let cropHeight = originalHeight;

    if (originalWidth / originalHeight > aspectRatio) {
      // Image is wider than target aspect ratio - crop width
      cropWidth = Math.round(originalHeight * aspectRatio);
    } else {
      // Image is taller than target aspect ratio - crop height
      cropHeight = Math.round(originalWidth / aspectRatio);
    }

    // Ensure crop dimensions don't exceed original dimensions
    cropWidth = Math.min(cropWidth, originalWidth);
    cropHeight = Math.min(cropHeight, originalHeight);

    // Calculate crop position (center the crop)
    const left = Math.max(0, Math.round((originalWidth - cropWidth) / 2));
    const top = Math.max(0, Math.round((originalHeight - cropHeight) / 2));

    // If the image is too small to crop meaningfully, just resize
    if (cropWidth < 5 || cropHeight < 5) {
      return image.resize(targetWidth, targetHeight, {
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    try {
      // Perform the crop
      const croppedImage = image.extract({
        left,
        top,
        width: cropWidth,
        height: cropHeight,
      });

      // Resize to target dimensions
      return croppedImage.resize(targetWidth, targetHeight, {
        fit: "fill",
        withoutEnlargement: false,
      });
    } catch (error) {
      // If extract fails, fall back to resize
      console.warn(`Crop failed, falling back to resize: ${error}`);
      return image.resize(targetWidth, targetHeight, {
        fit: "inside",
        withoutEnlargement: true,
      });
    }
    */
  }

  static isSupportedImage(filename: string): boolean {
    const supportedExtensions = [
      ".jpg",
      ".jpeg",
      ".png",
      ".gif",
      ".webp",
      ".bmp",
    ];
    const ext = path.extname(filename).toLowerCase();
    return supportedExtensions.includes(ext);
  }
}
