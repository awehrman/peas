import { uploadOriginal } from "./service";

import { ActionName } from "../../../../types";
import { BaseAction } from "../../../../workers/core/base-action";
import type { ActionContext } from "../../../../workers/core/types";
import type {
  ImageProcessingData,
  ImageSaveData,
} from "../../../../workers/image/types";
import type { ImageWorkerDependencies } from "../../../../workers/image/types";

export class UploadOriginalAction extends BaseAction<
  ImageProcessingData,
  ImageWorkerDependencies,
  ImageSaveData
> {
  name = ActionName.UPLOAD_ORIGINAL;

  async execute(
    data: ImageProcessingData,
    deps: ImageWorkerDependencies,
    _context: ActionContext
  ): Promise<ImageSaveData> {
    const result = await uploadOriginal(
      data,
      deps.serviceContainer,
      deps.logger
    );

    // Convert ImageProcessingData to ImageSaveData
    // This is a placeholder - the actual conversion happens in PROCESS_IMAGE
    return {
      noteId: result.noteId,
      importId: result.importId,
      originalPath: result.imagePath, // Placeholder
      thumbnailPath: "", // Will be set by PROCESS_IMAGE
      crop3x2Path: "", // Will be set by PROCESS_IMAGE
      crop4x3Path: "", // Will be set by PROCESS_IMAGE
      crop16x9Path: "", // Will be set by PROCESS_IMAGE
      originalSize: 0, // Will be set by PROCESS_IMAGE
      thumbnailSize: 0, // Will be set by PROCESS_IMAGE
      crop3x2Size: 0, // Will be set by PROCESS_IMAGE
      crop4x3Size: 0, // Will be set by PROCESS_IMAGE
      crop16x9Size: 0, // Will be set by PROCESS_IMAGE
      metadata: { width: 0, height: 0, format: "unknown" }, // Will be set by PROCESS_IMAGE
      r2Key: result.r2Key,
      r2Url: result.r2Url,
    };
  }
}
