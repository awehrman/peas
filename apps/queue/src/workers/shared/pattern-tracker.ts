import { PrismaClient } from "@peas/database";

export interface ParsedSegment {
  rule: string;
  type: string;
  value: string;
}

export class PatternTracker {
  constructor(private prisma: PrismaClient) {}

  /**
   * Generate a short code for a sequence of rules
   */
  private generatePatternCode(ruleSequence: string[]): string {
    return ruleSequence
      .map((rule) => {
        // Extract the type from the rule path
        const parts = rule.split(" >> ");
        const lastPart = parts[parts.length - 1];

        // Map common rule endings to types
        if (lastPart?.includes("amount")) return "AMOUNT";
        if (lastPart?.includes("unit")) return "UNIT";
        if (lastPart?.includes("ingredient")) return "INGREDIENT";
        if (lastPart?.includes("descriptor")) return "DESC";
        if (lastPart?.includes("comment")) return "COMMENT";
        if (lastPart?.includes("separator")) return "SEP";
        if (lastPart?.includes("preparation")) return "PREP";
        if (lastPart?.includes("modifier")) return "MOD";

        return "UNKNOWN";
      })
      .join("_");
  }

  /**
   * Generate a human-readable description for a pattern
   */
  private generateDescription(
    ruleSequence: string[],
    patternCode: string
  ): string {
    const descriptions: Record<string, string> = {
      AMOUNT_UNIT_INGREDIENT: "Standard ingredient with amount and unit",
      AMOUNT_INGREDIENT: "Ingredient with amount but no unit",
      AMOUNT_UNIT_DESC_INGREDIENT:
        "Ingredient with amount, unit, and descriptor",
      AMOUNT_SEP_AMOUNT_UNIT_INGREDIENT:
        "Range amount with unit and ingredient",
      AMOUNT_UNIT_INGREDIENT_COMMENT:
        "Ingredient with amount, unit, and comment",
      AMOUNT_SEP_AMOUNT_UNIT_INGREDIENT_COMMENT:
        "Range amount with unit, ingredient, and comment",
    };

    return descriptions[patternCode] || `Pattern: ${patternCode}`;
  }

  /**
   * Track a unique line pattern from parsed segments
   */
  async trackPattern(
    segments: ParsedSegment[],
    exampleLine?: string
  ): Promise<void> {
    try {
      // Extract rule sequence from segments
      const ruleSequence = segments.map((segment) => segment.rule);

      // Generate pattern code
      const patternCode = this.generatePatternCode(ruleSequence);

      // Generate description
      const description = this.generateDescription(ruleSequence, patternCode);

      // Extract example values
      const exampleValues = segments.map((segment) => ({
        rule: segment.rule,
        type: segment.type,
        value: segment.value,
      }));

      // Check if pattern already exists
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
          },
        });
      } else {
        // Create new pattern
        await this.prisma.uniqueLinePattern.create({
          data: {
            patternCode,
            ruleSequence: ruleSequence,
            description,
            exampleLine: exampleLine || null,
            exampleValues: exampleValues,
            occurrenceCount: 1,
          },
        });
      }
    } catch (error) {
      // Log error but don't fail the main process
      console.error("[PATTERN_TRACKER] Error tracking pattern:", error);
    }
  }

  /**
   * Get all tracked patterns ordered by occurrence count
   */
  async getPatterns(limit: number = 50): Promise<
    Array<{
      patternCode: string;
      description: string | null;
      occurrenceCount: number;
      firstSeenAt: Date;
      lastSeenAt: Date;
    }>
  > {
    return this.prisma.uniqueLinePattern.findMany({
      select: {
        patternCode: true,
        description: true,
        occurrenceCount: true,
        firstSeenAt: true,
        lastSeenAt: true,
      },
      orderBy: { occurrenceCount: "desc" },
      take: limit,
    });
  }
}
