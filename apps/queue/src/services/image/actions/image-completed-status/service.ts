import type { IServiceContainer } from "../../../../services/container";
import type { StructuredLogger } from "../../../../types";
import type { ImageSaveData } from "../../../../workers/image/types";

export async function imageCompletedStatus(
  data: ImageSaveData,
  serviceContainer: IServiceContainer,
  logger: StructuredLogger
): Promise<ImageSaveData> {
  try {
    logger.log(
      `[IMAGE_COMPLETED_STATUS] Image processing completed for note: ${data.noteId}`
    );

    // Get the image record from database
    const prisma = serviceContainer.database.prisma;
    const image = await prisma.image.findUnique({
      where: { id: data.imageId },
      include: { note: true },
    });

    if (!image) {
      throw new Error(`Image record not found for ID: ${data.imageId}`);
    }

    // Broadcast completion using standard status broadcasting system
    const statusBroadcaster = serviceContainer.statusBroadcaster;
    if (statusBroadcaster && data.importId) {
      try {
        await statusBroadcaster.addStatusEventAndBroadcast({
          importId: data.importId,
          noteId: data.noteId,
          status: "COMPLETED",
          message: "Added image...",
          context: "image_processing",
          indentLevel: 1,
          metadata: {
            imageId: data.imageId,
            originalImageUrl: image.originalImageUrl,
            thumbnailImageUrl: image.thumbnailImageUrl,
            crop3x2ImageUrl: image.crop3x2ImageUrl,
            crop4x3ImageUrl: image.crop4x3ImageUrl,
            crop16x9ImageUrl: image.crop16x9ImageUrl,
            originalWidth: image.originalWidth,
            originalHeight: image.originalHeight,
            originalSize: image.originalSize,
            originalFormat: image.originalFormat,
            processingStatus: image.processingStatus,
          },
        });

        logger.log(
          `[IMAGE_COMPLETED_STATUS] Status broadcast sent for image: ${data.imageId}`
        );
      } catch (broadcastError) {
        logger.log(
          `[IMAGE_COMPLETED_STATUS] Failed to broadcast status: ${broadcastError}`
        );
      }
    } else {
      logger.log(
        `[IMAGE_COMPLETED_STATUS] Status broadcaster not available or no importId`
      );
    }

    return data;
  } catch (error) {
    logger.log(
      `[IMAGE_COMPLETED_STATUS] Failed to process completion: ${error}`
    );
    // Don't throw error here as the main processing was successful
    return data;
  }
}
