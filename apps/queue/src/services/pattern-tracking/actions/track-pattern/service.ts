import type { PrismaClient } from "@peas/database";

import { LogLevel } from "../../../../types";
import type { StructuredLogger } from "../../../../types";
import type { PatternTrackingJobData } from "../../../../workers/pattern-tracking/dependencies";

export type { PatternTrackingJobData as TrackPatternJobData };

/**
 * Represents a single pattern rule.
 */
export interface PatternRule {
  ruleId: string;
  ruleNumber: number;
}

/**
 * Track a pattern and save/update it in the database.
 * @param rules - Array of pattern rules
 * @param exampleLine - Optional example line
 * @param ingredientLineId - Optional ingredient line ID to link to the pattern
 * @param prisma - Prisma client instance
 * @param logger - Logger instance
 * @returns The pattern ID
 */
async function trackPatternInDatabase(
  rules: PatternRule[],
  exampleLine: string | undefined,
  ingredientLineId: string | undefined,
  prisma: PrismaClient,
  logger: StructuredLogger
): Promise<string> {
  const maxRetries = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const ruleIds = rules.map((rule) => rule.ruleId);

      logger.log(
        `[PATTERN_TRACKER] Tracking pattern with ${rules.length} rules`,
        LogLevel.DEBUG
      );

      return await prisma.$transaction(async (tx) => {
        // Use upsert to either create a new pattern or update an existing one
        const pattern = await tx.uniqueLinePattern.upsert({
          where: {
            ruleIds: ruleIds,
          },
          update: {
            occurrenceCount: { increment: 1 },
            // Update example line if provided
            ...(exampleLine ? { exampleLine } : {}),
          },
          create: {
            ruleIds,
            exampleLine,
            occurrenceCount: 1,
          },
        });

        const patternId = pattern.id;
        logger.log(
          `[PATTERN_TRACKER] Upserted pattern: ${pattern.id} (count: ${pattern.occurrenceCount})`,
          LogLevel.DEBUG
        );

        // Link the pattern to the ingredient line within the same transaction
        if (ingredientLineId && patternId) {
          try {
            await tx.parsedIngredientLine.update({
              where: { id: ingredientLineId },
              data: { uniqueLinePatternId: patternId },
            });

            logger.log(
              `[PATTERN_TRACKER] Successfully linked pattern ${patternId} to ingredient line ${ingredientLineId} within transaction`,
              LogLevel.DEBUG
            );
          } catch (linkError) {
            logger.log(
              `[PATTERN_TRACKER] Failed to link pattern ${patternId} to ingredient line ${ingredientLineId}: ${linkError}`,
              LogLevel.ERROR
            );
            // Don't fail the entire transaction if linking fails
          }
        }

        return patternId;
      });
    } catch (error) {
      lastError = error;

      logger.log(
        `[PATTERN_TRACKER] Error tracking pattern (attempt ${attempt}/${maxRetries}): ${error}`,
        LogLevel.ERROR
      );

      // If this is the last attempt, throw the error
      /* istanbul ignore next -- @preserve */
      if (attempt === maxRetries) {
        /* istanbul ignore next -- @preserve */
        throw error;
      }

      // Check if this is a unique constraint violation (race condition)
      // PrismaClientKnownRequestError with code P2002 indicates unique constraint violation
      if (
        error &&
        typeof error === "object" &&
        "name" in error &&
        error.name === "PrismaClientKnownRequestError" &&
        "code" in error &&
        error.code === "P2002"
      ) {
        logger.log(
          `[PATTERN_TRACKER] Unique constraint violation detected (${error.name}, code: ${error.code}), retrying (attempt ${attempt}/${maxRetries})`,
          LogLevel.DEBUG
        );
        // Wait a bit before retrying to allow the other transaction to complete
        await new Promise((resolve) => setTimeout(resolve, 50 * attempt));
        continue;
      }

      // If it's a transaction abort error, wait a bit before retrying
      if (
        error &&
        typeof error === "object" &&
        "message" in error &&
        typeof error.message === "string" &&
        error.message.includes("current transaction is aborted")
      ) {
        logger.log(
          `[PATTERN_TRACKER] Transaction abort detected, retrying (attempt ${attempt}/${maxRetries})`,
          LogLevel.DEBUG
        );
        await new Promise((resolve) => setTimeout(resolve, 100 * attempt)); // Exponential backoff
        continue;
      }

      // Log other error types for debugging
      /* istanbul ignore next -- @preserve */
      logger.log(
        `[PATTERN_TRACKER] Non-retryable error type: ${error && typeof error === "object" && "name" in error ? error.name : "unknown"}, code: ${error && typeof error === "object" && "code" in error ? error.code : "unknown"}`,
        LogLevel.DEBUG
      );

      // For other errors, don't retry
      throw error;
    }
  }

  // This should never be reached, but TypeScript requires it
  /* istanbul ignore next -- @preserve */
  throw lastError;
}

/**
 * Track a pattern in the database.
 * This service is designed to be queued separately to avoid race conditions
 * and improve performance of the main ingredient parsing pipeline.
 */
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

    // Import prisma dynamically to avoid circular dependencies
    const { prisma } = await import("@peas/database");

    // Get the ingredient line ID from metadata
    const ingredientLineId = data.metadata?.ingredientLineId as
      | string
      | undefined;

    // Track pattern and link to ingredient line in a single transaction
    const patternId = await trackPatternInDatabase(
      data.patternRules,
      data.exampleLine,
      ingredientLineId,
      prisma,
      logger
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
