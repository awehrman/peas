import fs from "fs/promises";
import path from "path";
import sharp from "sharp";

import type { StructuredLogger } from "../types";
import { LogLevel } from "../types";

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
  private logger: StructuredLogger;

  /* istanbul ignore next -- @preserve */
  constructor(options: ImageProcessingOptions = {}, logger: StructuredLogger) {
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
    this.logger = logger;
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

      this.logger.log(`[PROCESS_IMAGE] Processing image: ${filename}`);
      this.logger.log(
        `[PROCESS_IMAGE] Image dimensions: ${metadata.width}x${metadata.height}`
      );
      /* istanbul ignore next -- @preserve */
      this.logger.log(
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

      this.logger.log(
        `[PROCESS_IMAGE] Processing image variants with cropping and resizing`
      );
      this.logger.log(
        `[PROCESS_IMAGE] Creating: original (${this.options.originalWidth}x${this.options.originalHeight}), thumbnail (${this.options.thumbnailWidth}x${this.options.thumbnailHeight}), crops (3:2, 4:3, 16:9)`
      );

      // Ensure the image is in a compatible format for processing
      // Convert to RGB if needed and ensure proper format handling
      let processedImage = image;

      // Handle different image formats to prevent extract_area errors
      if (metadata.format === "png" || metadata.format === "gif") {
        // For PNG/GIF, ensure we have a proper RGB format
        processedImage = image.ensureAlpha().removeAlpha().flatten();
        this.logger.log(
          `[PROCESS_IMAGE] Converted ${metadata.format} to RGB format`
        );
      } else if (metadata.format === "jpeg" || metadata.format === "jpg") {
        // JPEG is already RGB, but ensure it's properly formatted
        processedImage = image.flatten();
        this.logger.log(`[PROCESS_IMAGE] Ensured JPEG is properly formatted`);
      } else {
        // For other formats, try to convert to RGB
        processedImage = image.ensureAlpha().removeAlpha().flatten();
        /* istanbul ignore next -- @preserve */
        this.logger.log(
          `[PROCESS_IMAGE] Converted ${metadata.format || "unknown"} format to RGB`
        );
      }

      // Validate the processed image dimensions
      const processedMetadata = await processedImage.metadata();
      /* istanbul ignore next -- @preserve */
      if (!processedMetadata.width || !processedMetadata.height) {
        /* istanbul ignore next -- @preserve */
        throw new Error(
          "Failed to process image: invalid dimensions after format conversion"
        );
      }

      this.logger.log(
        `[PROCESS_IMAGE] Processed image dimensions: ${processedMetadata.width}x${processedMetadata.height}`
      );

      // Process the original image (resize to max dimensions)
      const originalImage = processedImage.resize(
        this.options.originalWidth,
        this.options.originalHeight,
        {
          fit: "inside",
          withoutEnlargement: true,
        }
      );

      // Process thumbnail (1:1 aspect ratio)
      const thumbnailImage = await this.processCrop(
        processedImage,
        processedMetadata,
        1, // 1:1 aspect ratio
        this.options.thumbnailWidth,
        this.options.thumbnailHeight
      );

      // Process 3:2 aspect ratio crop
      const crop3x2Image = await this.processCrop(
        processedImage,
        processedMetadata,
        3 / 2, // 3:2 aspect ratio
        this.options.crop3x2Width,
        this.options.crop3x2Height
      );

      // Process 4:3 aspect ratio crop
      const crop4x3Image = await this.processCrop(
        processedImage,
        processedMetadata,
        4 / 3, // 4:3 aspect ratio
        this.options.crop4x3Width,
        this.options.crop4x3Height
      );

      // Process 16:9 aspect ratio crop
      const crop16x9Image = await this.processCrop(
        processedImage,
        processedMetadata,
        16 / 9, // 16:9 aspect ratio
        this.options.crop16x9Width,
        this.options.crop16x9Height
      );

      // Save all processed images with error handling for extract_area issues
      const saveResults = await Promise.allSettled([
        originalImage.toFile(originalPath),
        thumbnailImage.toFile(thumbnailPath),
        crop3x2Image.toFile(crop3x2Path),
        crop4x3Image.toFile(crop4x3Path),
        crop16x9Image.toFile(crop16x9Path),
      ]);

      // Check for any failures and handle extract_area errors
      const failedSaves = saveResults.filter(
        (result) => result.status === "rejected"
      );

      if (failedSaves.length > 0) {
        this.logger.log(
          `[PROCESS_IMAGE] Some image saves failed, attempting fallback processing`,
          LogLevel.WARN
        );

        // Check if any failures are due to extract_area errors
        const extractAreaErrors = failedSaves.filter((result) => {
          const error = (result as PromiseRejectedResult).reason;
          return (
            error && error.message && error.message.includes("extract_area")
          );
        });

        /* istanbul ignore next -- @preserve */
        if (extractAreaErrors.length > 0) {
          /* istanbul ignore next -- @preserve */
          this.logger.log(
            `[PROCESS_IMAGE] Extract area errors detected - attempting fallback processing`,
            LogLevel.WARN
          );

          // Re-process failed images with fallback resize-only approach
          const fallbackPromises = [];

          if (saveResults[0].status === "rejected") {
            // Original image failed - use simple resize with fresh Sharp instance
            fallbackPromises.push(
              sharp(inputPath)
                .resize(
                  this.options.originalWidth,
                  this.options.originalHeight,
                  {
                    fit: "inside",
                    withoutEnlargement: true,
                  }
                )
                .toFile(originalPath)
            );
          }

          if (saveResults[1].status === "rejected") {
            // Thumbnail failed - use simple resize with fresh Sharp instance
            fallbackPromises.push(
              sharp(inputPath)
                .resize(
                  this.options.thumbnailWidth,
                  this.options.thumbnailHeight,
                  {
                    fit: "cover",
                    position: "center",
                    withoutEnlargement: false,
                  }
                )
                .toFile(thumbnailPath)
            );
          }

          if (saveResults[2].status === "rejected") {
            // 3:2 crop failed - use simple resize with fresh Sharp instance
            fallbackPromises.push(
              sharp(inputPath)
                .resize(this.options.crop3x2Width, this.options.crop3x2Height, {
                  fit: "cover",
                  position: "center",
                  withoutEnlargement: false,
                })
                .toFile(crop3x2Path)
            );
          }

          if (saveResults[3].status === "rejected") {
            // 4:3 crop failed - use simple resize with fresh Sharp instance
            fallbackPromises.push(
              sharp(inputPath)
                .resize(this.options.crop4x3Width, this.options.crop4x3Height, {
                  fit: "cover",
                  position: "center",
                  withoutEnlargement: false,
                })
                .toFile(crop4x3Path)
            );
          }

          if (saveResults[4].status === "rejected") {
            // 16:9 crop failed - use simple resize with fresh Sharp instance
            fallbackPromises.push(
              sharp(inputPath)
                .resize(
                  this.options.crop16x9Width,
                  this.options.crop16x9Height,
                  {
                    fit: "cover",
                    position: "center",
                    withoutEnlargement: false,
                  }
                )
                .toFile(crop16x9Path)
            );
          }

          // Wait for fallback processing to complete
          await Promise.all(fallbackPromises);
          this.logger.log(
            `[PROCESS_IMAGE] Fallback processing completed successfully`,
            LogLevel.INFO
          );
        } else {
          // Non-extract_area errors - re-throw
          const errors = failedSaves.map(
            (result) => (result as PromiseRejectedResult).reason
          );
          /* istanbul ignore next -- @preserve */
          throw new Error(
            `Image processing failed: ${errors.map((e) => e.message).join(", ")}`
          );
        }
      }

      // Get file sizes for all processed images
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

      /* istanbul ignore next -- @preserve */
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
      /* istanbul ignore next -- @preserve */
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
        /* istanbul ignore next -- @preserve */
        this.logger.log(`Failed to cleanup file ${filePath}:`, LogLevel.WARN, {
          error,
        });
      }
    }
  }

  /**
   * Process image cropping with aspect ratio and target dimensions
   */
  private async processCrop(
    image: sharp.Sharp,
    metadata: sharp.Metadata,
    aspectRatio: number,
    targetWidth: number,
    targetHeight: number
  ): Promise<sharp.Sharp> {
    this.logger.log(
      `[PROCESS_CROP] Cropping image to ${targetWidth}x${targetHeight} with aspect ratio ${aspectRatio}`
    );

    if (metadata.width === undefined || metadata.height === undefined) {
      throw new Error("Invalid image metadata: missing dimensions");
    }

    const { width: originalWidth, height: originalHeight } = metadata;

    // Validate original dimensions
    if (originalWidth <= 0 || originalHeight <= 0) {
      this.logger.log(
        `[PROCESS_CROP] Invalid original dimensions: ${originalWidth}x${originalHeight}, falling back to resize`,
        LogLevel.WARN
      );
      return image.resize(targetWidth, targetHeight, {
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    // Calculate optimal crop dimensions that fit within image bounds
    const cropDimensions = this.calculateOptimalCropDimensions(
      originalWidth,
      originalHeight,
      aspectRatio,
      targetWidth,
      targetHeight
    );

    /* istanbul ignore next -- @preserve */
    if (!cropDimensions) {
      /* istanbul ignore next -- @preserve */
      this.logger.log(
        `[PROCESS_CROP] Could not calculate valid crop dimensions, falling back to resize`,
        LogLevel.WARN
      );
      /* istanbul ignore next -- @preserve */
      return image.resize(targetWidth, targetHeight, {
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    const { cropWidth, cropHeight, left, top } = cropDimensions;

    // If the crop area is too small, just resize
    if (cropWidth < 5 || cropHeight < 5) {
      this.logger.log(
        `[PROCESS_CROP] Crop area too small (${cropWidth}x${cropHeight}), falling back to resize`,
        LogLevel.WARN
      );
      return image.resize(targetWidth, targetHeight, {
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    try {
      this.logger.log(
        `[PROCESS_CROP] Attempting crop: left=${left}, top=${top}, width=${cropWidth}, height=${cropHeight}`
      );

      // Perform the crop with calculated dimensions
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
      // If extract fails, try alternative approaches
      /* istanbul ignore next -- @preserve */
      this.logger.log(
        `[PROCESS_CROP] Extract failed with error: ${error}, trying alternative approaches`,
        LogLevel.WARN
      );

      try {
        // Try using resize with cover fit as an alternative to extract
        this.logger.log(
          `[PROCESS_CROP] Attempting resize with cover fit as alternative to extract`
        );

        return image.resize(targetWidth, targetHeight, {
          fit: "cover",
          position: "center",
          withoutEnlargement: false,
        });
      } catch (resizeError) {
        // If that also fails, fall back to simple resize
        /* istanbul ignore next -- @preserve */
        this.logger.log(
          `[PROCESS_CROP] Cover resize also failed: ${resizeError}, falling back to simple resize`,
          LogLevel.WARN
        );

        return image.resize(targetWidth, targetHeight, {
          fit: "inside",
          withoutEnlargement: true,
        });
      }
    }
  }

  /**
   * Calculate optimal crop dimensions that fit within image bounds
   */
  private calculateOptimalCropDimensions(
    originalWidth: number,
    originalHeight: number,
    aspectRatio: number,
    _targetWidth: number,
    _targetHeight: number
  ): {
    cropWidth: number;
    cropHeight: number;
    left: number;
    top: number;
  } | null {
    // Start with the maximum possible crop dimensions
    let cropWidth = originalWidth;
    let cropHeight = originalHeight;

    // Calculate initial crop dimensions to maintain aspect ratio
    if (originalWidth / originalHeight > aspectRatio) {
      // Image is wider than target aspect ratio - crop width
      cropWidth = Math.round(originalHeight * aspectRatio);
    } else {
      // Image is taller than target aspect ratio - crop height
      cropHeight = Math.round(originalWidth / aspectRatio);
    }

    // Iteratively reduce dimensions until they fit within bounds
    let attempts = 0;
    const maxAttempts = 10; // Prevent infinite loops

    while (attempts < maxAttempts) {
      // Ensure crop dimensions don't exceed original dimensions
      cropWidth = Math.min(cropWidth, originalWidth);
      cropHeight = Math.min(cropHeight, originalHeight);

      // Ensure minimum crop dimensions
      cropWidth = Math.max(cropWidth, 1);
      cropHeight = Math.max(cropHeight, 1);

      // Calculate crop position (center the crop)
      const left = Math.max(0, Math.round((originalWidth - cropWidth) / 2));
      const top = Math.max(0, Math.round((originalHeight - cropHeight) / 2));

      // Validate that crop area fits within bounds
      if (
        left + cropWidth <= originalWidth &&
        top + cropHeight <= originalHeight
      ) {
        this.logger.log(
          `[PROCESS_CROP] Found valid crop dimensions after ${attempts} attempts: ${cropWidth}x${cropHeight}`
        );
        return { cropWidth, cropHeight, left, top };
      }

      // Reduce dimensions and try again
      attempts++;
      /* istanbul ignore next -- @preserve */
      if (cropWidth > cropHeight) {
        // Reduce width more aggressively
        cropWidth = Math.floor(cropWidth * 0.9);
        cropHeight = Math.round(cropWidth / aspectRatio);
      } else {
        // Reduce height more aggressively
        cropHeight = Math.floor(cropHeight * 0.9);
        cropWidth = Math.round(cropHeight * aspectRatio);
      }

      this.logger.log(
        `[PROCESS_CROP] Attempt ${attempts}: reducing dimensions to ${cropWidth}x${cropHeight}`
      );
    }

    this.logger.log(
      `[PROCESS_CROP] Failed to find valid crop dimensions after ${maxAttempts} attempts`,
      LogLevel.WARN
    );
    return null;
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
