import { imageCompletedStatus } from "./service";

import { ActionName } from "../../../../types";
import { BaseAction } from "../../../../workers/core/base-action";
import type { ActionContext } from "../../../../workers/core/types";
import type {
  ImageSaveData,
  ImageWorkerDependencies,
} from "../../../../workers/image/types";

export class ImageCompletedStatusAction extends BaseAction<
  ImageSaveData,
  ImageWorkerDependencies,
  ImageSaveData
> {
  name = ActionName.IMAGE_COMPLETED_STATUS;

  async execute(
    data: ImageSaveData,
    deps: ImageWorkerDependencies,
    context: ActionContext
  ): Promise<ImageSaveData> {
    console.log(
      `[IMAGE_COMPLETED_STATUS_ACTION] Starting execution for job ${context.jobId}`
    );
    console.log(`[IMAGE_COMPLETED_STATUS_ACTION] Input data:`, data);

    const result = await imageCompletedStatus(
      data,
      deps.serviceContainer,
      deps.logger
    );

    console.log(
      `[IMAGE_COMPLETED_STATUS_ACTION] Status update completed for job ${context.jobId}`
    );
    console.log(`[IMAGE_COMPLETED_STATUS_ACTION] Result:`, result);

    return result;
  }
}
