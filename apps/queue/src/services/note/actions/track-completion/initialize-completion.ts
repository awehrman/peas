import { ActionName } from "../../../../types";
import type {
  NotePipelineData,
  NoteWorkerDependencies,
} from "../../../../types/notes";
import { BaseAction } from "../../../../workers/core/base-action";
import type { ActionContext } from "../../../../workers/core/types";
import { initializeNoteCompletion } from "./service";

export class InitializeCompletionTrackingAction extends BaseAction<
  NotePipelineData,
  NoteWorkerDependencies,
  NotePipelineData
> {
  get name(): ActionName {
    return ActionName.COMPLETION_STATUS;
  }

  validateInput(data: NotePipelineData): Error | null {
    if (!data.noteId) {
      return new Error("Note ID is required for completion tracking initialization");
    }
    if (!data.importId) {
      return new Error("Import ID is required for completion tracking initialization");
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
        message: "Initializing completion tracking...",
        context: "initialize_completion_tracking",
        noteId: data.noteId,
        indentLevel: 1,
      });
    }

    // Initialize completion tracking
    await initializeNoteCompletion(data.noteId!, data.importId!, deps.logger);

    // Send completion message
    if (deps.statusBroadcaster) {
      await deps.statusBroadcaster.addStatusEventAndBroadcast({
        importId: data.importId,
        status: "COMPLETED",
        message: "Completion tracking initialized",
        context: "initialize_completion_tracking_complete",
        noteId: data.noteId,
        indentLevel: 1,
      });
    }

    return data;
  }
}
