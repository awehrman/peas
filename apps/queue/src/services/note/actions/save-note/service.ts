import type { StructuredLogger } from "../../../../types";
import type { NotePipelineData } from "../../../../types/notes";
import type { NoteWithParsedLines } from "../../../../types/notes";
import { initializeNoteCompletion } from "../track-completion/service";

export async function saveNote(
  data: NotePipelineData,
  logger: StructuredLogger
): Promise<NotePipelineData> {
  logger.log(`[SAVE_NOTE] Starting note creation`);

  // Validate that we have the required file data
  if (!data.file) {
    throw new Error("No parsed HTML file data available for note creation");
  }

  // Import the database service to create the note
  const db = await import("@peas/database");

  try {
    // Extract Evernote metadata from the file
    const source = data.file?.evernoteMetadata?.source;
    const tags = data.file?.evernoteMetadata?.tags || [];

    logger.log(
      `[SAVE_NOTE] Creating note with metadata - source: ${source || "none"}, tags: ${tags.length}`
    );

    // Create the note in the database with Evernote metadata
    const dbNote = await db.createNoteWithEvernoteMetadata(data.file);

    logger.log(
      `[SAVE_NOTE] Successfully created note with ID: ${dbNote.id}, title: "${dbNote.title}", evernoteMetadataId: ${dbNote.evernoteMetadataId || "none"}`
    );

    // Initialize completion tracking for this note
    if (data.importId) {
      initializeNoteCompletion(dbNote.id, data.importId);
      logger.log(
        `[SAVE_NOTE] Initialized completion tracking for note ${dbNote.id} with import ${data.importId}`
      );
    }

    // Transform the database result to match the expected NoteWithParsedLines interface
    const note: NoteWithParsedLines = {
      id: dbNote.id,
      title: dbNote.title,
      content: data.file.contents, // Use the original content
      html: data.file.contents, // Use the original HTML content
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createdAt: (dbNote as any).createdAt || new Date(), // Use the createdAt from database
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      updatedAt: (dbNote as any).updatedAt || new Date(), // Use the updatedAt from database or current time
      parsedIngredientLines: dbNote.parsedIngredientLines,
      parsedInstructionLines: dbNote.parsedInstructionLines,
    };

    // Return the updated pipeline data with the created note
    return {
      ...data,
      noteId: dbNote.id,
      note,
    };
  } catch (error) {
    logger.log(`[SAVE_NOTE] Failed to create note: ${error}`);
    throw error;
  }
}
