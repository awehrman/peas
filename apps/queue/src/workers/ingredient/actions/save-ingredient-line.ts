import { BaseAction } from "../../core/base-action";
import { ActionContext } from "../../core/types";
import type { IngredientWorkerDependencies } from "../types";
import { ProcessIngredientLineOutput } from "./process-ingredient-line";
import pluralize from "pluralize";

export interface SaveIngredientLineInput extends ProcessIngredientLineOutput {
  noteId: string;
  ingredientLineId: string;
  reference: string;
  blockIndex: number;
  lineIndex: number;
  // Tracking information from job data
  importId?: string;
  currentIngredientIndex?: number;
  totalIngredients?: number;
}

export interface SaveIngredientLineOutput {
  success: boolean;
  segmentsSaved: number;
  parseStatus: string;
}

export class SaveIngredientLineAction extends BaseAction<
  SaveIngredientLineInput,
  IngredientWorkerDependencies
> {
  name = "save-ingredient-line";

  async execute(
    input: SaveIngredientLineInput,
    deps: IngredientWorkerDependencies,
    _context: ActionContext
  ): Promise<SaveIngredientLineOutput> {
    try {
      const {
        noteId,
        ingredientLineId,
        success,
        parseStatus,
        parsedSegments,
        reference,
      } = input;

      // Log the parsed segments that will be saved
      deps.logger?.log(
        `[SAVE_INGREDIENT_LINE] Saving parsed segments for note ${noteId}, ingredientLineId=${ingredientLineId}: ${JSON.stringify(parsedSegments, null, 2)}`
      );

      // Save to Prisma database
      let segmentsSaved = 0;

      try {
        // Update the ParsedIngredientLine with parse status
        await deps.database.prisma.parsedIngredientLine.update({
          where: { id: ingredientLineId },
          data: {
            parseStatus: parseStatus as "CORRECT" | "INCORRECT" | "ERROR", // Cast to ParseStatus enum
            parsedAt: success ? new Date() : null,
          },
        });

        // If parsing was successful and we have segments, create ParsedSegment records
        if (success && parsedSegments && parsedSegments.length > 0) {
          // Delete existing segments first (in case of re-parsing)
          await deps.database.prisma.parsedSegment.deleteMany({
            where: { ingredientLineId },
          });

          // Create new segments
          const segmentData = parsedSegments.map((segment) => ({
            index: segment.index,
            rule: segment.rule,
            type: segment.type,
            value: segment.value,
            ingredientLineId,
          }));

          await deps.database.prisma.parsedSegment.createMany({
            data: segmentData,
          });

          segmentsSaved = parsedSegments.length;
        }

        // Track ingredients found in parsed segments
        if (success && parsedSegments && parsedSegments.length > 0) {
          await this.trackIngredients(
            deps,
            parsedSegments,
            ingredientLineId,
            reference,
            noteId
          );
        }

        deps.logger?.log(
          `[SAVE_INGREDIENT_LINE] Successfully saved to database: noteId=${noteId}, ingredientLineId=${ingredientLineId}, parseStatus=${parseStatus}, segmentsSaved=${segmentsSaved}`
        );
      } catch (dbError) {
        deps.logger?.log(
          `[SAVE_INGREDIENT_LINE] Database save failed: ${dbError instanceof Error ? dbError.message : String(dbError)}`
        );
        throw new Error(`Database save failed: ${dbError}`);
      }

      const result: SaveIngredientLineOutput = {
        success,
        segmentsSaved,
        parseStatus,
      };

      return result;
    } catch (error) {
      throw new Error(`Failed to save ingredient line: ${error}`);
    }
  }

  /**
   * Track ingredients found in parsed segments and upsert them in the database
   */
  private async trackIngredients(
    deps: IngredientWorkerDependencies,
    parsedSegments: Array<{
      index: number;
      rule: string;
      type: string;
      value: string;
    }>,
    ingredientLineId: string,
    reference: string,
    noteId?: string
  ): Promise<void> {
    try {
      // Find all segments with type "ingredient"
      const ingredientSegments = parsedSegments.filter(
        (segment) => segment.type === "ingredient"
      );

      if (ingredientSegments.length === 0) {
        deps.logger?.log(
          `[TRACK_INGREDIENTS] No ingredient segments found in line: "${reference}"`
        );
        return;
      }

      deps.logger?.log(
        `[TRACK_INGREDIENTS] Found ${ingredientSegments.length} ingredient(s) in line: "${reference}"`
      );

      for (const segment of ingredientSegments) {
        const ingredientName = segment.value.trim().toLowerCase();

        if (!ingredientName) {
          continue;
        }

        // Get singular and plural forms
        const singular = pluralize.singular(ingredientName);
        const plural = pluralize.plural(ingredientName);

        deps.logger?.log(
          `[TRACK_INGREDIENTS] Processing ingredient: "${ingredientName}" (singular: "${singular}", plural: "${plural}")`
        );

        // Try to find existing ingredient by name or plural
        let ingredient = await deps.database.prisma.ingredient.findFirst({
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
          ingredient = await deps.database.prisma.ingredient.create({
            data: {
              name: singular,
              plural: plural,
              description: `Ingredient found in recipe: ${reference}`,
            },
          });

          deps.logger?.log(
            `[TRACK_INGREDIENTS] Created new ingredient: "${ingredient.name}" (ID: ${ingredient.id})`
          );
        } else {
          deps.logger?.log(
            `[TRACK_INGREDIENTS] Found existing ingredient: "${ingredient.name}" (ID: ${ingredient.id})`
          );
        }

        // TODO: Create ingredient reference when IngredientReference model is migrated
        deps.logger?.log(
          `[TRACK_INGREDIENTS] Would create reference for "${ingredient.name}" in line "${reference}" (noteId: ${noteId}, model not migrated yet)`
        );
      }
    } catch (error) {
      deps.logger?.log(
        `[TRACK_INGREDIENTS] Error tracking ingredients: ${error instanceof Error ? error.message : String(error)}`
      );
      // Don't throw - ingredient tracking failure shouldn't break the main save operation
    }
  }
}
