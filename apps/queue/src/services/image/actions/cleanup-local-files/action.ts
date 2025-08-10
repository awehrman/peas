import { cleanupLocalFiles } from "./service";

import { ActionName } from "../../../../types";
import { BaseAction } from "../../../../workers/core/base-action";
import type { ActionContext } from "../../../../workers/core/types";
import type {
  ImageJobData,
  ImageWorkerDependencies,
} from "../../../../workers/image/types";

export class CleanupLocalFilesAction extends BaseAction<
  ImageJobData,
  ImageWorkerDependencies,
  ImageJobData
> {
  name = ActionName.CLEANUP_LOCAL_FILES;

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
        cleanupLocalFiles(data, deps.serviceContainer, deps.logger),
      contextName: "cleanup_local_files",
      startMessage: "Cleanup local files started",
      completionMessage: "Cleanup local files completed",
    });
  }
}
