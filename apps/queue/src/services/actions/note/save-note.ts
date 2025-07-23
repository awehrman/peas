import { SaveNoteDataSchema } from "./schema";
import { NotePipelineData, NoteWorkerDependencies } from "./types";

import { BaseAction } from "../../../workers/core/base-action";
import { ActionContext } from "../../../workers/core/types";

export class SaveNoteAction extends BaseAction<
  NotePipelineData,
  NoteWorkerDependencies,
  NotePipelineData
> {
  name = "save_note";
  private schema = SaveNoteDataSchema;

  validateInput(data: NotePipelineData): Error | null {
    try {
      this.schema.parse(data);
      return null;
    } catch (error) {
      return error instanceof Error ? error : new Error(String(error));
    }
  }

  async execute(
    data: NotePipelineData,
    deps: NoteWorkerDependencies,
    context: ActionContext
  ): Promise<NotePipelineData> {
    deps.logger.log(
      `[SAVE_NOTE] Starting note creation for job ${context.jobId}`
    );

    // Broadcast start status if importId is provided
    if (data.importId) {
      try {
        await deps.addStatusEventAndBroadcast({
          importId: data.importId,
          status: "PROCESSING",
          message: "Saving note to database",
          context: "save_note_start",
          indentLevel: 1, // Slightly indented for main operations
        });
      } catch (error) {
        deps.logger.log(
          `[SAVE_NOTE] Failed to broadcast start status: ${error}`
        );
      }
    }

    if (!data.file) {
      throw new Error("SaveNoteAction: data.file is required");
    }
    const note = await deps.createNote(data.file);

    deps.logger.log(
      `[SAVE_NOTE] Successfully created note for job ${context.jobId}, noteId: "${note.id}"`
    );

    // Broadcast completion status if importId is provided
    if (data.importId) {
      try {
        await deps.addStatusEventAndBroadcast({
          importId: data.importId,
          noteId: note.id, // Now we have the actual noteId
          status: "COMPLETED",
          message: "Note saved successfully",
          context: "save_note_complete",
          indentLevel: 1, // Slightly indented for main operations
          metadata: {
            noteTitle: note.title, // Include the note title in metadata
          },
        });
      } catch (error) {
        deps.logger.log(
          `[SAVE_NOTE] Failed to broadcast completion status: ${error}`
        );
      }
    }

    return { ...data, note, noteId: note.id };
  }
}
