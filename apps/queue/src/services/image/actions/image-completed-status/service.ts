import type { ImageSaveData } from "../../../../workers/image/types";
import type { IServiceContainer } from "../../../../services/container";
import type { StructuredLogger } from "../../../../types";

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

    // Broadcast completion to frontend via WebSocket
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const webSocketManager = (serviceContainer as any).webSocketManager;
    if (webSocketManager) {
      await webSocketManager.broadcast("image_processing_completed", {
        noteId: data.noteId,
        importId: data.importId,
        imageId: data.imageId,
        image: {
          id: image.id,
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
        processingTime: Date.now(),
      });
    }

    logger.log(
      `[IMAGE_COMPLETED_STATUS] Completion broadcast sent for image: ${data.imageId}`
    );

    return data;
  } catch (error) {
    logger.log(
      `[IMAGE_COMPLETED_STATUS] Failed to broadcast completion: ${error}`
    );
    // Don't throw error here as the main processing was successful
    return data;
  }
}
