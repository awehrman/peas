import path from "path";

import type { IServiceContainer } from "../../../../services/container";
import type { StructuredLogger } from "../../../../types";
import type { ImageJobData } from "../../../../workers/image/types";

export async function saveImage(
  data: ImageJobData,
  serviceContainer: IServiceContainer,
  logger: StructuredLogger
): Promise<ImageJobData> {
  try {
    logger.log(`[SAVE_IMAGE] Saving image URLs for note: ${data.noteId}`);
    logger.log(`[SAVE_IMAGE] ImportId: ${data.importId}`);
    logger.log(`[SAVE_IMAGE] Image path: ${data.imagePath}`);
    logger.log(`[SAVE_IMAGE] Filename: ${data.filename}`);

    // Use R2 URLs if available, otherwise fall back to local paths
    const baseUrl = process.env.IMAGE_BASE_URL || "/images";

    const originalUrl =
      data.r2OriginalUrl ||
      data.r2Url ||
      `${baseUrl}/${path.basename(data.originalPath)}`;
    const thumbnailUrl =
      data.r2ThumbnailUrl || `${baseUrl}/${path.basename(data.thumbnailPath)}`;
    const crop3x2Url =
      data.r2Crop3x2Url || `${baseUrl}/${path.basename(data.crop3x2Path)}`;
    const crop4x3Url =
      data.r2Crop4x3Url || `${baseUrl}/${path.basename(data.crop4x3Path)}`;
    const crop16x9Url =
      data.r2Crop16x9Url || `${baseUrl}/${path.basename(data.crop16x9Path)}`;

    logger.log(`[SAVE_IMAGE] Generated URLs:`);
    logger.log(`[SAVE_IMAGE] Original: ${originalUrl}`);
    logger.log(`[SAVE_IMAGE] Thumbnail: ${thumbnailUrl}`);
    logger.log(`[SAVE_IMAGE] 3:2 crop: ${crop3x2Url}`);
    logger.log(`[SAVE_IMAGE] 4:3 crop: ${crop4x3Url}`);
    logger.log(`[SAVE_IMAGE] 16:9 crop: ${crop16x9Url}`);

    // Upsert Image record in database using importId as unique identifier
    const prisma = serviceContainer.database.prisma;

    logger.log(
      `[SAVE_IMAGE] Upserting image record for importId: ${data.importId}`
    );
    logger.log(`[SAVE_IMAGE] NoteId: ${data.noteId}`);
    logger.log(`[SAVE_IMAGE] Metadata: ${JSON.stringify({
      width: data.metadata.width,
      height: data.metadata.height,
      format: data.metadata.format,
      originalSize: data.originalSize,
    })}`);

    const image = await prisma.image.upsert({
      where: {
        importId: data.importId, // Use importId as the unique identifier for upsert
      },
      update: {
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
        processingError: null, // Clear any previous errors
        noteId: data.noteId, // Update noteId in case it changed
      },
      create: {
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
        importId: data.importId,
      },
    });

    logger.log(`[SAVE_IMAGE] ✅ Image record upserted with ID: ${image.id}`);

    logger.log(
      `[SAVE_IMAGE] Original: ${originalUrl} ${data.r2OriginalUrl ? "(R2)" : "(local)"}`
    );
    logger.log(
      `[SAVE_IMAGE] Thumbnail: ${thumbnailUrl} ${data.r2ThumbnailUrl ? "(R2)" : "(local)"}`
    );
    logger.log(
      `[SAVE_IMAGE] 3:2 crop: ${crop3x2Url} ${data.r2Crop3x2Url ? "(R2)" : "(local)"}`
    );
    logger.log(
      `[SAVE_IMAGE] 4:3 crop: ${crop4x3Url} ${data.r2Crop4x3Url ? "(R2)" : "(local)"}`
    );
    logger.log(
      `[SAVE_IMAGE] 16:9 crop: ${crop16x9Url} ${data.r2Crop16x9Url ? "(R2)" : "(local)"}`
    );

    return {
      ...data,
      imageId: image.id,
    };
  } catch (error) {
    logger.log(`[SAVE_IMAGE] ❌ Failed to save image URLs: ${error}`);
    logger.log(`[SAVE_IMAGE] Error details: ${error}`);
    throw error;
  }
}
