// SaveNoteAction is temporarily disabled while focusing on clean and parse actions
// This will be re-enabled when we add back the save functionality

/*
import { SaveNoteDataSchema } from "./schema";
import { NotePipelineData } from "../../../types/notes";

import { BaseAction } from "../../../workers/core/base-action";
import { ActionContext } from "../../../workers/core/types";
import { NoteWorkerDependencies } from "../../../types/notes";

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
    if (data.importId && deps.statusBroadcaster) {
      try {
        await deps.statusBroadcaster.addStatusEventAndBroadcast({
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

    // Call the saveNote service from dependencies
    const result = await deps.services.saveNote(data);

    deps.logger.log(
      `[SAVE_NOTE] Successfully created note for job ${context.jobId}, noteId: "${result.noteId}"`
    );

    // Broadcast completion status if importId is provided
    if (data.importId && deps.statusBroadcaster) {
      try {
        await deps.statusBroadcaster.addStatusEventAndBroadcast({
          importId: data.importId,
          noteId: result.noteId, // Now we have the actual noteId
          status: "COMPLETED",
          message: "Note saved successfully",
          context: "save_note_complete",
          indentLevel: 1, // Slightly indented for main operations
          metadata: {
            noteTitle: result.note?.title, // Include the note title in metadata
          },
        });
      } catch (error) {
        deps.logger.log(
          `[SAVE_NOTE] Failed to broadcast completion status: ${error}`
        );
      }
    }

    return result;
  }
}
*/
