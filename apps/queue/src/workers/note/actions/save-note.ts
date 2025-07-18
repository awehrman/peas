import { ValidatedAction } from "../../core/validated-action";
import { ActionContext } from "../../core/types";
import { NoteWorkerDependencies, NoteWithParsedLines } from "../types";
import { SaveNoteDataSchema, type SaveNoteData } from "../schema";

export class SaveNoteAction extends ValidatedAction<
  typeof SaveNoteDataSchema,
  NoteWorkerDependencies,
  SaveNoteData & { note: NoteWithParsedLines }
> {
  name = "save_note";
  constructor() {
    super(SaveNoteDataSchema);
  }

  async run(
    data: SaveNoteData,
    deps: NoteWorkerDependencies,
    context: ActionContext
  ): Promise<SaveNoteData & { note: NoteWithParsedLines; noteId: string }> {
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
