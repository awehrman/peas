import type { StructuredLogger } from "../../../../types";
import type { CategorizationJobData } from "../../../../workers/categorization/dependencies";
import { saveTagsToNote } from "@peas/database";

/**
 * Save the determined tags to the database
 */
export async function saveTags(
  data: CategorizationJobData,
  logger: StructuredLogger,
  _statusBroadcaster?: {
    addStatusEventAndBroadcast: (
      event: Record<string, unknown>
    ) => Promise<Record<string, unknown>>;
  }
): Promise<CategorizationJobData> {
  try {
    logger.log(`[SAVE_TAGS] Starting tag save for note: ${data.noteId}`);

    const determinedTags = data.metadata?.determinedTags as string[];

    if (!determinedTags || determinedTags.length === 0) {
      logger.log(`[SAVE_TAGS] No tags to save for note: ${data.noteId}`);
      return data;
    }

    // Save the tags to the database using the repository function
    const savedTags = await saveTagsToNote(data.noteId, determinedTags);

    logger.log(
      `[SAVE_TAGS] Successfully saved ${savedTags.length} tags for note: ${data.noteId}`
    );

    return {
      ...data,
      metadata: {
        ...data.metadata,
        tagsSaved: true,
        tagsSavedAt: new Date().toISOString(),
        savedTagIds: savedTags.map((tag: { id: string; name: string }) => tag.id),
        savedTagNames: savedTags.map((tag: { id: string; name: string }) => tag.name),
      },
    };
  } catch (error) {
    logger.log(
      `[SAVE_TAGS] Failed to save tags for note ${data.noteId}: ${error}`
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
