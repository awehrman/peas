import fs from "fs/promises";
import path from "path";

import type { IServiceContainer } from "../../../../services/container";
import type { StructuredLogger } from "../../../../types";
import type { ImageJobData } from "../../../../workers/image/types";

export async function cleanupLocalFiles(
  data: ImageJobData,
  serviceContainer: IServiceContainer,
  logger: StructuredLogger
): Promise<ImageJobData> {
  try {
    logger.log(
      `[CLEANUP_LOCAL_FILES] Starting cleanup for note: ${data.noteId}`
    );

    // Processed files without an R2 copy are served from local disk, so keep them
    const localFiles = [
      { path: data.imagePath, name: "original uploaded", shouldDelete: true },
      {
        path: data.originalPath,
        name: "processed original",
        shouldDelete: Boolean(data.r2OriginalUrl),
      },
      {
        path: data.thumbnailPath,
        name: "thumbnail",
        shouldDelete: Boolean(data.r2ThumbnailUrl),
      },
      {
        path: data.crop3x2Path,
        name: "crop3x2",
        shouldDelete: Boolean(data.r2Crop3x2Url),
      },
      {
        path: data.crop4x3Path,
        name: "crop4x3",
        shouldDelete: Boolean(data.r2Crop4x3Url),
      },
      {
        path: data.crop16x9Path,
        name: "crop16x9",
        shouldDelete: Boolean(data.r2Crop16x9Url),
      },
    ];
    const filesToCleanup = localFiles.filter((file) => file.shouldDelete);

    const keptCount = localFiles.length - filesToCleanup.length;
    if (keptCount > 0) {
      logger.log(
        `[CLEANUP_LOCAL_FILES] Keeping ${keptCount} processed file(s) for local serving`
      );
    }

    const cleanupResults = await Promise.allSettled(
      filesToCleanup.map(async ({ path: filePath, name }) => {
        try {
          // Check if file exists before trying to delete
          await fs.access(filePath);
          await fs.unlink(filePath);
          logger.log(
            `[CLEANUP_LOCAL_FILES] Successfully deleted ${name}: ${filePath}`
          );
          return { name, success: true };
        } catch (error) {
          if ((error as { code?: string }).code === "ENOENT") {
            logger.log(`[CLEANUP_LOCAL_FILES] File already deleted: ${name}`);
            return { name, success: true, alreadyDeleted: true };
          } else {
            logger.log(
              `[CLEANUP_LOCAL_FILES] Failed to delete ${name}: ${error}`
            );
            return { name, success: false, error };
          }
        }
      })
    );

    // Clean up the output directory if it exists and is empty
    try {
      if (data.outputDir) {
        const outputDirPath = path.resolve(data.outputDir);
        logger.log(`[CLEANUP_LOCAL_FILES] Checking output directory: ${outputDirPath}`);
        
        // Check if directory exists
        const dirStats = await fs.stat(outputDirPath);
        if (dirStats.isDirectory()) {
          // List contents to see if directory is empty
          const contents = await fs.readdir(outputDirPath);
          if (contents.length === 0) {
            // Directory is empty, remove it
            await fs.rmdir(outputDirPath);
            logger.log(`[CLEANUP_LOCAL_FILES] Successfully removed empty output directory: ${outputDirPath}`);
          } else {
            logger.log(`[CLEANUP_LOCAL_FILES] Output directory not empty (${contents.length} items), leaving: ${outputDirPath}`);
          }
        }
      }
    } catch (dirError) {
      if ((dirError as { code?: string }).code === "ENOENT") {
        logger.log(`[CLEANUP_LOCAL_FILES] Output directory already deleted: ${data.outputDir}`);
      } else {
        logger.log(`[CLEANUP_LOCAL_FILES] Failed to cleanup output directory: ${dirError}`);
      }
    }

    const successful = cleanupResults.filter(
      (result) => result.status === "fulfilled" && result.value.success
    ).length;

    const failed = cleanupResults.filter(
      (result) =>
        result.status === "rejected" ||
        (result.status === "fulfilled" && !result.value.success)
    ).length;

    logger.log(
      `[CLEANUP_LOCAL_FILES] Cleanup completed: ${successful} successful, ${failed} failed`
    );

    return data;
  } catch (error) {
    logger.log(`[CLEANUP_LOCAL_FILES] Cleanup failed: ${error}`);
    // Don't throw error - cleanup failure shouldn't fail the entire pipeline
    return data;
  }
}
