import type { StructuredLogger } from "../../../../types";
import type { IngredientJobData } from "../../../../workers/ingredient/dependencies";

/**
 * Schedule categorization processing after all ingredients are completed
 */
export async function scheduleCategorization(
  data: IngredientJobData,
  logger: StructuredLogger,
  statusBroadcaster?: {
    addStatusEventAndBroadcast: (
      event: Record<string, unknown>
    ) => Promise<Record<string, unknown>>;
  }
): Promise<IngredientJobData> {
  try {
    logger.log(
      `[SCHEDULE_CATEGORIZATION] Starting categorization scheduling for note: ${data.noteId}`
    );

    // Import queue dynamically to avoid circular dependencies
    const { createQueue } = await import("../../../../queues/create-queue");
    const categorizationQueue = createQueue("categorization");

    // Create categorization job data
    const categorizationJobData = {
      noteId: data.noteId,
      importId: data.importId,
      jobId: `categorization-${data.noteId}-${Date.now()}`,
      metadata: {
        originalJobId: data.jobId,
        triggeredBy: "ingredient_completion",
      },
    };

    // Add the categorization job to the queue
    await categorizationQueue.add(
      "determine-category",
      categorizationJobData,
      {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
      }
    );

    logger.log(
      `[SCHEDULE_CATEGORIZATION] Successfully scheduled categorization for note: ${data.noteId}`
    );

    // Broadcast status if available
    if (statusBroadcaster) {
      await statusBroadcaster.addStatusEventAndBroadcast({
        importId: data.importId,
        status: "PROCESSING",
        message: "Scheduling categorization...",
        context: "categorization_scheduling",
        noteId: data.noteId,
        indentLevel: 1,
      });
    }

    return data;
  } catch (error) {
    logger.log(
      `[SCHEDULE_CATEGORIZATION] Failed to schedule categorization for note ${data.noteId}: ${error}`
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
