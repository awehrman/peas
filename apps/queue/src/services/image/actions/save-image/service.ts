import path from "path";

import type { ImageSaveData } from "../../../../workers/image/types";
import type { IServiceContainer } from "../../../../services/container";
import type { StructuredLogger } from "../../../../types";

export async function saveImage(
  data: ImageSaveData,
  serviceContainer: IServiceContainer,
  logger: StructuredLogger
): Promise<ImageSaveData> {
  try {
    logger.log(`[SAVE_IMAGE] Saving image URLs for note: ${data.noteId}`);

    // Use R2 URL for original if available, otherwise use local path
    const baseUrl = process.env.IMAGE_BASE_URL || "/images";
    const originalUrl = data.r2Url || `${baseUrl}/${path.basename(data.originalPath)}`;
    const thumbnailUrl = `${baseUrl}/${path.basename(data.thumbnailPath)}`;
    const crop3x2Url = `${baseUrl}/${path.basename(data.crop3x2Path)}`;
    const crop4x3Url = `${baseUrl}/${path.basename(data.crop4x3Path)}`;
    const crop16x9Url = `${baseUrl}/${path.basename(data.crop16x9Path)}`;

    // Create Image record in database
    const prisma = serviceContainer.database.prisma;
    const image = await prisma.image.create({
      data: {
        originalImageUrl: originalUrl,
        thumbnailImageUrl: thumbnailUrl,
        crop3x2ImageUrl: crop3x2Url,
        crop4x3ImageUrl: crop4x3Url,
        crop16x9ImageUrl: crop16x9Url,
        originalWidth: data.metadata.width,
        originalHeight: data.metadata.height,
        originalSize: data.originalSize,
        originalFormat: data.metadata.format,
        processingStatus: "COMPLETED",
        noteId: data.noteId,
      },
    });

    logger.log(`[SAVE_IMAGE] Image record created with ID: ${image.id}`);
    logger.log(`[SAVE_IMAGE] Original: ${originalUrl} ${data.r2Url ? '(R2)' : '(local)'}`);
    logger.log(`[SAVE_IMAGE] Thumbnail: ${thumbnailUrl}`);
    logger.log(`[SAVE_IMAGE] 3:2 crop: ${crop3x2Url}`);
    logger.log(`[SAVE_IMAGE] 4:3 crop: ${crop4x3Url}`);
    logger.log(`[SAVE_IMAGE] 16:9 crop: ${crop16x9Url}`);

    return {
      ...data,
      imageId: image.id,
    };
  } catch (error) {
    logger.log(`[SAVE_IMAGE] Failed to save image URLs: ${error}`);
    throw error;
  }
} 