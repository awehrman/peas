import { promises as fs } from "fs";
import path from "path";

import type { StructuredLogger } from "../../../../types";
import { ActionName } from "../../../../types";
import type { NotePipelineData } from "../../../../types/notes";
import {
  findImageDirectoryForHtmlFile,
  getImageFilesWithMetadata,
} from "../../../../utils/image-utils";
import type { BaseWorkerDependencies } from "../../../../workers/types";

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

    // Try to find image directory associated with this note
    let imageDirectory: string | null = null;
    let imageFiles: Array<{
      fileName: string;
      filePath: string;
      size: number;
      extension: string;
    }> = [];

    // Method 1: Check if there's an original file path we can use to find associated images
    if (data.metadata?.originalFilePath) {
      const originalFilePath = data.metadata.originalFilePath as string;
      logger.log(
        `[SCHEDULE_IMAGES] Looking for images associated with HTML file: ${originalFilePath}`
      );

      imageDirectory = await findImageDirectoryForHtmlFile(originalFilePath);

      if (imageDirectory) {
        logger.log(
          `[SCHEDULE_IMAGES] Found image directory: ${imageDirectory}`
        );
        imageFiles = await getImageFilesWithMetadata(imageDirectory);
      }
    }

    // Method 2: Check common directory patterns if we have an importId
    if (!imageDirectory && data.importId) {
      const commonPaths = [
        // First priority: coordinated upload directory
        path.join(process.cwd(), "uploads", "images", data.importId),
        // Legacy patterns from file processing
        path.join(process.cwd(), "/public/files", data.importId + "_files"),
        path.join(process.cwd(), "/public/files", data.importId + ".files"),
        path.join(process.cwd(), "/public/files", data.importId + "_images"),
        path.join(process.cwd(), "/public/files", data.importId, "images"),
        path.join(process.cwd(), "/public/files", "images"),
      ];

      logger.log(
        `[SCHEDULE_IMAGES] Checking ${commonPaths.length} potential image directories:`
      );

      for (const potentialPath of commonPaths) {
        logger.log(`[SCHEDULE_IMAGES] Checking path: ${potentialPath}`);
        try {
          await fs.access(potentialPath);
          logger.log(`[SCHEDULE_IMAGES] Path exists: ${potentialPath}`);

          // List all contents first to see what's actually there
          try {
            const allContents = await fs.readdir(potentialPath);
            logger.log(
              `[SCHEDULE_IMAGES] Directory contents (${allContents.length} items): ${JSON.stringify(allContents)}`
            );
          } catch (listError) {
            logger.log(
              `[SCHEDULE_IMAGES] Could not list directory contents: ${listError}`
            );
          }

          const files = await getImageFilesWithMetadata(potentialPath);
          logger.log(
            `[SCHEDULE_IMAGES] Found ${files.length} image files in: ${potentialPath}`
          );
          if (files.length > 0) {
            imageDirectory = potentialPath;
            imageFiles = files;
            logger.log(
              `[SCHEDULE_IMAGES] Found images in directory: ${potentialPath}`
            );
            break;
          }
        } catch {
          logger.log(
            `[SCHEDULE_IMAGES] Path does not exist or can't be accessed: ${potentialPath}`
          );
        }
      }
    }

    // Check if we found any images
    if (imageFiles.length === 0) {
      logger.log(
        `[SCHEDULE_IMAGES] No image files found for note: ${data.noteId}`
      );
      return data;
    }

    logger.log(
      `[SCHEDULE_IMAGES] Found ${imageFiles.length} image files to process`
    );

    // Use the existing image queue from the dependencies
    const imageQueue = queues?.imageQueue;

    if (!imageQueue) {
      throw new Error("Image queue not available in dependencies");
    }

    for (const [index, imageFile] of imageFiles.entries()) {
      logger.log(
        `[SCHEDULE_IMAGES] Processing image ${index + 1}/${imageFiles.length}: ${imageFile.fileName}`
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
        `[SCHEDULE_IMAGES] Adding job to queue for image ${index}: ${imageFile.fileName}`
      );

      // Schedule a single job - the worker pipeline will handle upload + process + save
      await imageQueue.add(ActionName.UPLOAD_ORIGINAL, imageJobData);
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
