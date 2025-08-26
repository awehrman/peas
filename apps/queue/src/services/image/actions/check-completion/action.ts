import { checkImageCompletion } from "./service";

import { ActionName } from "../../../../types";
import { BaseAction } from "../../../../workers/core/base-action";
import type { ActionContext } from "../../../../workers/core/types";
import type {
  ImageJobData,
  ImageWorkerDependencies,
} from "../../../../workers/image/types";

export class CheckImageCompletionAction extends BaseAction<
  ImageJobData,
  ImageWorkerDependencies,
  ImageJobData
> {
  public readonly name = ActionName.CHECK_IMAGE_COMPLETION;

  /**
   * Validate input data before checking completion
   * @param data The image job data to validate
   * @returns Error if validation fails, null if valid
   */
  validateInput(_data: ImageJobData): Error | null {
    // Note: We don't require noteId to be present as the service handles this gracefully
    return null;
  }

  /**
   * Execute the action to check image completion
   * @param data The image job data
   * @param deps Dependencies required by the action
   * @param context Context information about the job
   * @returns Promise resolving to the updated image job data
   */
  async execute(
    data: ImageJobData,
    deps: ImageWorkerDependencies,
    context: ActionContext
  ): Promise<ImageJobData> {
    return this.executeServiceAction({
      data,
      deps,
      context,
      serviceCall: () => checkImageCompletion(data, deps),
      contextName: "check_image_completion",
      startMessage: `Checking image completion for note: ${data.noteId || "unknown"}`,
      completionMessage: "Image completion check completed",
    });
  }
}

export { checkImageCompletion };
