import type { ImageJobData } from "../../../../workers/image/types";
import type { IServiceContainer } from "../../../../services/container";
import type { StructuredLogger } from "../../../../types";

export async function updateImageCompletedStatus(
  data: ImageJobData,
  serviceContainer: IServiceContainer,
  logger: StructuredLogger
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

    return data;
  } catch (error) {
    logger.log(`[IMAGE_COMPLETED_STATUS] Failed to update completion status: ${error}`);
    throw error;
  }
}
