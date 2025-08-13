import fs from "fs/promises";
import path from "path";

import type { IServiceContainer } from "../../../../services/container";
import type { StructuredLogger } from "../../../../types";
import type { ImageJobData } from "../../../../workers/image/types";

export interface UploadProcessedData extends ImageJobData {
  r2OriginalUrl?: string;
  r2ThumbnailUrl?: string;
  r2Crop3x2Url?: string;
  r2Crop4x3Url?: string;
  r2Crop16x9Url?: string;
}

export async function uploadProcessed(
  data: ImageJobData,
  serviceContainer: IServiceContainer,
  logger: StructuredLogger
): Promise<UploadProcessedData> {
  try {
    logger.log(
      `[UPLOAD_PROCESSED] Starting R2 upload for processed images: ${data.noteId}`
    );

    // Check if R2 is configured
    if (!serviceContainer.r2) {
      logger.log(`[UPLOAD_PROCESSED] R2 not configured, skipping upload`);
      return {
        ...data,
        r2OriginalUrl: undefined,
        r2ThumbnailUrl: undefined,
        r2Crop3x2Url: undefined,
        r2Crop4x3Url: undefined,
        r2Crop16x9Url: undefined,
      };
    }

    // Generate consistent R2 keys using note ID or import ID
    const baseName = data.noteId || data.importId;
    const fileExt = path.extname(data.filename);

    const r2Keys = {
      original: `processed/${data.importId}/${baseName}-original${fileExt}`,
      thumbnail: `processed/${data.importId}/${baseName}-thumbnail${fileExt}`,
      crop3x2: `processed/${data.importId}/${baseName}-crop3x2${fileExt}`,
      crop4x3: `processed/${data.importId}/${baseName}-crop4x3${fileExt}`,
      crop16x9: `processed/${data.importId}/${baseName}-crop16x9${fileExt}`,
    };

    logger.log(
      `[UPLOAD_PROCESSED] Generated R2 keys: ${JSON.stringify(r2Keys)}`
    );

    // Upload all processed images to R2
    const uploadPromises = [
      { key: r2Keys.original, path: data.originalPath, name: "original" },
      { key: r2Keys.thumbnail, path: data.thumbnailPath, name: "thumbnail" },
      { key: r2Keys.crop3x2, path: data.crop3x2Path, name: "crop3x2" },
      { key: r2Keys.crop4x3, path: data.crop4x3Path, name: "crop4x3" },
      { key: r2Keys.crop16x9, path: data.crop16x9Path, name: "crop16x9" },
    ].map(async ({ key, path: filePath, name }) => {
      try {
        // Check if file exists
        await fs.access(filePath);

        logger.log(`[UPLOAD_PROCESSED] Uploading ${name} to R2: ${key}`);
        const result = await serviceContainer.r2!.uploadFile(filePath, key);
        logger.log(
          `[UPLOAD_PROCESSED] Successfully uploaded ${name}: ${result.url}`
        );

        return { name, url: result.url, success: true };
      } catch (error) {
        logger.log(`[UPLOAD_PROCESSED] Failed to upload ${name}: ${error}`);
        return { name, url: undefined, success: false, error };
      }
    });

    const uploadResults = await Promise.all(uploadPromises);

    // Extract URLs from successful uploads
    const urls = uploadResults.reduce(
      (acc, result) => {
        if (result.success && result.url) {
          acc[
            `r2${result.name.charAt(0).toUpperCase() + result.name.slice(1)}Url`
          ] = result.url;
        }
        return acc;
      },
      {} as Record<string, string>
    );

    logger.log(
      `[UPLOAD_PROCESSED] Upload results: ${JSON.stringify(uploadResults)}`
    );

    return {
      ...data,
      ...urls,
    };
  } catch (error) {
    /* istanbul ignore next -- @preserve */
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.log(
      `[UPLOAD_PROCESSED] Failed to upload processed images: ${errorMessage}`
    );

    // Don't throw error - continue with processing even if R2 upload fails
    return {
      ...data,
      r2OriginalUrl: undefined,
      r2ThumbnailUrl: undefined,
      r2Crop3x2Url: undefined,
      r2Crop4x3Url: undefined,
      r2Crop16x9Url: undefined,
    };
  }
}
