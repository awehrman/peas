import {
  connectNoteToSource,
  createOrFindSourceWithBook,
  createOrFindSourceWithUrl,
  getNoteWithEvernoteMetadata,
  isValidUrl,
  upsertEvernoteMetadataSource,
} from "@peas/database";

import type { StructuredLogger } from "../../../../types";
import type { NotePipelineData } from "../../../../types/notes";

export async function processSource(
  data: NotePipelineData,
  logger: StructuredLogger
): Promise<NotePipelineData> {
  logger.log(
    `[PROCESS_SOURCE] Starting source processing for note: ${data.noteId}`
  );

  // Validate that we have a note ID
  if (!data.noteId) {
    throw new Error("No note ID available for source processing");
  }

  try {
    // Get the note with its parsed file data
    const note = await getNoteWithEvernoteMetadata(data.noteId);

    if (!note) {
      throw new Error(`Note with ID ${data.noteId} not found`);
    }

    // Extract source information from the parsed file
    const sourceUrl = data.file?.source;

    if (!sourceUrl) {
      logger.log(
        `[PROCESS_SOURCE] No source URL found for note: ${data.noteId}`
      );
      return data;
    }

    logger.log(
      `[PROCESS_SOURCE] Processing source URL: ${sourceUrl} for note: ${data.noteId}`
    );

    // Determine if this is a URL or book reference
    const isUrl = isValidUrl(sourceUrl);

    let sourceId: string;

    if (isUrl) {
      // Create or find existing source with URL
      sourceId = await createOrFindSourceWithUrl(sourceUrl);
    } else {
      // Treat as book reference
      sourceId = await createOrFindSourceWithBook(sourceUrl);
    }

    // Upsert the note's EvernoteMetadata with the source
    if (note.evernoteMetadataId) {
      await upsertEvernoteMetadataSource(note.evernoteMetadataId, sourceUrl);
    }

    // Connect the note to the source
    await connectNoteToSource(data.noteId, sourceId);

    logger.log(
      `[PROCESS_SOURCE] Successfully processed source for note: ${data.noteId}, source ID: ${sourceId}`
    );

    return data;
  } catch (error) {
    logger.log(`[PROCESS_SOURCE] Failed to process source: ${error}`);
    throw error;
  }
}
