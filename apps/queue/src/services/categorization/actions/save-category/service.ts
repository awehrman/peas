import { saveCategoryToNote } from "@peas/database";

import type { StructuredLogger } from "../../../../types";
import type { CategorizationJobData } from "../../../../workers/categorization/dependencies";

/**
 * Save the determined category to the database
 */
export async function saveCategory(
  data: CategorizationJobData,
  logger: StructuredLogger,
  _statusBroadcaster?: {
    addStatusEventAndBroadcast: (
      event: Record<string, unknown>
    ) => Promise<Record<string, unknown>>;
  }
): Promise<CategorizationJobData> {
  try {
    logger.log(
      `[SAVE_CATEGORY] Starting category save for note: ${data.noteId}`
    );

    const determinedCategory = data.metadata?.determinedCategory as string;

    if (!determinedCategory) {
      logger.log(
        `[SAVE_CATEGORY] No category to save for note: ${data.noteId}`
      );
      return data;
    }

    // Save the category to the database using the repository function
    const savedCategory = await saveCategoryToNote(
      data.noteId,
      determinedCategory
    );

    logger.log(
      `[SAVE_CATEGORY] Successfully saved category "${savedCategory.name}" (ID: ${savedCategory.id}) for note: ${data.noteId}`
    );

    return {
      ...data,
      metadata: {
        ...data.metadata,
        categorySaved: true,
        categorySavedAt: new Date().toISOString(),
        savedCategoryId: savedCategory.id,
        savedCategoryName: savedCategory.name,
      },
    };
  } catch (error) {
    logger.log(
      `[SAVE_CATEGORY] Failed to save category for note ${data.noteId}: ${error}`
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
