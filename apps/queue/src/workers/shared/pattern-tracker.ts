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
   * @param ingredientLineId - Optional ingredient line ID to link to the pattern
   * @returns The pattern ID
   */
  async trackPattern(
    rules: PatternRule[],
    exampleLine?: string,
    ingredientLineId?: string
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
          this.logger?.log(
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

              this.logger?.log(
                `[PATTERN_TRACKER] Successfully linked pattern ${patternId} to ingredient line ${ingredientLineId} within transaction`,
                LogLevel.DEBUG
              );
            } catch (linkError) {
              this.logger?.log(
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

        this.logger?.log(
          `[PATTERN_TRACKER] Error tracking pattern (attempt ${attempt}/${maxRetries}): ${error}`,
          LogLevel.ERROR
        );

        // If this is the last attempt, throw the error
        if (attempt === maxRetries) {
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
          this.logger?.log(
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
          this.logger?.log(
            `[PATTERN_TRACKER] Transaction abort detected, retrying (attempt ${attempt}/${maxRetries})`,
            LogLevel.DEBUG
          );
          await new Promise((resolve) => setTimeout(resolve, 100 * attempt)); // Exponential backoff
          continue;
        }

        // Log other error types for debugging
        this.logger?.log(
          `[PATTERN_TRACKER] Non-retryable error type: ${error && typeof error === "object" && "name" in error ? error.name : "unknown"}, code: ${error && typeof error === "object" && "code" in error ? error.code : "unknown"}`,
          LogLevel.DEBUG
        );

        // For other errors, don't retry
        throw error;
      }
    }

    // This should never be reached, but TypeScript requires it
    throw lastError;
  }

  /**
   * Link a pattern to an ingredient line.
   * @param patternId - The pattern ID to link
   * @param ingredientLineId - The ingredient line ID to link to
   * @returns Success status
   */
  async linkPatternToIngredientLine(
    patternId: string,
    ingredientLineId: string
  ): Promise<boolean> {
    try {
      await this.prisma.parsedIngredientLine.update({
        where: { id: ingredientLineId },
        data: { uniqueLinePatternId: patternId },
      });

      this.logger?.log(
        `[PATTERN_TRACKER] Successfully linked pattern ${patternId} to ingredient line ${ingredientLineId}`,
        LogLevel.DEBUG
      );
      return true;
    } catch (error) {
      this.logger?.log(
        `[PATTERN_TRACKER] Failed to link pattern ${patternId} to ingredient line ${ingredientLineId}: ${error}`,
        LogLevel.ERROR
      );
      return false;
    }
  }

  /**
   * Get ingredient lines that use a specific pattern.
   * @param patternId - The pattern ID to search for
   * @returns Array of ingredient line data
   */
  async getIngredientLinesByPattern(patternId: string): Promise<
    Array<{
      id: string;
      reference: string;
      lineIndex: number;
      noteId?: string;
      createdAt: Date;
    }>
  > {
    try {
      const ingredientLines = await this.prisma.parsedIngredientLine.findMany({
        where: { uniqueLinePatternId: patternId },
        select: {
          id: true,
          reference: true,
          lineIndex: true,
          noteId: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });

      this.logger?.log(
        `[PATTERN_TRACKER] Found ${ingredientLines.length} ingredient lines for pattern ${patternId}`,
        LogLevel.DEBUG
      );

      // Transform the result to handle null noteId values
      return ingredientLines.map((line) => ({
        id: line.id,
        reference: line.reference,
        lineIndex: line.lineIndex,
        noteId: line.noteId || undefined,
        createdAt: line.createdAt,
      }));
    } catch (error) {
      this.logger?.log(
        `[PATTERN_TRACKER] Error getting ingredient lines for pattern ${patternId}: ${error}`,
        LogLevel.ERROR
      );
      throw error;
    }
  }

  /**
   * Get pattern information with related ingredient lines.
   * @param patternId - The pattern ID to get information for
   * @returns Pattern data with related ingredient lines
   */
  async getPatternWithIngredientLines(patternId: string): Promise<{
    pattern: {
      id: string;
      ruleIds: string[];
      exampleLine?: string;
      occurrenceCount: number;
      createdAt: Date;
    };
    ingredientLines: Array<{
      id: string;
      reference: string;
      lineIndex: number;
      noteId?: string;
      createdAt: Date;
    }>;
  } | null> {
    try {
      const pattern = await this.prisma.uniqueLinePattern.findUnique({
        where: { id: patternId },
      });

      if (!pattern) {
        return null;
      }

      const ingredientLines = await this.getIngredientLinesByPattern(patternId);

      return {
        pattern: {
          id: pattern.id,
          ruleIds: pattern.ruleIds,
          exampleLine: pattern.exampleLine || undefined,
          occurrenceCount: pattern.occurrenceCount,
          createdAt: pattern.createdAt,
        },
        ingredientLines,
      };
    } catch (error) {
      this.logger?.log(
        `[PATTERN_TRACKER] Error getting pattern with ingredient lines for ${patternId}: ${error}`,
        LogLevel.ERROR
      );
      throw error;
    }
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
