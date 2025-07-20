import type { PrismaClient } from "@peas/database";
import type { BaseWorkerDependencies } from "../core/types";

export interface PatternRule {
  rule: string;
  ruleNumber: number;
}

export interface PatternData {
  patternCode: string;
  ruleSequence: PatternRule[];
  exampleLine?: string;
}

export class PatternTracker {
  constructor(
    private prisma: PrismaClient,
    private logger?: BaseWorkerDependencies["logger"]
  ) {}

  /**
   * Generate a pattern code from rule sequence
   * Includes rule numbers in the pattern code for better identification
   */
  private generatePatternCode(rules: PatternRule[]): string {
    return rules.map((rule) => `${rule.ruleNumber}:${rule.rule}`).join("_");
  }

  /**
   * Track a pattern and save/update it in the database
   */
  async trackPattern(
    rules: PatternRule[],
    exampleLine?: string
  ): Promise<void> {
    try {
      const patternCode = this.generatePatternCode(rules);

      this.logger?.log(
        `[PATTERN_TRACKER] Tracking pattern: ${patternCode}`,
        "debug"
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
          "debug"
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
          "debug"
        );
      }
    } catch (error) {
      this.logger?.log(
        `[PATTERN_TRACKER] Error tracking pattern: ${error}`,
        "error"
      );
      throw error;
    }
  }

  /**
   * Get all patterns ordered by occurrence count
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
        "error"
      );
      throw error;
    }
  }
}
