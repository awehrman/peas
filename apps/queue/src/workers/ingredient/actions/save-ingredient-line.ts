import { BaseAction } from "../../core/base-action";
import { ActionContext } from "../../core/types";
import { DatabaseOperations } from "../../shared/database-operations";
import type {
  IngredientWorkerDependencies,
  SaveIngredientLineInput,
  SaveIngredientLineOutput,
} from "../types";
import { IngredientSegmentType } from "../types";

/**
 * Action to save a parsed ingredient line and its segments to the database.
 * Handles validation, database operations, and ingredient tracking.
 */
export class SaveIngredientLineAction extends BaseAction<
  SaveIngredientLineInput,
  IngredientWorkerDependencies
> {
  name = "save-ingredient-line";

  /**
   * Executes the save ingredient line action.
   * @param input - The input data for saving the ingredient line.
   * @param deps - The ingredient worker dependencies.
   * @param _context - The action context (unused).
   * @returns The output of the save operation.
   */
  async execute(
    input: SaveIngredientLineInput,
    deps: IngredientWorkerDependencies,
    _context: ActionContext
  ): Promise<SaveIngredientLineOutput> {
    try {
      this._validateInput(input);
      this.logParsedSegments(input, deps);
      const segmentsSaved = await this.saveToDatabase(input, deps);
      if (
        input.success &&
        input.parsedSegments &&
        input.parsedSegments.length > 0
      ) {
        await this.trackIngredients(
          deps,
          input.parsedSegments,
          input.ingredientLineId,
          input.reference,
          input.noteId
        );
      }
      this.logSaveSuccess(input, deps, segmentsSaved);
      return this.buildResult(input, segmentsSaved);
    } catch (error) {
      throw new Error(
        `Failed to save ingredient line: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Validates required input fields.
   */
  private _validateInput(input: SaveIngredientLineInput): void {
    if (!input.ingredientLineId) {
      throw new Error(
        "ingredientLineId is required for SaveIngredientLineAction"
      );
    }
    if (!input.noteId) {
      throw new Error("noteId is required for SaveIngredientLineAction");
    }
  }

  /**
   * Logs the parsed segments that will be saved.
   */
  private logParsedSegments(
    input: SaveIngredientLineInput,
    deps: IngredientWorkerDependencies
  ): void {
    deps.logger?.log(
      `[SAVE_INGREDIENT_LINE] Saving parsed segments for note ${input.noteId}, ingredientLineId=${input.ingredientLineId}: ${JSON.stringify(input.parsedSegments, null, 2)}`
    );
  }

  /**
   * Saves the parsed ingredient line and segments to the database.
   * @returns The number of segments saved.
   */
  private async saveToDatabase(
    input: SaveIngredientLineInput,
    deps: IngredientWorkerDependencies
  ): Promise<number> {
    let segmentsSaved = 0;
    try {
      const dbOps = new DatabaseOperations(deps.database.prisma);
      deps.logger?.log(
        `[SAVE_INGREDIENT_LINE] Creating/updating ParsedIngredientLine for ${input.ingredientLineId}`
      );
      await dbOps.createOrUpdateParsedIngredientLine(input.ingredientLineId, {
        blockIndex: input.blockIndex,
        lineIndex: input.lineIndex,
        reference: input.reference,
        noteId: input.noteId,
        parseStatus: input.parseStatus as "CORRECT" | "INCORRECT" | "ERROR",
        parsedAt: input.success ? new Date() : undefined,
      });
      deps.logger?.log(
        `[SAVE_INGREDIENT_LINE] Successfully created/updated ParsedIngredientLine for ${input.ingredientLineId}`
      );
      if (
        input.success &&
        input.parsedSegments &&
        input.parsedSegments.length > 0
      ) {
        deps.logger?.log(
          `[SAVE_INGREDIENT_LINE] Saving ${input.parsedSegments.length} parsed segments for ${input.ingredientLineId}`
        );
        await dbOps.replaceParsedSegments(
          input.ingredientLineId,
          input.parsedSegments
        );
        segmentsSaved = input.parsedSegments.length;
        deps.logger?.log(
          `[SAVE_INGREDIENT_LINE] Successfully saved ${segmentsSaved} parsed segments for ${input.ingredientLineId}`
        );
      } else {
        deps.logger?.log(
          `[SAVE_INGREDIENT_LINE] No segments to save: success=${input.success}, segmentsCount=${input.parsedSegments?.length || 0}`
        );
      }
      return segmentsSaved;
    } catch (dbError) {
      deps.logger?.log(
        `[SAVE_INGREDIENT_LINE] Database save failed: ${dbError instanceof Error ? dbError.toString() : String(dbError)}`
      );
      throw new Error(`Database save failed: ${dbError}`);
    }
  }

  /**
   * Logs a successful save operation.
   */
  private logSaveSuccess(
    input: SaveIngredientLineInput,
    deps: IngredientWorkerDependencies,
    segmentsSaved: number
  ): void {
    deps.logger?.log(
      `[SAVE_INGREDIENT_LINE] Successfully saved to database: noteId=${input.noteId}, ingredientLineId=${input.ingredientLineId}, parseStatus=${input.parseStatus}, segmentsSaved=${segmentsSaved}`
    );
  }

  /**
   * Builds the output object for the save operation.
   */
  private buildResult(
    input: SaveIngredientLineInput,
    segmentsSaved: number
  ): SaveIngredientLineOutput {
    return {
      noteId: input.noteId,
      ingredientLineId: input.ingredientLineId,
      reference: input.reference,
      blockIndex: input.blockIndex,
      lineIndex: input.lineIndex,
      parsedSegments: input.parsedSegments,
      importId: input.importId,
      currentIngredientIndex: input.currentIngredientIndex,
      totalIngredients: input.totalIngredients,
      success: input.success,
      segmentsSaved,
      parseStatus: input.parseStatus,
    };
  }

  /**
   * Track ingredients found in parsed segments and upsert them in the database.
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
      const ingredientSegments = parsedSegments.filter(
        (segment) => segment.type === IngredientSegmentType.Ingredient
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
        const {
          id: ingredientId,
          name: name,
          isNew,
        } = await dbOps.findOrCreateIngredient(ingredientName, reference);
        deps.logger?.log(
          `[TRACK_INGREDIENTS] ${isNew ? "Created new" : "Found existing"} ingredient: "${name}" (ID: ${ingredientId})`
        );
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
