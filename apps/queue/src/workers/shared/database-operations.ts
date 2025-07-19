import type { PrismaClient } from "@peas/database";

/**
 * Shared database operations for workers
 */
export class DatabaseOperations {
  constructor(private prisma: PrismaClient) {}

  /**
   * Update parsed ingredient line with parse status
   */
  async updateParsedIngredientLine(
    lineId: string,
    data: {
      parseStatus: "CORRECT" | "INCORRECT" | "ERROR";
      parsedAt?: Date;
    }
  ): Promise<void> {
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
