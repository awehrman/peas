import { saveImage } from "./service";

import { ActionName } from "../../../../types";
import { BaseAction } from "../../../../workers/core/base-action";
import type { ActionContext } from "../../../../workers/core/types";
import type {
  ImageSaveData,
  ImageWorkerDependencies,
} from "../../../../workers/image/types";

export class SaveImageAction extends BaseAction<
  ImageSaveData,
  ImageWorkerDependencies,
  ImageSaveData
> {
  name = ActionName.SAVE_IMAGE;

  async execute(
    data: ImageSaveData,
    deps: ImageWorkerDependencies,
    context: ActionContext
  ): Promise<ImageSaveData> {
    console.log(
      `[SAVE_IMAGE_ACTION] Starting execution for job ${context.jobId}`
    );
    console.log(`[SAVE_IMAGE_ACTION] Input data:`, data);

    const result = await saveImage(data, deps.serviceContainer, deps.logger);

    console.log(`[SAVE_IMAGE_ACTION] Save completed for job ${context.jobId}`);
    console.log(`[SAVE_IMAGE_ACTION] Result:`, result);

    return result;
  }
}
