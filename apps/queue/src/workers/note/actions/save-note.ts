import { ValidatedAction } from "../../core/validated-action";
import { ActionContext } from "../../core/types";
import { SaveNoteData, SaveNoteDeps, NoteWithParsedLines } from "../types";
import { SaveNoteDataSchema } from "../schema";

export class SaveNoteAction extends ValidatedAction<
  typeof SaveNoteDataSchema,
  SaveNoteDeps,
  SaveNoteData & { note: NoteWithParsedLines }
> {
  name = "save_note";
  constructor() {
    super(SaveNoteDataSchema);
  }

  async run(
    data: SaveNoteData,
    deps: SaveNoteDeps,
    _context: ActionContext
  ): Promise<SaveNoteData & { note: NoteWithParsedLines }> {
    const note = await deps.createNote(data.file);
    return { ...data, note };
  }
}
