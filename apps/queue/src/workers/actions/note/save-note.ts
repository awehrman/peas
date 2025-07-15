import { BaseAction } from "../core/base-action";
import { ActionContext } from "../core/types";
import { SaveNoteData, SaveNoteDeps, NoteWithParsedLines } from "./types";
import { NoteValidation } from "./validation";

export class SaveNoteAction extends BaseAction<SaveNoteData, SaveNoteDeps> {
  name = "save_note";

  async execute(
    data: SaveNoteData,
    deps: SaveNoteDeps,
    _context: ActionContext
  ): Promise<SaveNoteData & { note: NoteWithParsedLines }> {
    // Validate input
    const validationError = NoteValidation.validateSaveNoteData(data);
    if (validationError) {
      throw validationError;
    }

    // Save the note using the injected dependency
    const note = await deps.createNote(data.file);
    return { ...data, note };
  }
}
