import { markWorkerCompleted } from "./service";

import { ActionName } from "../../../../types";
import type {
  NotePipelineData,
  NoteWorkerDependencies,
} from "../../../../types/notes";
import { BaseAction } from "../../../../workers/core/base-action";
import type { ActionContext } from "../../../../workers/core/types";

export class MarkWorkerCompletedAction extends BaseAction<
  NotePipelineData,
  NoteWorkerDependencies,
  NotePipelineData
> {
  constructor(
    private workerType: "note" | "instruction" | "ingredient" | "image"
  ) {
    super();
  }

  get name(): ActionName {
    return ActionName.COMPLETION_STATUS;
  }

  validateInput(data: NotePipelineData): Error | null {
    if (!data.noteId) {
      return new Error("Note ID is required for marking worker completion");
    }
    return null;
  }

  async execute(
    data: NotePipelineData,
    deps: NoteWorkerDependencies,
    _context: ActionContext
  ): Promise<NotePipelineData> {
    // Validate input before processing
    const validationError = this.validateInput(data);
    if (validationError) {
      throw validationError;
    }

    // Send start message
    if (deps.statusBroadcaster) {
      await deps.statusBroadcaster.addStatusEventAndBroadcast({
        importId: data.importId,
        status: "PROCESSING",
        message: `Marking ${this.workerType} worker as completed...`,
        context: "mark_worker_completed",
        noteId: data.noteId,
        indentLevel: 1,
      });
    }

    // Mark worker as completed
    await markWorkerCompleted(
      data.noteId!,
      this.workerType,
      deps.logger,
      deps.statusBroadcaster
    );

    // Send completion message
    if (deps.statusBroadcaster) {
      await deps.statusBroadcaster.addStatusEventAndBroadcast({
        importId: data.importId,
        status: "COMPLETED",
        message: `${this.workerType} worker marked as completed`,
        context: "mark_worker_completed_complete",
        noteId: data.noteId,
        indentLevel: 1,
        metadata: {
          workerType: this.workerType,
        },
      });
    }

    return data;
  }
}
