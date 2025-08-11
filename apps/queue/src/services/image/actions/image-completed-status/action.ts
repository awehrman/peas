import { updateImageCompletedStatus } from "./service";

import { ActionName } from "../../../../types";
import { BaseAction } from "../../../../workers/core/base-action";
import type { ActionContext } from "../../../../workers/core/types";
import type {
  ImageJobData,
  ImageWorkerDependencies,
} from "../../../../workers/image/types";

export class ImageCompletedStatusAction extends BaseAction<
  ImageJobData,
  ImageWorkerDependencies,
  ImageJobData
> {
  name = ActionName.IMAGE_COMPLETED_STATUS;

  async execute(
    data: ImageJobData,
    deps: ImageWorkerDependencies,
    context: ActionContext
  ): Promise<ImageJobData> {
    return this.executeServiceAction({
      data,
      deps,
      context,
      serviceCall: () => updateImageCompletedStatus(
        data, 
        deps.serviceContainer, 
        deps.logger,
        deps.statusBroadcaster
      ),
      contextName: "image_completed_status",
      startMessage: "Image completed status update started",
      completionMessage: "Image completed status update completed",
    });
  }
}
