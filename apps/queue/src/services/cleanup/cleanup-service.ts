import fs from "fs/promises";
import path from "path";

import type { StructuredLogger } from "../../types";

export interface CleanupResult {
  cleanedDirectories: number;
  failedDirectories: number;
  totalDirectories: number;
  errors: string[];
}

/**
 * Cleanup service for managing orphaned import directories
 */
export class CleanupService {
  private logger: StructuredLogger;
  private uploadsImagesDir: string;

  constructor(logger: StructuredLogger) {
    this.logger = logger;
    this.uploadsImagesDir = path.join(process.cwd(), "uploads", "images");
  }

  /**
   * Clean up orphaned import directories
   */
  async cleanupOrphanedImportDirectories(): Promise<CleanupResult> {
    const result: CleanupResult = {
      cleanedDirectories: 0,
      failedDirectories: 0,
      totalDirectories: 0,
      errors: [],
    };

    try {
      this.logger.log(
        "[CLEANUP_SERVICE] Starting cleanup of orphaned import directories"
      );

      // Check if the uploads/images directory exists
      const dirStats = await fs.stat(this.uploadsImagesDir);
      if (!dirStats.isDirectory()) {
        this.logger.log(
          `[CLEANUP_SERVICE] Uploads images directory does not exist: ${this.uploadsImagesDir}`
        );
        return result;
      }

      // List all import directories
      const contents = await fs.readdir(this.uploadsImagesDir);
      const importDirs = contents.filter(
        (item) =>
          item.startsWith("import_") &&
          item.includes("_") &&
          item.split("_").length >= 3
      );

      result.totalDirectories = importDirs.length;
      this.logger.log(
        `[CLEANUP_SERVICE] Found ${importDirs.length} import directories`
      );

      for (const importDir of importDirs) {
        const importDirPath = path.join(this.uploadsImagesDir, importDir);

        try {
          const dirStats = await fs.stat(importDirPath);
          if (!dirStats.isDirectory()) {
            continue;
          }

          // Check if directory is empty
          const dirContents = await fs.readdir(importDirPath);

          if (dirContents.length === 0) {
            // Directory is empty, remove it
            await fs.rmdir(importDirPath);
            this.logger.log(
              `[CLEANUP_SERVICE] Removed empty import directory: ${importDir}`
            );
            result.cleanedDirectories++;
          } else {
            this.logger.log(
              `[CLEANUP_SERVICE] Import directory not empty (${dirContents.length} items): ${importDir}`
            );

            // Try to clean up any remaining files
            for (const item of dirContents) {
              const itemPath = path.join(importDirPath, item);
              try {
                const itemStats = await fs.stat(itemPath);
                if (itemStats.isFile()) {
                  await fs.unlink(itemPath);
                }
              } catch (fileError) {
                this.logger.log(
                  `[CLEANUP_SERVICE] Failed to remove file ${itemPath}: ${fileError}`
                );
              }
            }

            // Try to remove the directory again after cleaning files
            try {
              const remainingContents = await fs.readdir(importDirPath);
              if (remainingContents.length === 0) {
                await fs.rmdir(importDirPath);
                this.logger.log(
                  `[CLEANUP_SERVICE] Removed import directory after file cleanup: ${importDir}`
                );
                result.cleanedDirectories++;
              } else {
                this.logger.log(
                  `[CLEANUP_SERVICE] Import directory still has ${remainingContents.length} items after cleanup: ${importDir}`
                );
              }
            } catch (finalError) {
              this.logger.log(
                `[CLEANUP_SERVICE] Could not remove import directory after cleanup: ${importDir} - ${finalError}`
              );
              result.failedDirectories++;
              result.errors.push(
                `Failed to remove ${importDir}: ${finalError}`
              );
            }
          }
        } catch (error) {
          this.logger.log(
            `[CLEANUP_SERVICE] Error processing import directory ${importDir}: ${error}`
          );
          result.failedDirectories++;
          result.errors.push(`Error processing ${importDir}: ${error}`);
        }
      }

      this.logger.log(
        `[CLEANUP_SERVICE] Cleanup completed: ${result.cleanedDirectories} cleaned, ${result.failedDirectories} failed, ${result.totalDirectories} total`
      );
    } catch (error) {
      this.logger.log(
        `[CLEANUP_SERVICE] Failed to cleanup orphaned import directories: ${error}`
      );
      result.errors.push(`Service error: ${error}`);
    }

    return result;
  }

  /**
   * Clean up a specific import directory
   */
  async cleanupImportDirectory(importId: string): Promise<boolean> {
    try {
      const importDir = path.join(this.uploadsImagesDir, importId);

      // Check if directory exists
      const dirStats = await fs.stat(importDir);
      if (!dirStats.isDirectory()) {
        this.logger.log(
          `[CLEANUP_SERVICE] Import directory does not exist: ${importDir}`
        );
        return true;
      }

      // List contents to see if directory is empty
      const contents = await fs.readdir(importDir);
      if (contents.length === 0) {
        // Directory is empty, remove it
        await fs.rmdir(importDir);
        this.logger.log(
          `[CLEANUP_SERVICE] Successfully removed empty import directory: ${importDir}`
        );
        return true;
      } else {
        this.logger.log(
          `[CLEANUP_SERVICE] Import directory not empty (${contents.length} items): ${importDir}`
        );

        // Try to clean up any remaining files
        for (const item of contents) {
          const itemPath = path.join(importDir, item);
          try {
            const itemStats = await fs.stat(itemPath);
            if (itemStats.isFile()) {
              await fs.unlink(itemPath);
              this.logger.log(
                `[CLEANUP_SERVICE] Removed remaining file: ${itemPath}`
              );
            }
          } catch (fileError) {
            this.logger.log(
              `[CLEANUP_SERVICE] Failed to remove file ${itemPath}: ${fileError}`
            );
          }
        }

        // Try to remove the directory again after cleaning files
        try {
          const remainingContents = await fs.readdir(importDir);
          if (remainingContents.length === 0) {
            await fs.rmdir(importDir);
            this.logger.log(
              `[CLEANUP_SERVICE] Successfully removed import directory after file cleanup: ${importDir}`
            );
            return true;
          } else {
            this.logger.log(
              `[CLEANUP_SERVICE] Import directory still has ${remainingContents.length} items after cleanup: ${importDir}`
            );
            return false;
          }
        } catch (finalError) {
          this.logger.log(
            `[CLEANUP_SERVICE] Could not remove import directory after cleanup: ${finalError}`
          );
          return false;
        }
      }
    } catch (error) {
      if ((error as { code?: string }).code === "ENOENT") {
        this.logger.log(
          `[CLEANUP_SERVICE] Import directory already deleted: ${importId}`
        );
        return true;
      } else {
        this.logger.log(
          `[CLEANUP_SERVICE] Failed to cleanup import directory ${importId}: ${error}`
        );
        return false;
      }
    }
  }
}
