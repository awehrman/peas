import { uploadOriginal } from "./service";

import { ActionName } from "../../../../types";
import { BaseAction } from "../../../../workers/core/base-action";
import type { ActionContext } from "../../../../workers/core/types";
import type { ImageJobData } from "../../../../workers/image/types";
import type { ImageWorkerDependencies } from "../../../../workers/image/types";

export class UploadOriginalAction extends BaseAction<
  ImageJobData,
  ImageWorkerDependencies,
  ImageJobData
> {
  name = ActionName.UPLOAD_ORIGINAL;

  async execute(
    data: ImageJobData,
    deps: ImageWorkerDependencies,
    _context: ActionContext
  ): Promise<ImageJobData> {
    const result = await uploadOriginal(
      data,
      deps.serviceContainer,
      deps.logger
    );

    // Return the updated data with R2 information
    return {
      ...data,
      r2Key: result.r2Key,
      r2Url: result.r2Url,
    };
  }
}
