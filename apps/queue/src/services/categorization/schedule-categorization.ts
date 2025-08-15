import { createCategorizationJobData } from "./types";

import type { StructuredLogger } from "../../types";
import { ActionName } from "../../types";

/**
 * Create a QueueJob entry for tracking categorization jobs
 */
async function createCategorizationQueueJob(
  noteId: string,
  jobId: string,
  logger: StructuredLogger
): Promise<void> {
  try {
    const { createQueueJob } = await import("@peas/database");
    
    await createQueueJob({
      jobId,
      type: "PROCESS_CATEGORIZATION",
      status: "PENDING",
      noteId,
      data: {
        noteId,
        scheduledAt: new Date().toISOString(),
      },
    });
    
    logger.log(
      `[SCHEDULE_CATEGORIZATION] Created QueueJob entry for categorization: ${jobId}`
    );
  } catch (error) {
    logger.log(
      `[SCHEDULE_CATEGORIZATION] Failed to create QueueJob entry: ${error}`
    );
    // Don't throw - QueueJob tracking is optional for debugging
  }
}

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
    logger.log(
      `[SCHEDULE_CATEGORIZATION] Parameters: noteId=${noteId}, importId=${importId}, originalJobId=${originalJobId}`
    );

    // Import queue dynamically to avoid circular dependencies
    const { createQueue } = await import("../../queues/create-queue");
    const categorizationQueue = createQueue("categorization");

    logger.log(
      `[SCHEDULE_CATEGORIZATION] Created categorization queue: ${categorizationQueue.name}`
    );

    // Create categorization job data using the shared factory
    const categorizationJobData = createCategorizationJobData(
      noteId,
      importId,
      originalJobId
    );

    logger.log(
      `[SCHEDULE_CATEGORIZATION] Created job data: ${JSON.stringify(categorizationJobData, null, 2)}`
    );

    // Add the categorization job to the queue
    const job = await categorizationQueue.add(
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
      `[SCHEDULE_CATEGORIZATION] Added job to queue with ID: ${job.id}`
    );

    // Create QueueJob entry for tracking
    if (job.id) {
      await createCategorizationQueueJob(noteId, job.id, logger);
    } else {
      logger.log(
        `[SCHEDULE_CATEGORIZATION] Warning: Job ID is undefined, skipping QueueJob creation`
      );
    }

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
