import type { StructuredLogger } from "../../../../types";
import { ImageProcessor } from "../../../../utils/image-processor";
import type {
  ImageProcessingData,
  ImageSaveData,
} from "../../../../workers/image/types";

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
    logger.log(`[PROCESS_IMAGE] Image processing failed: ${error}`);
    throw error;
  }
}
