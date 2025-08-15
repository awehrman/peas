import { promises as fs } from "fs";
import path from "path";

import type { IServiceContainer } from "../../../../services/container";
import type { StructuredLogger } from "../../../../types";
import type { ImageJobData } from "../../../../workers/image/types";

export interface UploadOriginalData extends ImageJobData {
  r2Key?: string;
  r2Url?: string;
}

export async function uploadOriginal(
  data: ImageJobData,
  serviceContainer: IServiceContainer,
  logger: StructuredLogger
): Promise<UploadOriginalData> {
  try {
    logger.log(`[UPLOAD_ORIGINAL] Starting R2 upload for note: ${data.noteId}`);
    logger.log(`[UPLOAD_ORIGINAL] ImportId: ${data.importId}`);
    logger.log(`[UPLOAD_ORIGINAL] Input path: ${data.imagePath}`);
    logger.log(`[UPLOAD_ORIGINAL] Filename: ${data.filename}`);

    // Check if R2 is configured
    if (!serviceContainer.r2) {
      logger.log(`[UPLOAD_ORIGINAL] R2 not configured, skipping upload`);
      return {
        ...data,
        r2Key: undefined,
        r2Url: undefined,
      };
    }

    // Check if file exists before uploading
    try {
      await fs.access(data.imagePath);
      logger.log(`[UPLOAD_ORIGINAL] ✅ Input file exists: ${data.imagePath}`);
    } catch {
      logger.log(
        `[UPLOAD_ORIGINAL] ❌ Input file not found: ${data.imagePath}`
      );
      throw new Error(
        `Input file not found or not accessible: ${data.imagePath}`
      );
    }

    // Generate R2 key for the original image
    const fileExt = path.extname(data.filename);
    const baseName = path.parse(data.filename).name;
    const r2Key = `originals/${data.importId}/${baseName}${fileExt}`;

    logger.log(`[UPLOAD_ORIGINAL] Generated R2 key: ${r2Key}`);
    logger.log(`[UPLOAD_ORIGINAL] File extension: ${fileExt}`);
    logger.log(`[UPLOAD_ORIGINAL] Base name: ${baseName}`);

    // Upload to R2
    logger.log(`[UPLOAD_ORIGINAL] Starting R2 upload...`);
    const uploadResult = await serviceContainer.r2.uploadFile(
      data.imagePath,
      r2Key
    );

    logger.log(`[UPLOAD_ORIGINAL] ✅ Successfully uploaded to R2`);
    logger.log(`[UPLOAD_ORIGINAL] R2 URL: ${uploadResult.url}`);
    logger.log(`[UPLOAD_ORIGINAL] File size: ${uploadResult.size} bytes`);
    logger.log(`[UPLOAD_ORIGINAL] ETag: ${uploadResult.etag}`);

    return {
      ...data,
      r2Key: uploadResult.key,
      r2Url: uploadResult.url,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.log(`[UPLOAD_ORIGINAL] ❌ Failed to upload to R2: ${errorMessage}`);
    logger.log(`[UPLOAD_ORIGINAL] Error details: ${error}`);

    // Don't throw error - continue with processing even if R2 upload fails
    logger.log(`[UPLOAD_ORIGINAL] Continuing with local processing`);

    return {
      ...data,
      r2Key: undefined,
      r2Url: undefined,
    };
  }
}
