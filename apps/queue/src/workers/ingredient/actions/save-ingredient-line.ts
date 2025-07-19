import { BaseAction } from "../../core/base-action";
import { ActionContext } from "../../core/types";
import type { IngredientWorkerDependencies } from "../types";
import { ProcessIngredientLineOutput } from "./process-ingredient-line";

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
      const { noteId, ingredientLineId, success, parseStatus, parsedSegments } =
        input;

      // TODO: Implement actual database save logic
      // This would typically involve:
      // 1. Updating the ParsedIngredientLine with parse status
      // 2. Creating ParsedSegment records for each parsed segment
      // 3. Linking segments to the ingredient line
      // 4. Updating note parsing error count if needed

      // Stub implementation for now
      if (deps.logger) {
        deps.logger.log(
          `Saving ingredient line data for note ${noteId}: ingredientLineId=${ingredientLineId}, parseStatus=${parseStatus}, segmentsCount=${parsedSegments?.length || 0}`
        );
      } else {
        console.log(`Saving ingredient line data for note ${noteId}:`, {
          ingredientLineId,
          parseStatus,
          segmentsCount: parsedSegments?.length || 0,
        });
      }

      const segmentsSaved = parsedSegments?.length || 0;

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
}
