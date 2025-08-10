import { uploadProcessed } from "./service";

import { ActionName } from "../../../../types";
import { BaseAction } from "../../../../workers/core/base-action";
import type { ActionContext } from "../../../../workers/core/types";
import type {
  ImageJobData,
  ImageWorkerDependencies,
} from "../../../../workers/image/types";

export class UploadProcessedAction extends BaseAction<
  ImageJobData,
  ImageWorkerDependencies,
  ImageJobData
> {
  name = ActionName.UPLOAD_PROCESSED;

  async execute(
    data: ImageJobData,
    deps: ImageWorkerDependencies,
    context: ActionContext
  ): Promise<ImageJobData> {
    return this.executeServiceAction({
      data,
      deps,
      context,
      serviceCall: () =>
        uploadProcessed(data, deps.serviceContainer, deps.logger),
      contextName: "upload_processed",
      startMessage: "Upload processed images started",
      completionMessage: "Upload processed images completed",
    });
  }
}
