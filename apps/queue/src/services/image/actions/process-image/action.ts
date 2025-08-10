import { processImage } from "./service";

import { ActionName } from "../../../../types";
import { BaseAction } from "../../../../workers/core/base-action";
import type { ActionContext } from "../../../../workers/core/types";
import type {
  ImageJobData,
  ImageWorkerDependencies,
} from "../../../../workers/image/types";

export class ProcessImageAction extends BaseAction<
  ImageJobData,
  ImageWorkerDependencies,
  ImageJobData
> {
  name = ActionName.PROCESS_IMAGE;

  async execute(
    data: ImageJobData,
    deps: ImageWorkerDependencies,
    context: ActionContext
  ): Promise<ImageJobData> {
    return this.executeServiceAction({
      data,
      deps,
      context,
      serviceCall: () => processImage(data, deps.logger),
      contextName: "image_processing",
      startMessage: "Image processing started",
      completionMessage: "Image processing completed",
    });
  }
}
