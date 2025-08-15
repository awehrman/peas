import path from "path";

import type { StructuredLogger } from "../../../../types";
import { ActionName } from "../../../../types";
import type { NotePipelineData } from "../../../../types/notes";
import { findImagesForImport } from "../../../../utils/image-utils";
import type { BaseWorkerDependencies } from "../../../../workers/types";
import { markNoteAsFailed } from "../track-completion/service";
import { setTotalImageJobs } from "../track-completion/service";

export async function processImages(
  data: NotePipelineData,
  logger: StructuredLogger,
  queues: BaseWorkerDependencies["queues"]
): Promise<NotePipelineData> {
  // Validate that we have a note ID
  if (!data.noteId) {
    throw new Error("No note ID available for image processing");
  }

  try {
    logger.log(
      `[SCHEDULE_IMAGES] Starting image processing for note: ${data.noteId}`
    );
    logger.log(`[SCHEDULE_IMAGES] ImportId: ${data.importId}`);
    logger.log(
      `[SCHEDULE_IMAGES] Original file path: ${data.originalFilePath || "not provided"}`
    );

    // Method 1: Check for pre-assigned images from coordinated upload
    let imageFiles: Array<{
      fileName: string;
      filePath: string;
      size: number;
      extension: string;
    }> = [];

    if (data.imageFiles && data.imageFiles.length > 0) {
      logger.log(
        `[SCHEDULE_IMAGES] Found ${data.imageFiles.length} pre-assigned images from coordinated upload`
      );
      logger.log(
        `[SCHEDULE_IMAGES] Pre-assigned images: ${JSON.stringify(
          data.imageFiles.map((img) => ({
            fileName: img.fileName,
            filePath: img.filePath,
            size: img.size,
            extension: img.extension,
          }))
        )}`
      );

      // Verify each pre-assigned image file exists
      for (const imageFile of data.imageFiles) {
        try {
          const fs = await import("fs/promises");
          await fs.access(imageFile.filePath);
          logger.log(
            `[SCHEDULE_IMAGES] ✅ Pre-assigned image exists: ${imageFile.fileName} at ${imageFile.filePath}`
          );
          imageFiles.push(imageFile);
        } catch (accessError) {
          logger.log(
            `[SCHEDULE_IMAGES] ❌ Pre-assigned image missing: ${imageFile.fileName} at ${imageFile.filePath}`
          );
          logger.log(`[SCHEDULE_IMAGES] Access error: ${accessError}`);
        }
      }

      logger.log(
        `[SCHEDULE_IMAGES] Verified ${imageFiles.length} pre-assigned images exist`
      );
    }

    // Method 2: Use enhanced image detection for importId (fallback for legacy uploads)
    if (imageFiles.length === 0 && data.importId) {
      logger.log(
        `[SCHEDULE_IMAGES] No pre-assigned images found, trying enhanced detection for importId: ${data.importId}`
      );

      imageFiles = await findImagesForImport(data.importId);

      if (imageFiles.length > 0) {
        logger.log(
          `[SCHEDULE_IMAGES] Found ${imageFiles.length} images via enhanced detection`
        );
        logger.log(
          `[SCHEDULE_IMAGES] Enhanced detection images: ${JSON.stringify(
            imageFiles.map((img) => ({
              fileName: img.fileName,
              filePath: img.filePath,
              size: img.size,
              extension: img.extension,
            }))
          )}`
        );
      } else {
        logger.log(
          `[SCHEDULE_IMAGES] No images found via enhanced detection for importId: ${data.importId}`
        );
      }
    }

    // Check if we found any images
    if (imageFiles.length === 0) {
      logger.log(
        `[SCHEDULE_IMAGES] No image files found for note: ${data.noteId}`
      );
      logger.log(`[SCHEDULE_IMAGES] ImportId used: ${data.importId}`);
      logger.log(
        `[SCHEDULE_IMAGES] Original file path: ${data.originalFilePath || "not provided"}`
      );

      // Set total image jobs to 0 since there are no images
      setTotalImageJobs(data.noteId, 0, logger);

      // Check if this was a coordinated upload that should have had images
      const wasCoordinatedUpload =
        data.imageFiles && data.imageFiles.length > 0;

      if (wasCoordinatedUpload) {
        // This was a coordinated upload but no images were found - mark as failed
        logger.log(
          `[SCHEDULE_IMAGES] Coordinated upload with no images found - marking as failed`
        );
        try {
          await markNoteAsFailed(
            data.noteId,
            "No image files found for note processing",
            "IMAGE_UPLOAD_FAILED",
            { importId: data.importId, noteId: data.noteId },
            logger
          );
          logger.log(
            `[SCHEDULE_IMAGES] Marked note ${data.noteId} as FAILED (no images found in coordinated upload)`
          );
        } catch (error) {
          logger.log(
            `[SCHEDULE_IMAGES] Failed to mark note as failed: ${error}`
          );
        }
      } else {
        // This was a single HTML file upload - no images expected, continue normally
        logger.log(
          `[SCHEDULE_IMAGES] Single HTML file upload - no images expected, continuing normally`
        );
      }

      return data;
    }

    logger.log(
      `[SCHEDULE_IMAGES] Found ${imageFiles.length} image files to process`
    );

    // Set the total number of image jobs for completion tracking
    setTotalImageJobs(data.noteId, imageFiles.length, logger);

    // Use the existing image queue from the dependencies
    const imageQueue = queues?.imageQueue;

    if (!imageQueue) {
      throw new Error("Image queue not available in dependencies");
    }

    for (const [index, imageFile] of imageFiles.entries()) {
      logger.log(
        `[SCHEDULE_IMAGES] Processing image ${index + 1}/${imageFiles.length}: ${imageFile.fileName}`
      );
      logger.log(`[SCHEDULE_IMAGES] Image file path: ${imageFile.filePath}`);
      logger.log(`[SCHEDULE_IMAGES] Image file size: ${imageFile.size}`);
      logger.log(
        `[SCHEDULE_IMAGES] Image file extension: ${imageFile.extension}`
      );

      const imageJobData = {
        noteId: data.noteId,
        importId: data.importId,
        imagePath: imageFile.filePath,
        filename: imageFile.fileName,
        outputDir: path.join(process.cwd(), "uploads", "processed"),
        // Initialize processed image paths (will be set by PROCESS_IMAGE)
        originalPath: "",
        thumbnailPath: "",
        crop3x2Path: "",
        crop4x3Path: "",
        crop16x9Path: "",
        // Initialize file sizes (will be set by PROCESS_IMAGE)
        originalSize: 0,
        thumbnailSize: 0,
        crop3x2Size: 0,
        crop4x3Size: 0,
        crop16x9Size: 0,
        // Initialize metadata (will be set by PROCESS_IMAGE)
        metadata: {
          width: 0,
          height: 0,
          format: "unknown",
        },
        // R2 information (will be set by UPLOAD_ORIGINAL)
        r2Key: undefined,
        r2Url: undefined,
      };

      logger.log(
        `[SCHEDULE_IMAGES] Adding job to queue for image ${index + 1}: ${imageFile.fileName}`
      );
      logger.log(
        `[SCHEDULE_IMAGES] Job data: ${JSON.stringify({
          noteId: imageJobData.noteId,
          importId: imageJobData.importId,
          imagePath: imageJobData.imagePath,
          filename: imageJobData.filename,
        })}`
      );

      // Schedule a single job - the worker pipeline will handle upload + process + save
      await imageQueue.add(ActionName.UPLOAD_ORIGINAL, imageJobData);

      logger.log(
        `[SCHEDULE_IMAGES] ✅ Successfully queued image job for: ${imageFile.fileName}`
      );
    }

    logger.log(
      `[SCHEDULE_IMAGES] Successfully scheduled ${imageFiles.length} image jobs`
    );

    return data;
  } catch (error) {
    logger.log(`[SCHEDULE_IMAGES] Failed to schedule images: ${error}`);
    throw error;
  }
}
