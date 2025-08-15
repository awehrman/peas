import type { ImageJobData } from "../../../../workers/image/types";
import type { ImageWorkerDependencies } from "../../../../workers/image/types";
import { markImageJobCompleted } from "../../../note/actions/track-completion/service";

export async function checkImageCompletion(
  data: ImageJobData,
  deps: ImageWorkerDependencies
): Promise<ImageJobData> {
  deps.logger.log(`[CHECK_IMAGE_COMPLETION] Starting completion check`);
  deps.logger.log(`[CHECK_IMAGE_COMPLETION] NoteId: ${data.noteId}`);
  deps.logger.log(`[CHECK_IMAGE_COMPLETION] ImportId: ${data.importId}`);
  deps.logger.log(`[CHECK_IMAGE_COMPLETION] Filename: ${data.filename}`);

  if (!data.noteId) {
    deps.logger.log(
      `[CHECK_IMAGE_COMPLETION] ❌ No note ID available, skipping completion check`
    );
    return data;
  }

  try {
    // Mark this individual image job as completed
    // This will check if all image jobs for the note are finished
    deps.logger.log(
      `[CHECK_IMAGE_COMPLETION] Marking image job as completed for note: ${data.noteId}`
    );
    await markImageJobCompleted(
      data.noteId,
      deps.logger,
      deps.statusBroadcaster
    );
    deps.logger.log(
      `[CHECK_IMAGE_COMPLETION] ✅ Marked image job as completed for note ${data.noteId}`
    );
  } catch (error) {
    deps.logger.log(
      `[CHECK_IMAGE_COMPLETION] ❌ Error marking completion: ${error}`
    );
    deps.logger.log(`[CHECK_IMAGE_COMPLETION] Error details: ${error}`);
  }

  deps.logger.log(`[CHECK_IMAGE_COMPLETION] ✅ Completion check finished`);
  return data;
}
