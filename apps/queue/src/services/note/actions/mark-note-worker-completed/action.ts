import { ActionName } from "../../../../types";
import type {
  NotePipelineData,
  NoteWorkerDependencies,
} from "../../../../types/notes";
import { BaseAction } from "../../../../workers/core/base-action";
import type { ActionContext } from "../../../../workers/core/types";
import { markWorkerCompleted } from "../track-completion/service";

export class MarkNoteWorkerCompletedAction extends BaseAction<
  NotePipelineData,
  NoteWorkerDependencies,
  NotePipelineData
> {
  get name(): ActionName {
    return ActionName.MARK_NOTE_WORKER_COMPLETED;
  }
  async execute(
    data: NotePipelineData,
    deps: NoteWorkerDependencies,
    _context: ActionContext
  ): Promise<NotePipelineData> {
    if (!data.noteId) {
      deps.logger.log(
        `[MARK_NOTE_WORKER_COMPLETED] No noteId available, skipping completion tracking`
      );
      return data;
    }

    deps.logger.log(
      `[MARK_NOTE_WORKER_COMPLETED] Marking note worker as completed for note: ${data.noteId}`
    );

    try {
      await markWorkerCompleted(
        data.noteId,
        "note",
        deps.logger,
        deps.statusBroadcaster
      );

      deps.logger.log(
        `[MARK_NOTE_WORKER_COMPLETED] Successfully marked note worker as completed for note: ${data.noteId}`
      );
    } catch (error) {
      deps.logger.log(
        `[MARK_NOTE_WORKER_COMPLETED] Failed to mark note worker as completed: ${error}`
      );
      // Don't fail the pipeline if completion tracking fails
    }

    return data;
  }
}
