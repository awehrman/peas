import { processImage } from "./service";

import { ActionName } from "../../../../types";
import { BaseAction } from "../../../../workers/core/base-action";
import type { ActionContext } from "../../../../workers/core/types";
import type {
  ImageProcessingData,
  ImageSaveData,
  ImageWorkerDependencies,
} from "../../../../workers/image/types";

export class ProcessImageAction extends BaseAction<
  ImageProcessingData,
  ImageWorkerDependencies,
  ImageSaveData
> {
  name = ActionName.PROCESS_IMAGE;

  async execute(
    data: ImageProcessingData,
    deps: ImageWorkerDependencies,
    context: ActionContext
  ): Promise<ImageSaveData> {
    console.log(
      `[PROCESS_IMAGE_ACTION] Starting execution for job ${context.jobId}`
    );
    console.log(`[PROCESS_IMAGE_ACTION] Input data:`, data);

    const result = await processImage(data, deps.logger);

    console.log(
      `[PROCESS_IMAGE_ACTION] Processing completed for job ${context.jobId}`
    );
    console.log(`[PROCESS_IMAGE_ACTION] Result:`, result);

    return result;
  }
}
