import type { PrismaClient } from "@peas/database";
import { PatternTracker } from "./pattern-tracker";

/**
 * Shared database operations for workers
 */
export class DatabaseOperations {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get pattern tracker instance
   */
  get patternTracker(): PatternTracker {
    return new PatternTracker(this.prisma);
  }

  /**
   * Create or update parsed ingredient line
   */
  async createOrUpdateParsedIngredientLine(
    lineId: string,
    data: {
      blockIndex: number;
      lineIndex: number;
      reference: string;
      noteId?: string;
      parseStatus: "CORRECT" | "INCORRECT" | "ERROR";
      parsedAt?: Date;
    }
  ): Promise<void> {
    if (!lineId) {
      throw new Error(
        "lineId is required for createOrUpdateParsedIngredientLine"
      );
    }

    try {
      // Try to update first
      await this.prisma.parsedIngredientLine.update({
        where: { id: lineId },
        data: {
          parseStatus: data.parseStatus,
          parsedAt: data.parsedAt || new Date(),
        },
      });
    } catch (error) {
      // If record doesn't exist, create it
      if (
        error instanceof Error &&
        error.message.includes("No record was found")
      ) {
        await this.prisma.parsedIngredientLine.create({
          data: {
            id: lineId,
            blockIndex: data.blockIndex,
            lineIndex: data.lineIndex,
            reference: data.reference,
            noteId: data.noteId || null, // Make noteId optional
            parseStatus: data.parseStatus,
            parsedAt: data.parsedAt || new Date(),
          },
        });
      } else {
        throw error;
      }
    }
  }

  /**
   * Update parsed ingredient line with parse status (deprecated - use createOrUpdateParsedIngredientLine)
   */
  async updateParsedIngredientLine(
    lineId: string,
    data: {
      parseStatus: "CORRECT" | "INCORRECT" | "ERROR";
      parsedAt?: Date;
    }
  ): Promise<void> {
    if (!lineId) {
      throw new Error("lineId is required for updateParsedIngredientLine");
    }

    await this.prisma.parsedIngredientLine.update({
      where: { id: lineId },
      data: {
        parseStatus: data.parseStatus,
        parsedAt: data.parsedAt || new Date(),
      },
    });
  }

  /**
   * Replace parsed segments for an ingredient line
   */
  async replaceParsedSegments(
    ingredientLineId: string,
    segments: Array<{
      index: number;
      rule: string;
      type: string;
      value: string;
    }>
  ): Promise<void> {
    if (!ingredientLineId) {
      throw new Error("ingredientLineId is required for replaceParsedSegments");
    }

    // Delete existing segments first
    await this.prisma.parsedSegment.deleteMany({
      where: { ingredientLineId },
    });

    // Create new segments
    if (segments.length > 0) {
      const segmentData = segments.map((segment) => ({
        index: segment.index,
        rule: segment.rule,
        type: segment.type,
        value: segment.value,
        ingredientLineId,
      }));

      await this.prisma.parsedSegment.createMany({
        data: segmentData,
      });
    }
  }

  /**
   * Create ingredient reference
   */
  async createIngredientReference(data: {
    ingredientId: string;
    parsedLineId: string;
    segmentIndex: number;
    reference: string;
    noteId?: string;
    confidence?: number;
    context?: string;
  }): Promise<void> {
    if (!data.ingredientId) {
      throw new Error("ingredientId is required for createIngredientReference");
    }
    if (!data.parsedLineId) {
      throw new Error("parsedLineId is required for createIngredientReference");
    }

    try {
      await this.prisma.ingredientReference.create({
        data: {
          ingredientId: data.ingredientId,
          parsedLineId: data.parsedLineId,
          segmentIndex: data.segmentIndex,
          reference: data.reference,
          noteId: data.noteId,
          confidence: data.confidence || 1.0,
          context: data.context || "main_ingredient",
        },
      });
    } catch (error) {
      // Handle unique constraint violations gracefully
      if (
        error instanceof Error &&
        error.message.includes("Unique constraint")
      ) {
        // Reference already exists, which is fine
        return;
      }
      throw error;
    }
  }

  /**
   * Find or create ingredient with pluralize support
   */
  async findOrCreateIngredient(
    ingredientName: string,
    reference: string
  ): Promise<{ id: string; name: string; isNew: boolean }> {
    const { default: pluralize } = await import("pluralize");
    const singular = pluralize.singular(ingredientName);
    const plural = pluralize.plural(ingredientName);

    // Try to find existing ingredient
    let ingredient = await this.prisma.ingredient.findFirst({
      where: {
        OR: [
          { name: singular },
          { name: plural },
          { name: ingredientName },
          {
            aliases: {
              some: { name: { in: [singular, plural, ingredientName] } },
            },
          },
        ],
      },
    });

    if (!ingredient) {
      // Create new ingredient
      ingredient = await this.prisma.ingredient.create({
        data: {
          name: singular,
          plural: plural,
          description: `Ingredient found in recipe: ${reference}`,
        },
      });
      return { id: ingredient.id, name: ingredient.name, isNew: true };
    }

    return { id: ingredient.id, name: ingredient.name, isNew: false };
  }
}
