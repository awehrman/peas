import type { StructuredLogger } from "../../../../types";

export interface WaitForCategorizationResult {
  success: boolean;
  categorizationScheduled: boolean;
  retryCount: number;
  maxRetries: number;
  hasCategorization: boolean;
  hasTags: boolean;
  categoriesCount: number;
  tagsCount: number;
}

/**
 * Wait for categorization to complete for a note
 * @param noteId - The note ID to wait for
 * @param importId - The import ID
 * @param logger - Logger instance
 * @param statusBroadcaster - Optional status broadcaster
 * @returns Promise<WaitForCategorizationResult>
 */
export async function waitForCategorization(
  noteId: string,
  importId: string,
  logger: StructuredLogger,
  statusBroadcaster?: {
    addStatusEventAndBroadcast: (
      event: Record<string, unknown>
    ) => Promise<Record<string, unknown>>;
  }
): Promise<WaitForCategorizationResult> {
  if (!noteId) {
    logger.log(`[WAIT_FOR_CATEGORIZATION] No noteId available, skipping wait`);
    return {
      success: false,
      categorizationScheduled: false,
      retryCount: 0,
      maxRetries: 30,
      hasCategorization: false,
      hasTags: false,
      categoriesCount: 0,
      tagsCount: 0,
    };
  }

  logger.log(
    `[WAIT_FOR_CATEGORIZATION] Waiting for categorization to complete for note: ${noteId}`
  );

  // Track state
  let categorizationScheduled = false;
  let retryCount = 0;
  const maxRetries = 30; // 30 seconds total
  const retryDelay = 1000; // 1 second between checks
  let lastLogTime = 0; // For reducing log spam

  while (retryCount < maxRetries) {
    try {
      // Step 1: Check if ingredients are completed and schedule categorization if needed
      if (!categorizationScheduled) {
        const { getIngredientCompletionStatus } = await import(
          "../track-completion/service"
        );
        const ingredientStatus = getIngredientCompletionStatus(noteId);

        if (ingredientStatus.isComplete) {
          logger.log(
            `[WAIT_FOR_CATEGORIZATION] Ingredients completed for note ${noteId}, scheduling categorization`
          );

          try {
            // Schedule categorization
            const { scheduleCategorizationJob } = await import(
              "../../../categorization/schedule-categorization"
            );
            await scheduleCategorizationJob(
              noteId,
              importId || "",
              logger,
              statusBroadcaster,
              `${noteId}-categorization-from-note-worker`
            );

            categorizationScheduled = true;
            logger.log(
              `[WAIT_FOR_CATEGORIZATION] Successfully scheduled categorization for note ${noteId}`
            );
          } catch (scheduleError) {
            logger.log(
              `[WAIT_FOR_CATEGORIZATION] Failed to schedule categorization for note ${noteId}: ${scheduleError}`
            );
            // Continue waiting - maybe categorization was already scheduled
          }
        }
      }

      // Step 2: Only check for categorization if we've scheduled it
      if (categorizationScheduled) {
        // Use separate queries but only if we've scheduled categorization
        const { getNoteCategories, getNoteTags } = await import(
          "@peas/database"
        );

        try {
          const [categories, tags] = await Promise.all([
            getNoteCategories(noteId),
            getNoteTags(noteId),
          ]);

          const hasCategorization = categories.length > 0;
          const hasTags = tags.length > 0;

          if (hasCategorization || hasTags) {
            logger.log(
              `[WAIT_FOR_CATEGORIZATION] Categorization completed for note ${noteId} (attempt ${retryCount + 1}/${maxRetries}) - Categories: ${categories.length}, Tags: ${tags.length}`
            );
            return {
              success: true,
              categorizationScheduled,
              retryCount: retryCount + 1,
              maxRetries,
              hasCategorization,
              hasTags,
              categoriesCount: categories.length,
              tagsCount: tags.length,
            };
          }
        } catch (dbError) {
          /* istanbul ignore next -- @preserve */
          logger.log(
            `[WAIT_FOR_CATEGORIZATION] Error checking categorization status: ${dbError}`
          );
          // Set categorizationScheduled to false on database error to prevent infinite loop
          categorizationScheduled = false;
        }
      }

      // Step 3: Log progress (but reduce spam)
      const now = Date.now();
      if (now - lastLogTime > 5000) {
        // Log every 5 seconds instead of every second
        logger.log(
          `[WAIT_FOR_CATEGORIZATION] Waiting for categorization for note ${noteId} (attempt ${retryCount + 1}/${maxRetries})`
        );
        lastLogTime = now;
      }

      if (retryCount < maxRetries - 1) {
        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    } catch (error) {
      logger.log(
        `[WAIT_FOR_CATEGORIZATION] Error in wait loop (attempt ${retryCount + 1}/${maxRetries}): ${error}`
      );

      if (retryCount < maxRetries - 1) {
        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }

    retryCount++;
  }

  // If we've exhausted all retries, log a warning but continue
  logger.log(
    `[WAIT_FOR_CATEGORIZATION] Timeout waiting for categorization for note ${noteId}. Continuing anyway.`
  );

  return {
    success: false,
    categorizationScheduled,
    retryCount,
    maxRetries,
    hasCategorization: false,
    hasTags: false,
    categoriesCount: 0,
    tagsCount: 0,
  };
}
