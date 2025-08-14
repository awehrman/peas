import { getNoteWithEvernoteMetadata } from "@peas/database";

import { CATEGORIZATION_CONSTANTS } from "../../../../config/constants";
import type { StructuredLogger } from "../../../../types";
import type { CategorizationJobData } from "../../../../workers/categorization/dependencies";

/**
 * Determine tags for a note based on Evernote metadata notebook
 */
export async function determineTags(
  data: CategorizationJobData,
  logger: StructuredLogger
): Promise<CategorizationJobData> {
  try {
    logger.log(
      `[DETERMINE_TAGS] Starting tag determination for note: ${data.noteId}`
    );
    logger.log(`[DETERMINE_TAGS] Job data: ${JSON.stringify(data, null, 2)}`);

    // Get the note with Evernote metadata
    const note = await getNoteWithEvernoteMetadata(data.noteId);

    if (!note) {
      logger.log(`[DETERMINE_TAGS] Note not found: ${data.noteId}`);
      return {
        ...data,
        metadata: {
          ...data.metadata,
          determinedTags: [],
          tagsDeterminedAt: new Date().toISOString(),
          tagDeterminationReason: "Note not found",
        },
      };
    }

    // Check if we have Evernote metadata with tags
    if (
      !note.evernoteMetadata?.tags ||
      note.evernoteMetadata.tags.length === 0
    ) {
      logger.log(
        `[DETERMINE_TAGS] No Evernote tags metadata found for note: ${data.noteId}`
      );
      return {
        ...data,
        metadata: {
          ...data.metadata,
          determinedTags: [],
          tagsDeterminedAt: new Date().toISOString(),
          tagDeterminationReason: "No Evernote tags metadata",
        },
      };
    }

    const evernoteTags = note.evernoteMetadata.tags;
    logger.log(
      `[DETERMINE_TAGS] Found Evernote tags: "${evernoteTags.join(", ")}" for note: ${data.noteId}`
    );

    // Look up each Evernote tag in our tag mapping
    const tagMapping = CATEGORIZATION_CONSTANTS.NOTEBOOK_TAG_MAPPING;
    const determinedTags = new Set<string>();

    for (const evernoteTag of evernoteTags) {
      const mappedTags = tagMapping[evernoteTag as keyof typeof tagMapping];
      if (mappedTags) {
        mappedTags.forEach((tag) => determinedTags.add(tag));
        logger.log(
          `[DETERMINE_TAGS] Mapped Evernote tag "${evernoteTag}" to tags: "${mappedTags.join(", ")}"`
        );
      } else {
        // If no mapping found, use the original tag
        determinedTags.add(evernoteTag);
        logger.log(
          `[DETERMINE_TAGS] No mapping found for Evernote tag "${evernoteTag}", using as-is`
        );
      }
    }

    const finalTags = Array.from(determinedTags);

    if (finalTags.length === 0) {
      logger.log(
        `[DETERMINE_TAGS] No tags determined for note: ${data.noteId}`
      );
      return {
        ...data,
        metadata: {
          ...data.metadata,
          determinedTags: [],
          tagsDeterminedAt: new Date().toISOString(),
          tagDeterminationReason:
            "No tags could be determined from Evernote tags",
        },
      };
    }

    logger.log(
      `[DETERMINE_TAGS] Final determined tags: "${finalTags.join(", ")}" for note: ${data.noteId}`
    );

    return {
      ...data,
      metadata: {
        ...data.metadata,
        determinedTags: finalTags,
        tagsDeterminedAt: new Date().toISOString(),
        tagDeterminationReason: `Based on Evernote tags: ${evernoteTags.join(", ")}`,
      },
    };
  } catch (error) {
    logger.log(
      `[DETERMINE_TAGS] Failed to determine tags for note ${data.noteId}: ${error}`
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
