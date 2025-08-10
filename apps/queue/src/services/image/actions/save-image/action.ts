import { saveImage } from "./service";

import { ActionName } from "../../../../types";
import { BaseAction } from "../../../../workers/core/base-action";
import type { ActionContext } from "../../../../workers/core/types";
import type {
  ImageJobData,
  ImageWorkerDependencies,
} from "../../../../workers/image/types";

export class SaveImageAction extends BaseAction<
  ImageJobData,
  ImageWorkerDependencies,
  ImageJobData
> {
  name = ActionName.SAVE_IMAGE;

  async execute(
    data: ImageJobData,
    deps: ImageWorkerDependencies,
    context: ActionContext
  ): Promise<ImageJobData> {
    return this.executeServiceAction({
      data,
      deps,
      context,
      serviceCall: () => saveImage(data, deps.serviceContainer, deps.logger),
      contextName: "image_save",
      startMessage: "Image save started",
      completionMessage: "Image save completed",
    });
  }
}
