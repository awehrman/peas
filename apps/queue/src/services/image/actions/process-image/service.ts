import { promises as fs } from "fs";

import type { StructuredLogger } from "../../../../types";
import { ImageProcessor } from "../../../../utils/image-processor";
import type { ImageJobData } from "../../../../workers/image/types";

export async function processImage(
  data: ImageJobData,
  logger: StructuredLogger
): Promise<ImageJobData> {
  const startTime = Date.now();

  try {
    logger.log(
      `[PROCESS_IMAGE] Starting image processing for note: ${data.noteId}`
    );
    logger.log(`[PROCESS_IMAGE] ImportId: ${data.importId}`);
    logger.log(`[PROCESS_IMAGE] Input path: ${data.imagePath}`);
    logger.log(`[PROCESS_IMAGE] Filename: ${data.filename}`);
    logger.log(`[PROCESS_IMAGE] Output directory: ${data.outputDir}`);

    // Validate input file exists
    try {
      await fs.access(data.imagePath);
      logger.log(`[PROCESS_IMAGE] ✅ Input file exists: ${data.imagePath}`);
    } catch {
      logger.log(`[PROCESS_IMAGE] ❌ Input file not found: ${data.imagePath}`);
      throw new Error(
        `Input file not found or not accessible: ${data.imagePath}`
      );
    }

    // Initialize image processor
    logger.log(`[PROCESS_IMAGE] Initializing image processor...`);
    const processor = new ImageProcessor({}, logger);

    // Process the image
    logger.log(`[PROCESS_IMAGE] Starting image processing...`);
    const result = await processor.processImage(
      data.imagePath,
      data.outputDir,
      data.filename
    );

    const processingTime = Date.now() - startTime;
    logger.log(
      `[PROCESS_IMAGE] ✅ Image processing completed in ${processingTime}ms`
    );
    logger.log(`[PROCESS_IMAGE] Original size: ${result.originalSize} bytes`);
    logger.log(`[PROCESS_IMAGE] Thumbnail size: ${result.thumbnailSize} bytes`);
    logger.log(`[PROCESS_IMAGE] 3:2 crop size: ${result.crop3x2Size} bytes`);
    logger.log(`[PROCESS_IMAGE] 4:3 crop size: ${result.crop4x3Size} bytes`);
    logger.log(`[PROCESS_IMAGE] 16:9 crop size: ${result.crop16x9Size} bytes`);
    logger.log(`[PROCESS_IMAGE] Original path: ${result.originalPath}`);
    logger.log(`[PROCESS_IMAGE] Thumbnail path: ${result.thumbnailPath}`);
    logger.log(`[PROCESS_IMAGE] 3:2 crop path: ${result.crop3x2Path}`);
    logger.log(`[PROCESS_IMAGE] 4:3 crop path: ${result.crop4x3Path}`);
    logger.log(`[PROCESS_IMAGE] 16:9 crop path: ${result.crop16x9Path}`);

    return {
      ...data,
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
      metadata: {
        width: result.metadata.width,
        height: result.metadata.height,
        format: result.metadata.format,
      },
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.log(
      `[PROCESS_IMAGE] ❌ Image processing failed after ${processingTime}ms`
    );
    logger.log(`[PROCESS_IMAGE] Error: ${error}`);
    throw error;
  }
}
