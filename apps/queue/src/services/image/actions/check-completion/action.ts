import { ActionName } from "../../../../types";
import { BaseAction } from "../../../../workers/core/base-action";
import type { ActionContext } from "../../../../workers/core/types";
import type {
  ImageJobData,
  ImageWorkerDependencies,
} from "../../../../workers/image/types";
import { markImageJobCompleted } from "../../../note/actions/track-completion/service";

export class CheckImageCompletionAction extends BaseAction<
  ImageJobData,
  ImageWorkerDependencies,
  ImageJobData
> {
  public readonly name = ActionName.CHECK_IMAGE_COMPLETION;

  public async execute(
    data: ImageJobData,
    deps: ImageWorkerDependencies,
    _context: ActionContext
  ): Promise<ImageJobData> {
    if (!data.noteId) {
      deps.logger.log(
        `[CHECK_IMAGE_COMPLETION] No note ID available, skipping completion check`
      );
      return data;
    }

    try {
      // Mark this individual image job as completed
      // This will check if all image jobs for the note are finished
      markImageJobCompleted(
        data.noteId,
        deps.logger,
        deps.statusBroadcaster
      );
      deps.logger.log(
        `[CHECK_IMAGE_COMPLETION] Marked image job as completed for note ${data.noteId}`
      );
    } catch (error) {
      deps.logger.log(
        `[CHECK_IMAGE_COMPLETION] Error marking completion: ${error}`
      );
    }

    return data;
  }
}
