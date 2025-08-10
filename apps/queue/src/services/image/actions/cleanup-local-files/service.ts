import fs from "fs/promises";

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

    // List of files to clean up
    const filesToCleanup = [
      { path: data.imagePath, name: "original uploaded" },
      { path: data.originalPath, name: "processed original" },
      { path: data.thumbnailPath, name: "thumbnail" },
      { path: data.crop3x2Path, name: "crop3x2" },
      { path: data.crop4x3Path, name: "crop4x3" },
      { path: data.crop16x9Path, name: "crop16x9" },
    ];

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
