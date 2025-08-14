import { ActionName } from "../../../../types";
import type {
  NotePipelineData,
  NoteWorkerDependencies,
} from "../../../../types/notes";
import { BaseAction } from "../../../../workers/core/base-action";
import type { ActionContext } from "../../../../workers/core/types";
import { getNoteCompletionStatus } from "./service";

export class TrackCompletionAction extends BaseAction<
  NotePipelineData,
  NoteWorkerDependencies,
  NotePipelineData
> {
  get name(): ActionName {
    return ActionName.COMPLETION_STATUS;
  }

  validateInput(data: NotePipelineData): Error | null {
    if (!data.noteId) {
      return new Error("Note ID is required for completion tracking");
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
    if (deps.statusBroadcaster && data.importId) {
      await deps.statusBroadcaster.addStatusEventAndBroadcast({
        importId: data.importId,
        status: "PROCESSING",
        message: "Tracking completion status...",
        context: "track_completion",
        noteId: data.noteId,
        indentLevel: 1,
      });
    }

    // Get current completion status
    const status = getNoteCompletionStatus(data.noteId!);

    // Send completion message with status details
    if (deps.statusBroadcaster && data.importId) {
      const message = status
        ? `Completion status: ${status.allCompleted ? "All workers completed" : "Workers in progress"}`
        : "No completion status found";

      await deps.statusBroadcaster.addStatusEventAndBroadcast({
        importId: data.importId,
        status: status?.allCompleted ? "COMPLETED" : "PROCESSING",
        message,
        context: "track_completion_complete",
        noteId: data.noteId,
        indentLevel: 1,
        metadata: {
          noteWorkerCompleted: status?.noteWorkerCompleted || false,
          instructionWorkerCompleted: status?.instructionWorkerCompleted || false,
          ingredientWorkerCompleted: status?.ingredientWorkerCompleted || false,
          imageWorkerCompleted: status?.imageWorkerCompleted || false,
          allCompleted: status?.allCompleted || false,
          totalImageJobs: status?.totalImageJobs || 0,
          completedImageJobs: status?.completedImageJobs || 0,
          totalIngredientLines: status?.totalIngredientLines || 0,
          completedIngredientLines: status?.completedIngredientLines?.size || 0,
        },
      });
    }

    return data;
  }
}
