import type { PrismaClient } from "@peas/database";

import { LogLevel } from "../../types";
import type { BaseWorkerDependencies } from "../core/types";

/**
 * Represents a single pattern rule.
 */
export interface PatternRule {
  ruleId: string;
  ruleNumber: number;
}

/**
 * Data for a tracked pattern.
 */
export interface PatternData {
  patternCode: string;
  ruleSequence: PatternRule[];
  exampleLine?: string;
}

/**
 * PatternTracker provides utilities for tracking and retrieving unique line patterns in the database.
 */
export class PatternTracker {
  constructor(
    private prisma: PrismaClient,
    private logger?: BaseWorkerDependencies["logger"]
  ) {}

  /**
   * Generate a pattern code from rule sequence.
   * @param rules - Array of pattern rules
   * @returns Pattern code string
   */
  private generatePatternCode(rules: PatternRule[]): string {
    return rules.map((rule) => `${rule.ruleNumber}:${rule.ruleId}`).join("_");
  }

  /**
   * Track a pattern and save/update it in the database.
   * @param rules - Array of pattern rules
   * @param exampleLine - Optional example line
   * @returns The pattern ID
   */
  async trackPattern(
    rules: PatternRule[],
    exampleLine?: string
  ): Promise<string> {
    const maxRetries = 3;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const ruleIds = rules.map((rule) => rule.ruleId);

        this.logger?.log(
          `[PATTERN_TRACKER] Tracking pattern with ${rules.length} rules`,
          LogLevel.DEBUG
        );

        return await this.prisma.$transaction(async (tx) => {
          // Try to find existing pattern by ruleIds array
          const existingPattern = await tx.uniqueLinePattern.findFirst({
            where: {
              ruleIds: {
                equals: ruleIds,
              },
            },
          });

          if (existingPattern) {
            // Update existing pattern
            await tx.uniqueLinePattern.update({
              where: { id: existingPattern.id },
              data: {
                occurrenceCount: { increment: 1 },
                // Update example line if provided and different
                ...(exampleLine && exampleLine !== existingPattern.exampleLine
                  ? { exampleLine }
                  : {}),
              },
            });

            this.logger?.log(
              `[PATTERN_TRACKER] Updated existing pattern: ${existingPattern.id} (count: ${existingPattern.occurrenceCount + 1})`,
              LogLevel.DEBUG
            );
            return existingPattern.id;
          } else {
            // Create new pattern
            try {
              const newPattern = await tx.uniqueLinePattern.create({
                data: {
                  ruleIds,
                  exampleLine,
                  occurrenceCount: 1,
                },
              });

              this.logger?.log(
                `[PATTERN_TRACKER] Created new pattern: ${newPattern.id}`,
                LogLevel.DEBUG
              );
              return newPattern.id;
            } catch (error) {
              // Handle race condition where another process created the pattern
              if (
                error &&
                typeof error === "object" &&
                "code" in error &&
                error.code === "P2002"
              ) {
                // Unique constraint violation - pattern was created by another process
                // Try to find it again
                const createdPattern = await tx.uniqueLinePattern.findFirst({
                  where: {
                    ruleIds: {
                      equals: ruleIds,
                    },
                  },
                });

                if (createdPattern) {
                  // Update the occurrence count since we found it
                  await tx.uniqueLinePattern.update({
                    where: { id: createdPattern.id },
                    data: {
                      occurrenceCount: { increment: 1 },
                      ...(exampleLine &&
                      exampleLine !== createdPattern.exampleLine
                        ? { exampleLine }
                        : {}),
                    },
                  });

                  this.logger?.log(
                    `[PATTERN_TRACKER] Found and updated pattern created by another process: ${createdPattern.id}`,
                    LogLevel.DEBUG
                  );
                  return createdPattern.id;
                }
              }

              // Re-throw if it's not a unique constraint violation or if we still can't find the pattern
              throw error;
            }
          }
        });
      } catch (error) {
        lastError = error;

        this.logger?.log(
          `[PATTERN_TRACKER] Error tracking pattern (attempt ${attempt}/${maxRetries}): ${error}`,
          LogLevel.ERROR
        );

        // If this is the last attempt, throw the error
        if (attempt === maxRetries) {
          throw error;
        }

        // If it's a transaction abort error, wait a bit before retrying
        if (
          error &&
          typeof error === "object" &&
          "message" in error &&
          typeof error.message === "string" &&
          error.message.includes("current transaction is aborted")
        ) {
          await new Promise((resolve) => setTimeout(resolve, 100 * attempt)); // Exponential backoff
          continue;
        }

        // For other errors, don't retry
        throw error;
      }
    }

    // This should never be reached, but TypeScript requires it
    throw lastError;
  }

  /**
   * Get all patterns ordered by occurrence count.
   * @returns Array of pattern data
   */
  async getPatterns(): Promise<PatternData[]> {
    try {
      const patterns = await this.prisma.uniqueLinePattern.findMany({
        orderBy: { occurrenceCount: "desc" },
      });

      return patterns.map((pattern) => ({
        patternCode: pattern.id, // Use the ID as pattern code
        ruleSequence: pattern.ruleIds.map((ruleId, index) => ({
          ruleId,
          ruleNumber: index + 1,
        })),
        exampleLine: pattern.exampleLine || undefined,
      }));
    } catch (error) {
      this.logger?.log(
        `[PATTERN_TRACKER] Error getting patterns: ${error}`,
        LogLevel.ERROR
      );
      throw error;
    }
  }
}
