import type { PrismaClient } from "@peas/database";

/**
 * Shared database operations for workers.
 * Handles parsed ingredient lines, segments, ingredient references, and ingredient lookup/creation.
 *
 * @template TPrisma - The Prisma client type
 */
export class DatabaseOperations<TPrisma extends PrismaClient = PrismaClient> {
  constructor(private prisma: TPrisma) {}

  /**
   * Create or update parsed ingredient line.
   * @param lineId - The line ID
   * @param data - Parsed line data
   */
  async createOrUpdateParsedIngredientLine(
    lineId: string,
    data: {
      blockIndex: number;
      lineIndex: number;
      reference: string;
      noteId?: string;
      parseStatus: "COMPLETED_SUCCESSFULLY" | "COMPLETED_WITH_ERROR";
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
   * Update parsed ingredient line with parse status (deprecated - use createOrUpdateParsedIngredientLine).
   * @param lineId - The line ID
   * @param data - Status update data
   */
  async updateParsedIngredientLine(
    lineId: string,
    data: {
      parseStatus: "COMPLETED_SUCCESSFULLY" | "COMPLETED_WITH_ERROR";
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
   * Replace parsed segments for an ingredient line.
   * @param ingredientLineId - The ingredient line ID
   * @param segments - Array of segment data
   */
  async replaceParsedSegments(
    ingredientLineId: string,
    segments: Array<{
      index: number;
      rule: string;
      type: string;
      value: string;
      processingTime?: number; // Processing time in milliseconds
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
        processingTime: segment.processingTime || null,
        ingredientLineId,
      }));

      await this.prisma.parsedSegment.createMany({
        data: segmentData,
      });
    }
  }

  /**
   * Create ingredient reference.
   * @param data - Ingredient reference data
   */
  async createIngredientReference(data: {
    ingredientId: string;
    parsedLineId: string;
    segmentIndex: number;
    reference: string;
    noteId?: string;
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
   * Find or create ingredient with pluralize support.
   * @param ingredientName - Ingredient name
   * @param _reference - Reference string
   * @returns Ingredient ID, name, and isNew flag
   */
  async findOrCreateIngredient(
    ingredientName: string,
    _reference: string
  ): Promise<{ id: string; name: string; isNew: boolean }> {
    const { default: pluralize } = await import("pluralize");
    const singular = pluralize.singular(ingredientName);
    const plural = pluralize.plural(ingredientName);

    // Try to find existing ingredient using pluralize for lookup only
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
      // Check if the original name is plural (by comparing with singularized version)
      const isPlural = ingredientName !== singular;

      // Create new ingredient
      // If original is plural, save singular as name and original as plural
      // If original is singular, save singular as name and leave plural as null
      const createData = isPlural
        ? {
            name: singular,
            plural: ingredientName, // Use original plural
          }
        : {
            name: ingredientName, // Use original singular
            plural: null, // Leave as null for singular inputs
          };

      ingredient = await this.prisma.ingredient.create({
        data: createData,
      });
      return { id: ingredient.id, name: ingredient.name, isNew: true };
    }

    return { id: ingredient.id, name: ingredient.name, isNew: false };
  }
}
