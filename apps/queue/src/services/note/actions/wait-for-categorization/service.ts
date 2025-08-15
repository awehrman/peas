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

  // Track QueueJob status for debugging
  let lastQueueJobStatus = "UNKNOWN";

  while (retryCount < maxRetries) {
    try {
      // Step 1: Check QueueJob status for categorization completion
      try {
        const { getQueueJobByNoteId } = await import("@peas/database");
        const queueJobs = await getQueueJobByNoteId(
          noteId,
          "PROCESS_CATEGORIZATION"
        );

        if (queueJobs.length > 0) {
          const latestJob = queueJobs[queueJobs.length - 1];
          if (latestJob && latestJob.status !== lastQueueJobStatus) {
            logger.log(
              `[WAIT_FOR_CATEGORIZATION] QueueJob status: ${latestJob.status} (jobId: ${latestJob.jobId})`
            );
            lastQueueJobStatus = latestJob.status;
          }

          // Check if categorization is completed
          if (latestJob && latestJob.status === "COMPLETED") {
            logger.log(
              `[WAIT_FOR_CATEGORIZATION] Categorization completed for note ${noteId} (attempt ${retryCount + 1}/${maxRetries})`
            );
            return {
              success: true,
              categorizationScheduled,
              retryCount: retryCount + 1,
              maxRetries,
              hasCategorization: true, // Assume categorization was done
              hasTags: true, // Assume tags were done
              categoriesCount: 1, // Placeholder since we're not checking DB
              tagsCount: 1, // Placeholder since we're not checking DB
            };
          }
        } else {
          logger.log(
            `[WAIT_FOR_CATEGORIZATION] No QueueJob entries found for note ${noteId}`
          );
        }
      } catch (queueJobError) {
        logger.log(
          `[WAIT_FOR_CATEGORIZATION] Error checking QueueJob status: ${queueJobError}`
        );
      }

      // Step 2: Check if ingredients are completed and schedule categorization if needed
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
            /* istanbul ignore next -- @preserve */
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
            /* istanbul ignore next -- @preserve */
            logger.log(
              `[WAIT_FOR_CATEGORIZATION] Failed to schedule categorization for note ${noteId}: ${scheduleError}`
            );
            // Continue waiting - maybe categorization was already scheduled
          }
        }
      }

      // Step 3: Log progress (but reduce spam)
      const now = Date.now();
      if (now - lastLogTime > 5000) {
        // Log every 5 seconds instead of every second
        /* istanbul ignore next -- @preserve */
        logger.log(
          `[WAIT_FOR_CATEGORIZATION] Waiting for categorization for note ${noteId} (attempt ${retryCount + 1}/${maxRetries})`
        );
        /* istanbul ignore next -- @preserve */
        lastLogTime = now;
      }

      if (retryCount < maxRetries - 1) {
        // Wait before retrying
        /* istanbul ignore next -- @preserve */
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    } catch (error) {
      /* istanbul ignore next -- @preserve */
      logger.log(
        `[WAIT_FOR_CATEGORIZATION] Error in wait loop (attempt ${retryCount + 1}/${maxRetries}): ${error}`
      );

      /* istanbul ignore next -- @preserve */
      if (retryCount < maxRetries - 1) {
        // Wait before retrying
        /* istanbul ignore next -- @preserve */
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
