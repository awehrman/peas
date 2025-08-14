import type { StructuredLogger } from "../../types";
import { ActionName } from "../../types";
import { createCategorizationJobData } from "./types";

/**
 * Shared service for scheduling categorization jobs
 * This eliminates code duplication between different scheduling locations
 */
export async function scheduleCategorizationJob(
  noteId: string,
  importId: string,
  logger: StructuredLogger,
  statusBroadcaster?: {
    addStatusEventAndBroadcast: (
      event: Record<string, unknown>
    ) => Promise<Record<string, unknown>>;
  },
  originalJobId?: string
): Promise<void> {
  try {
    logger.log(
      `[SCHEDULE_CATEGORIZATION] Starting categorization scheduling for note: ${noteId}`
    );

    // Import queue dynamically to avoid circular dependencies
    const { createQueue } = await import("../../queues/create-queue");
    const categorizationQueue = createQueue("categorization");

    // Create categorization job data using the shared factory
    const categorizationJobData = createCategorizationJobData(
      noteId,
      importId,
      originalJobId
    );

    // Add the categorization job to the queue
    await categorizationQueue.add(
      ActionName.DETERMINE_CATEGORY,
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
      `[SCHEDULE_CATEGORIZATION] Successfully scheduled categorization for note: ${noteId}`
    );

    // Broadcast status if available
    if (statusBroadcaster) {
      await statusBroadcaster.addStatusEventAndBroadcast({
        importId,
        status: "PROCESSING",
        message: "Scheduling categorization...",
        context: "categorization_scheduling",
        noteId,
        indentLevel: 1,
      });
    }
  } catch (error) {
    logger.log(
      `[SCHEDULE_CATEGORIZATION] Failed to schedule categorization for note ${noteId}: ${error}`
    );
    throw error; // Re-throw to allow caller to handle
  }
}
