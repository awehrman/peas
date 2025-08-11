import type { ImageJobData } from "../../../../workers/image/types";
import type { IServiceContainer } from "../../../../services/container";
import type { StructuredLogger } from "../../../../types";

export async function updateImageCompletedStatus(
  data: ImageJobData,
  serviceContainer: IServiceContainer,
  logger: StructuredLogger,
  statusBroadcaster?: {
    addStatusEventAndBroadcast: (
      event: Record<string, unknown>
    ) => Promise<Record<string, unknown>>;
  }
): Promise<ImageJobData> {
  try {
    logger.log(`[IMAGE_COMPLETED_STATUS] Updating completion status for note: ${data.noteId}`);

    // Update the image record with completed status
    const prisma = serviceContainer.database.prisma;
    const updatedImage = await prisma.image.update({
      where: { id: data.imageId! },
      data: {
        processingStatus: "COMPLETED",
        processingError: null,
      },
    });

    logger.log(`[IMAGE_COMPLETED_STATUS] Image status updated: ${updatedImage.id}`);
    logger.log(`[IMAGE_COMPLETED_STATUS] Processing status: ${updatedImage.processingStatus}`);

    // Broadcast completion message if statusBroadcaster is available
    if (statusBroadcaster) {
      logger.log(`[IMAGE_COMPLETED_STATUS] StatusBroadcaster is available, broadcasting completion`);
      
      try {
        await statusBroadcaster.addStatusEventAndBroadcast({
          importId: data.importId,
          noteId: data.noteId,
          status: "COMPLETED",
          message: `Added image...`,
          context: "image_processing",
          indentLevel: 1,
          metadata: {
            imageId: updatedImage.id,
            processingStatus: updatedImage.processingStatus,
            originalSize: data.originalSize,
            thumbnailSize: data.thumbnailSize,
            metadata: data.metadata,
          },
        });
        logger.log(`[IMAGE_COMPLETED_STATUS] Successfully broadcasted image completion for image ${updatedImage.id}`);
      } catch (broadcastError) {
        logger.log(`[IMAGE_COMPLETED_STATUS] Failed to broadcast image completion: ${broadcastError}`);
      }
    } else {
      logger.log(`[IMAGE_COMPLETED_STATUS] StatusBroadcaster is not available`);
    }

    return data;
  } catch (error) {
    logger.log(`[IMAGE_COMPLETED_STATUS] Failed to update completion status: ${error}`);
    throw error;
  }
}
