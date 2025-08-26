import type { IServiceContainer } from "../../../../services/container";
import type { StructuredLogger } from "../../../../types";
import type { ImageJobData } from "../../../../workers/image/types";
import { markImageJobCompleted } from "../../../note/actions/track-completion/service";

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
    logger.log(
      `[IMAGE_COMPLETED_STATUS] Updating completion status for note: ${data.noteId}`
    );
    logger.log(`[IMAGE_COMPLETED_STATUS] ImportId: ${data.importId}`);
    logger.log(
      `[IMAGE_COMPLETED_STATUS] ImageId: ${data.imageId || "not set"}`
    );
    logger.log(`[IMAGE_COMPLETED_STATUS] Filename: ${data.filename}`);

    // Update the image record with completed status
    const prisma = serviceContainer.database.prisma;

    logger.log(
      `[IMAGE_COMPLETED_STATUS] Updating image record in database: ${data.imageId || "undefined/null/empty"}`
    );

    const updatedImage = await prisma.image.update({
      where: { id: data.imageId },
      data: {
        processingStatus: "COMPLETED",
        processingError: null,
      },
    });

    logger.log(
      `[IMAGE_COMPLETED_STATUS] ✅ Image status updated: ${updatedImage.id}`
    );
    logger.log(
      `[IMAGE_COMPLETED_STATUS] Processing status: ${updatedImage.processingStatus}`
    );
    logger.log(`[IMAGE_COMPLETED_STATUS] ImportId: ${updatedImage.importId}`);

    // Optionally broadcast a lightweight image processed event with preview URLs
    // This enables the UI to show a thumbnail without spamming every step
    if (statusBroadcaster) {
      try {
        await statusBroadcaster.addStatusEventAndBroadcast({
          importId: updatedImage.importId,
          noteId: updatedImage.noteId,
          status: "COMPLETED",
          message: "Image processed",
          context: "image_processing",
          indentLevel: 1,
          metadata: {
            // Use the correct database field names
            r2OriginalUrl: updatedImage.originalImageUrl,
            r2ThumbnailUrl: updatedImage.thumbnailImageUrl,
            r2Crop3x2Url: updatedImage.crop3x2ImageUrl,
            r2Crop4x3Url: updatedImage.crop4x3ImageUrl,
            r2Crop16x9Url: updatedImage.crop16x9ImageUrl,
          },
        });
      } catch (broadcastErr) {
        logger.log(
          `[IMAGE_COMPLETED_STATUS] Failed to broadcast preview metadata: ${broadcastErr}`
        );
      }
    } else {
      logger.log(
        `[IMAGE_COMPLETED_STATUS] Skipping individual image broadcast, using progress tracking instead`
      );
    }

    // Mark this image job as completed in the completion tracking system
    try {
      logger.log(
        `[IMAGE_COMPLETED_STATUS] Marking image job as completed in tracking system`
      );
      await markImageJobCompleted(data.noteId, logger, statusBroadcaster);
      /* istanbul ignore next -- @preserve */
      logger.log(
        `[IMAGE_COMPLETED_STATUS] ✅ Marked image job as completed for note ${data.noteId}`
      );
    } catch (completionError) {
      /* istanbul ignore next -- @preserve */
      logger.log(
        `[IMAGE_COMPLETED_STATUS] ❌ Failed to mark image job as completed: ${completionError}`
      );
      // Don't fail the main operation if completion tracking fails
    }

    return data;
  } catch (error) {
    logger.log(
      `[IMAGE_COMPLETED_STATUS] ❌ Failed to update completion status: ${error}`
    );
    logger.log(`[IMAGE_COMPLETED_STATUS] Error details: ${error}`);
    throw error;
  }
}
