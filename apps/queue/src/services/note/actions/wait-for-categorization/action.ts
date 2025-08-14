import { ActionName } from "../../../../types";
import type {
  NotePipelineData,
  NoteWorkerDependencies,
} from "../../../../types/notes";
import { BaseAction } from "../../../../workers/core/base-action";
import type { ActionContext } from "../../../../workers/core/types";

export class WaitForCategorizationAction extends BaseAction<
  NotePipelineData,
  NoteWorkerDependencies,
  NotePipelineData
> {
  get name(): ActionName {
    return ActionName.WAIT_FOR_CATEGORIZATION;
  }

  async execute(
    data: NotePipelineData,
    deps: NoteWorkerDependencies,
    _context: ActionContext
  ): Promise<NotePipelineData> {
    if (!data.noteId) {
      deps.logger.log(
        `[WAIT_FOR_CATEGORIZATION] No noteId available, skipping wait`
      );
      return data;
    }

    deps.logger.log(
      `[WAIT_FOR_CATEGORIZATION] Waiting for categorization to complete for note: ${data.noteId}`
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
          const ingredientStatus = getIngredientCompletionStatus(data.noteId);

          if (ingredientStatus.isComplete) {
            deps.logger.log(
              `[WAIT_FOR_CATEGORIZATION] Ingredients completed for note ${data.noteId}, scheduling categorization`
            );

            try {
              // Schedule categorization
              const { scheduleCategorizationJob } = await import(
                "../../../categorization/schedule-categorization"
              );
              await scheduleCategorizationJob(
                data.noteId,
                data.importId || "",
                deps.logger,
                deps.statusBroadcaster,
                `${data.noteId}-categorization-from-note-worker`
              );

              categorizationScheduled = true;
              deps.logger.log(
                `[WAIT_FOR_CATEGORIZATION] Successfully scheduled categorization for note ${data.noteId}`
              );
            } catch (scheduleError) {
              deps.logger.log(
                `[WAIT_FOR_CATEGORIZATION] Failed to schedule categorization for note ${data.noteId}: ${scheduleError}`
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
              getNoteCategories(data.noteId),
              getNoteTags(data.noteId),
            ]);

            const hasCategorization = categories.length > 0;
            const hasTags = tags.length > 0;

            if (hasCategorization || hasTags) {
              deps.logger.log(
                `[WAIT_FOR_CATEGORIZATION] Categorization completed for note ${data.noteId} (attempt ${retryCount + 1}/${maxRetries}) - Categories: ${categories.length}, Tags: ${tags.length}`
              );
              return data;
            }
          } catch (dbError) {
            deps.logger.log(
              `[WAIT_FOR_CATEGORIZATION] Error checking categorization status: ${dbError}`
            );
          }
        }

        // Step 3: Log progress (but reduce spam)
        const now = Date.now();
        if (now - lastLogTime > 5000) {
          // Log every 5 seconds instead of every second
          deps.logger.log(
            `[WAIT_FOR_CATEGORIZATION] Waiting for categorization for note ${data.noteId} (attempt ${retryCount + 1}/${maxRetries})`
          );
          lastLogTime = now;
        }

        if (retryCount < maxRetries - 1) {
          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
      } catch (error) {
        deps.logger.log(
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
    deps.logger.log(
      `[WAIT_FOR_CATEGORIZATION] Timeout waiting for categorization for note ${data.noteId}. Continuing anyway.`
    );

    return data;
  }
}
