import type { StructuredLogger } from "../../../../types";
import type { PatternTrackingJobData } from "../../../../workers/pattern-tracking/dependencies";

export async function trackPattern(
  data: PatternTrackingJobData,
  logger: StructuredLogger
): Promise<PatternTrackingJobData> {
  try {
    if (!data.patternRules || data.patternRules.length === 0) {
      logger.log(
        `[TRACK_PATTERN] No pattern rules provided for job ${data.jobId}`
      );
      return data;
    }

    logger.log(
      `[TRACK_PATTERN] Starting pattern tracking for job ${data.jobId} with ${data.patternRules.length} rules`
    );

    const { PatternTracker } = await import(
      "../../../../workers/shared/pattern-tracker"
    );
    const { prisma } = await import("@peas/database");

    const patternTracker = new PatternTracker(prisma, logger);
    
    // Get the ingredient line ID from metadata
    const ingredientLineId = data.metadata?.ingredientLineId as
      | string
      | undefined;

    // Track pattern and link to ingredient line in a single transaction
    const patternId = await patternTracker.trackPattern(
      data.patternRules,
      data.exampleLine,
      ingredientLineId
    );

    logger.log(
      `[TRACK_PATTERN] Successfully tracked pattern ${patternId} for job ${data.jobId}`
    );

    return {
      ...data,
      metadata: {
        ...data.metadata,
        patternId,
        trackedAt: new Date().toISOString(),
        linkedToIngredientLine: !!ingredientLineId,
      },
    };
  } catch (error) {
    logger.log(
      `[TRACK_PATTERN] Failed to track pattern for job ${data.jobId}: ${error}`
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
