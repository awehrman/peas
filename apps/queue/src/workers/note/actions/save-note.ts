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

    const note = await deps.createNote(data.file);

    deps.logger.log(
      `[SAVE_NOTE] Successfully created note for job ${context.jobId}, noteId: "${note.id}"`
    );

    return { ...data, note, noteId: note.id };
  }
}
