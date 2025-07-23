import type { PrismaClient } from "@peas/database";

import { LogLevel } from "../../types";
import type { BaseWorkerDependencies } from "../core/types";

/**
 * Represents a single pattern rule.
 */
export interface PatternRule {
  rule: string;
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
   * Includes rule numbers in the pattern code for better identification.
   * @param rules - Array of pattern rules
   * @returns Pattern code string
   */
  private generatePatternCode(rules: PatternRule[]): string {
    return rules.map((rule) => `${rule.ruleNumber}:${rule.rule}`).join("_");
  }

  /**
   * Track a pattern and save/update it in the database.
   * @param rules - Array of pattern rules
   * @param exampleLine - Optional example line
   */
  async trackPattern(
    rules: PatternRule[],
    exampleLine?: string
  ): Promise<void> {
    try {
      const patternCode = this.generatePatternCode(rules);

      this.logger?.log(
        `[PATTERN_TRACKER] Tracking pattern: ${patternCode}`,
        LogLevel.DEBUG
      );

      // Try to find existing pattern
      const existingPattern = await this.prisma.uniqueLinePattern.findUnique({
        where: { patternCode },
      });

      if (existingPattern) {
        // Update existing pattern
        await this.prisma.uniqueLinePattern.update({
          where: { patternCode },
          data: {
            occurrenceCount: { increment: 1 },
            lastSeenAt: new Date(),
            // Update example line if provided and different
            ...(exampleLine && exampleLine !== existingPattern.exampleLine
              ? { exampleLine }
              : {}),
          },
        });

        this.logger?.log(
          `[PATTERN_TRACKER] Updated existing pattern: ${patternCode} (count: ${existingPattern.occurrenceCount + 1})`,
          LogLevel.DEBUG
        );
      } else {
        // Create new pattern
        await this.prisma.uniqueLinePattern.create({
          data: {
            patternCode,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ruleSequence: rules as unknown as any, // Type assertion for JSON field
            exampleLine,
            occurrenceCount: 1,
          },
        });

        this.logger?.log(
          `[PATTERN_TRACKER] Created new pattern: ${patternCode}`,
          LogLevel.DEBUG
        );
      }
    } catch (error) {
      this.logger?.log(
        `[PATTERN_TRACKER] Error tracking pattern: ${error}`,
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
        patternCode: pattern.patternCode,
        ruleSequence: pattern.ruleSequence as unknown as PatternRule[],
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
