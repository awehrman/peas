import { ActionName } from "../../../../types";
import type {
  NotePipelineData,
  NoteWorkerDependencies,
} from "../../../../types/notes";
import { BaseAction } from "../../../../workers/core/base-action";
import type { ActionContext } from "../../../../workers/core/types";
import type { Prisma } from "@peas/database";
import { markNoteAsFailed } from "./service";

export class MarkNoteAsFailedAction extends BaseAction<
  NotePipelineData,
  NoteWorkerDependencies,
  NotePipelineData
> {
  constructor(
    private errorMessage: string,
    private errorCode?: "HTML_PARSE_ERROR" | "INGREDIENT_PARSE_ERROR" | "INSTRUCTION_PARSE_ERROR" | "QUEUE_JOB_FAILED" | "IMAGE_UPLOAD_FAILED" | "UNKNOWN_ERROR",
    private errorDetails?: Prisma.InputJsonValue
  ) {
    super();
  }

  get name(): ActionName {
    return ActionName.COMPLETION_STATUS;
  }

  validateInput(data: NotePipelineData): Error | null {
    if (!data.noteId) {
      return new Error("Note ID is required for marking note as failed");
    }
    if (!this.errorMessage) {
      return new Error("Error message is required for marking note as failed");
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
        status: "FAILED",
        message: "Marking note as failed...",
        context: "mark_note_failed",
        noteId: data.noteId,
        indentLevel: 1,
      });
    }

    // Mark note as failed
    await markNoteAsFailed(
      data.noteId!,
      this.errorMessage,
      this.errorCode,
      this.errorDetails,
      deps.logger
    );

    // Send completion message
    if (deps.statusBroadcaster) {
      await deps.statusBroadcaster.addStatusEventAndBroadcast({
        importId: data.importId,
        status: "FAILED",
        message: `Note marked as failed: ${this.errorMessage}`,
        context: "mark_note_failed_complete",
        noteId: data.noteId,
        indentLevel: 1,
        metadata: {
          errorMessage: this.errorMessage,
          errorCode: this.errorCode,
          errorDetails: this.errorDetails,
        },
      });
    }

    return data;
  }
}
