import { getNoteWithEvernoteMetadata } from "@peas/database";

import { CATEGORIZATION_CONSTANTS } from "../../../../config/constants";
import type { StructuredLogger } from "../../../../types";
import type { CategorizationJobData } from "../../../../workers/categorization/dependencies";

/**
 * Determine the category for a note based on Evernote metadata notebook
 */
export async function determineCategory(
  data: CategorizationJobData,
  logger: StructuredLogger
): Promise<CategorizationJobData> {
  try {
    logger.log(
      `[DETERMINE_CATEGORY] Starting category determination for note: ${data.noteId}`
    );

    // Get the note with Evernote metadata
    const note = await getNoteWithEvernoteMetadata(data.noteId);

    if (!note) {
      logger.log(`[DETERMINE_CATEGORY] Note not found: ${data.noteId}`);
      return {
        ...data,
        metadata: {
          ...data.metadata,
          determinedCategory: null,
          categoryDeterminedAt: new Date().toISOString(),
          categoryDeterminationReason: "Note not found",
        },
      };
    }

    // Check if we have Evernote metadata with a notebook
    // NOTE: if we're doing a file import we won't have any of this
    if (!note.evernoteMetadata?.notebook) {
      logger.log(
        `[DETERMINE_CATEGORY] No Evernote notebook metadata found for note: ${data.noteId}`
      );
      return {
        ...data,
        metadata: {
          ...data.metadata,
          determinedCategory: null,
          categoryDeterminedAt: new Date().toISOString(),
          categoryDeterminationReason: "No Evernote notebook metadata",
        },
      };
    }

    const notebook = note.evernoteMetadata.notebook;
    logger.log(
      `[DETERMINE_CATEGORY] Found Evernote notebook: "${notebook}" for note: ${data.noteId}`
    );

    // Look up the notebook in our mapping
    const categoryMapping = CATEGORIZATION_CONSTANTS.NOTEBOOK_CATEGORY_MAPPING;
    const determinedCategories =
      categoryMapping[notebook as keyof typeof categoryMapping];

    if (!determinedCategories) {
      logger.log(
        `[DETERMINE_CATEGORY] No category mapping found for notebook: "${notebook}" for note: ${data.noteId}`
      );
      return {
        ...data,
        metadata: {
          ...data.metadata,
          determinedCategory: null,
          categoryDeterminedAt: new Date().toISOString(),
          categoryDeterminationReason: `No mapping found for notebook: ${notebook}`,
        },
      };
    }

    logger.log(
      `[DETERMINE_CATEGORY] Determined categories "${determinedCategories.join(", ")}" for notebook "${notebook}" for note: ${data.noteId}`
    );

    // TODO we'll probably leave this fairly empty for now and let the user fill in details
    // until i come back with an ML model or a smarter idea here

    return {
      ...data,
      metadata: {
        ...data.metadata,
        determinedCategories,
        categoryDeterminedAt: new Date().toISOString(),
        categoryDeterminationReason: `Based on Evernote notebook: ${notebook}`,
      },
    };
  } catch (error) {
    logger.log(
      `[DETERMINE_CATEGORY] Failed to determine category for note ${data.noteId}: ${error}`
    );

    return {
      ...data,
      metadata: {
        ...data.metadata,
        error: error instanceof Error ? error.message : String(error),
        errorTimestamp: new Date().toISOString(),
      },
    };
  }
}
