import type { StructuredLogger } from "../../../../types";
import type { PatternRule } from "../../../../workers/shared/pattern-tracker";

export interface TrackPatternJobData {
  jobId: string;
  patternRules: PatternRule[];
  exampleLine?: string;
  noteId?: string;
  importId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Track a pattern in the database.
 * This service is designed to be queued separately to avoid race conditions
 * and improve performance of the main ingredient parsing pipeline.
 */
export async function trackPattern(
  data: TrackPatternJobData,
  logger: StructuredLogger
): Promise<TrackPatternJobData> {
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

    // Import the pattern tracker dynamically to avoid circular dependencies
    const { PatternTracker } = await import("../../../../workers/shared/pattern-tracker");
    const { prisma } = await import("@peas/database");

    // Create a pattern tracker instance
    const patternTracker = new PatternTracker(prisma, logger);

    // Track the pattern
    const patternId = await patternTracker.trackPattern(
      data.patternRules,
      data.exampleLine
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
