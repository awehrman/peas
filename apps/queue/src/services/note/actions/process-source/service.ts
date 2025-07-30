import {
  createOrFindSourceWithBook,
  createOrFindSourceWithUrl,
  isValidUrl,
} from "./helpers";

import { prisma } from "@peas/database";

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
    const note = await prisma.note.findUnique({
      where: { id: data.noteId },
      include: {
        evernoteMetadata: true,
      },
    });

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
      sourceId = await createOrFindSourceWithUrl(sourceUrl, logger);
    } else {
      // Treat as book reference
      sourceId = await createOrFindSourceWithBook(sourceUrl, logger);
    }

    // Update the note's EvernoteMetadata with the source
    await prisma.evernoteMetadata.update({
      where: { id: note.evernoteMetadataId! },
      data: { source: sourceUrl },
    });

    // Connect the note to the source
    await prisma.note.update({
      where: { id: data.noteId },
      data: {
        sources: {
          connect: { id: sourceId },
        },
      },
    });

    logger.log(
      `[PROCESS_SOURCE] Successfully processed source for note: ${data.noteId}, source ID: ${sourceId}`
    );

    return data;
  } catch (error) {
    logger.log(`[PROCESS_SOURCE] Failed to process source: ${error}`);
    throw error;
  }
}
