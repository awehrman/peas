import type { StructuredLogger } from "../../../../types";
import type { IngredientJobData } from "../../../../workers/ingredient/dependencies";
import { scheduleCategorizationJob } from "../../../categorization/schedule-categorization";

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
    // Use the shared categorization scheduling service
    await scheduleCategorizationJob(
      data.noteId,
      data.importId || "", // Handle undefined importId
      logger,
      statusBroadcaster,
      data.jobId
    );

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
