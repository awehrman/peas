import { BaseAction } from "../../core/base-action";
import { ActionContext } from "../../core/types";
import type { IngredientWorkerDependencies } from "../types";
import { ProcessIngredientLineOutput } from "./process-ingredient-line";
import { DatabaseOperations } from "../../shared/database-operations";

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
  // Pass through original input fields needed by next actions
  noteId: string;
  ingredientLineId: string;
  reference: string;
  blockIndex: number;
  lineIndex: number;
  parsedSegments?: Array<{
    index: number;
    rule: string;
    type: string;
    value: string;
  }>;
  // Tracking information from job data
  importId?: string;
  currentIngredientIndex?: number;
  totalIngredients?: number;
  // Save operation results
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

      // Validate required fields
      if (!ingredientLineId) {
        throw new Error(
          "ingredientLineId is required for SaveIngredientLineAction"
        );
      }
      if (!noteId) {
        throw new Error("noteId is required for SaveIngredientLineAction");
      }

      // Log the parsed segments that will be saved
      deps.logger?.log(
        `[SAVE_INGREDIENT_LINE] Saving parsed segments for note ${noteId}, ingredientLineId=${ingredientLineId}: ${JSON.stringify(parsedSegments, null, 2)}`
      );

      // Save to Prisma database
      let segmentsSaved = 0;

      try {
        const dbOps = new DatabaseOperations(deps.database.prisma);

        // Create or update the ParsedIngredientLine with parse status
        deps.logger?.log(
          `[SAVE_INGREDIENT_LINE] Creating/updating ParsedIngredientLine for ${ingredientLineId}`
        );
        await dbOps.createOrUpdateParsedIngredientLine(ingredientLineId, {
          blockIndex: input.blockIndex,
          lineIndex: input.lineIndex,
          reference: input.reference,
          noteId: input.noteId,
          parseStatus: parseStatus as "CORRECT" | "INCORRECT" | "ERROR",
          parsedAt: success ? new Date() : undefined,
        });
        deps.logger?.log(
          `[SAVE_INGREDIENT_LINE] Successfully created/updated ParsedIngredientLine for ${ingredientLineId}`
        );

        // If parsing was successful and we have segments, create ParsedSegment records
        if (success && parsedSegments && parsedSegments.length > 0) {
          deps.logger?.log(
            `[SAVE_INGREDIENT_LINE] Saving ${parsedSegments.length} parsed segments for ${ingredientLineId}`
          );
          await dbOps.replaceParsedSegments(ingredientLineId, parsedSegments);
          segmentsSaved = parsedSegments.length;
          deps.logger?.log(
            `[SAVE_INGREDIENT_LINE] Successfully saved ${segmentsSaved} parsed segments for ${ingredientLineId}`
          );
        } else {
          deps.logger?.log(
            `[SAVE_INGREDIENT_LINE] No segments to save: success=${success}, segmentsCount=${parsedSegments?.length || 0}`
          );
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
          `[SAVE_INGREDIENT_LINE] Database save failed: ${dbError instanceof Error ? dbError.toString() : String(dbError)}`
        );
        throw new Error(`Database save failed: ${dbError}`);
      }

      const result: SaveIngredientLineOutput = {
        // Pass through original input fields needed by next actions
        noteId: input.noteId,
        ingredientLineId: input.ingredientLineId,
        reference: input.reference,
        blockIndex: input.blockIndex,
        lineIndex: input.lineIndex,
        parsedSegments: input.parsedSegments,
        // Tracking information from job data
        importId: input.importId,
        currentIngredientIndex: input.currentIngredientIndex,
        totalIngredients: input.totalIngredients,
        // Save operation results
        success,
        segmentsSaved,
        parseStatus,
      };

      return result;
    } catch (error) {
      throw new Error(
        `Failed to save ingredient line: ${error instanceof Error ? error.message : String(error)}`
      );
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
      processingTime?: number;
    }>,
    ingredientLineId: string,
    reference: string,
    noteId?: string
  ): Promise<void> {
    try {
      if (!ingredientLineId) {
        deps.logger?.log(
          `[TRACK_INGREDIENTS] Skipping ingredient tracking - ingredientLineId is undefined`
        );
        return;
      }

      const dbOps = new DatabaseOperations(deps.database.prisma);

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

        // Find or create ingredient using DatabaseOperations
        const {
          id: ingredientId,
          name: name,
          isNew,
        } = await dbOps.findOrCreateIngredient(ingredientName, reference);

        deps.logger?.log(
          `[TRACK_INGREDIENTS] ${isNew ? "Created new" : "Found existing"} ingredient: "${name}" (ID: ${ingredientId})`
        );

        // Create ingredient reference using DatabaseOperations
        await dbOps.createIngredientReference({
          ingredientId,
          parsedLineId: ingredientLineId,
          segmentIndex: segment.index,
          reference,
          noteId,
          context: "main_ingredient",
        });

        deps.logger?.log(
          `[TRACK_INGREDIENTS] Created reference for "${name}" in line "${reference}"`
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
