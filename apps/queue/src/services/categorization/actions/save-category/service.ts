import { saveCategoryToNote } from "@peas/database";

import type { StructuredLogger } from "../../../../types";
import type { CategorizationJobData } from "../../../../workers/categorization/dependencies";

/**
 * Save the determined categories to the database
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

    // Check for both old single category and new multiple categories
    const determinedCategory = data.metadata?.determinedCategory as string;
    const determinedCategories = data.metadata
      ?.determinedCategories as string[];

    if (!determinedCategory && !determinedCategories) {
      /* istanbul ignore next -- @preserve */
      logger.log(
        `[SAVE_CATEGORY] No categories to save for note: ${data.noteId}`
      );
      return data;
    }

    // Use the new multiple categories if available, otherwise fall back to single category
    /* istanbul ignore next -- @preserve */
    const categoriesToSave =
      determinedCategories || (determinedCategory ? [determinedCategory] : []);

    if (categoriesToSave.length === 0) {
      /* istanbul ignore next -- @preserve */
      logger.log(
        `[SAVE_CATEGORY] No categories to save for note: ${data.noteId}`
      );
      /* istanbul ignore next -- @preserve */
      return data;
    }

    const savedCategories = [];

    // Save each category to the database
    for (const categoryName of categoriesToSave) {
      const savedCategory = await saveCategoryToNote(data.noteId, categoryName);
      savedCategories.push(savedCategory);
    }

    /* istanbul ignore next -- @preserve */
    logger.log(
      `[SAVE_CATEGORY] Successfully saved ${savedCategories.length} categories for note: ${data.noteId}`
    );

    return {
      ...data,
      metadata: {
        ...data.metadata,
        categorySaved: true,
        categorySavedAt: new Date().toISOString(),
        savedCategoryIds: savedCategories.map((cat) => cat.id),
        savedCategoryNames: savedCategories.map((cat) => cat.name),
        categoriesCount: savedCategories.length,
      },
    };
  } catch (error) {
    /* istanbul ignore next -- @preserve */
    logger.log(
      `[SAVE_CATEGORY] Failed to save categories for note ${data.noteId}: ${error}`
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
