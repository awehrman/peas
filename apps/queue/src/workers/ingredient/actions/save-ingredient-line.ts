import { BaseAction } from "../../core/base-action";
import { ActionContext } from "../../core/types";
import { ProcessIngredientLineOutput } from "./process-ingredient-line";

export interface SaveIngredientLineInput {
  noteId: string;
  ingredientLineId: string;
  parseResult: ProcessIngredientLineOutput;
}

export interface SaveIngredientLineOutput {
  success: boolean;
  segmentsSaved: number;
  parseStatus: string;
}

export class SaveIngredientLineAction extends BaseAction<
  SaveIngredientLineInput,
  any
> {
  name = "save-ingredient-line";

  async execute(
    input: SaveIngredientLineInput,
    _deps: any,
    _context: ActionContext
  ): Promise<SaveIngredientLineOutput> {
    try {
      const { noteId, ingredientLineId, parseResult } = input;

      // TODO: Implement actual database save logic
      // This would typically involve:
      // 1. Updating the ParsedIngredientLine with parse status
      // 2. Creating ParsedSegment records for each parsed segment
      // 3. Linking segments to the ingredient line
      // 4. Updating note parsing error count if needed

      // Stub implementation for now
      if (_deps.logger) {
        _deps.logger.log(
          `Saving ingredient line data for note ${noteId}: ingredientLineId=${ingredientLineId}, parseStatus=${parseResult.parseStatus}, segmentsCount=${parseResult.parsedSegments?.length || 0}`
        );
      } else {
        console.log(`Saving ingredient line data for note ${noteId}:`, {
          ingredientLineId,
          parseStatus: parseResult.parseStatus,
          segmentsCount: parseResult.parsedSegments?.length || 0,
        });
      }

      const segmentsSaved = parseResult.parsedSegments?.length || 0;

      const result: SaveIngredientLineOutput = {
        success: parseResult.success,
        segmentsSaved,
        parseStatus: parseResult.parseStatus,
      };

      return result;
    } catch (error) {
      throw new Error(`Failed to save ingredient line: ${error}`);
    }
  }
}
