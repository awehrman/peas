import type { StructuredLogger } from "../../../../types";
import { ImageProcessor } from "../../../../utils/image-processor";
import type {
  ImageProcessingData,
  ImageSaveData,
} from "../../../../workers/image/types";
import { LogLevel } from "../../../../types";

export async function processImage(
  data: ImageProcessingData,
  logger: StructuredLogger
): Promise<ImageSaveData> {
  const startTime = Date.now();

  try {
    logger.log(
      `[PROCESS_IMAGE] Starting image processing for note: ${data.noteId}`
    );
    logger.log(`[PROCESS_IMAGE] Input path: ${data.imagePath}`);
    logger.log(`[PROCESS_IMAGE] Filename: ${data.filename}`);
    logger.log(`[PROCESS_IMAGE] Output directory: ${data.outputDir}`);

    // Validate input file exists
    try {
      const fs = await import("fs/promises");
      await fs.access(data.imagePath);
    } catch {
      throw new Error(
        `Input file not found or not accessible: ${data.imagePath}`
      );
    }

    // Initialize image processor
    const processor = new ImageProcessor();

    // Process the image
    const result = await processor.processImage(
      data.imagePath,
      data.outputDir,
      data.filename
    );

    const processingTime = Date.now() - startTime;
    logger.log(
      `[PROCESS_IMAGE] Image processing completed in ${processingTime}ms`
    );
    logger.log(`[PROCESS_IMAGE] Original size: ${result.originalSize} bytes`);
    logger.log(`[PROCESS_IMAGE] Thumbnail size: ${result.thumbnailSize} bytes`);
    logger.log(`[PROCESS_IMAGE] 3:2 crop size: ${result.crop3x2Size} bytes`);
    logger.log(`[PROCESS_IMAGE] 4:3 crop size: ${result.crop4x3Size} bytes`);
    logger.log(`[PROCESS_IMAGE] 16:9 crop size: ${result.crop16x9Size} bytes`);

    return {
      noteId: data.noteId,
      importId: data.importId,
      originalPath: result.originalPath,
      thumbnailPath: result.thumbnailPath,
      crop3x2Path: result.crop3x2Path,
      crop4x3Path: result.crop4x3Path,
      crop16x9Path: result.crop16x9Path,
      originalSize: result.originalSize,
      thumbnailSize: result.thumbnailSize,
      crop3x2Size: result.crop3x2Size,
      crop4x3Size: result.crop4x3Size,
      crop16x9Size: result.crop16x9Size,
      metadata: result.metadata,
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.log(
      `[PROCESS_IMAGE] Image processing failed after ${processingTime}ms: ${errorMessage}`
    );
    logger.log(`[PROCESS_IMAGE] Error details:`, LogLevel.ERROR, {
      error: errorMessage,
      noteId: data.noteId,
      importId: data.importId,
      imagePath: data.imagePath,
      filename: data.filename,
      processingTime
    });

    // Add specific handling for extract_area errors
    if (errorMessage.includes("extract_area")) {
      logger.log(
        `[PROCESS_IMAGE] Extract area error detected - this may be due to invalid image dimensions or format`
      );
    }

    throw error;
  }
}
