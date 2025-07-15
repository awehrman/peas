import { BaseAction } from "../core/base-action";
import { ActionContext } from "../core/types";
import { ProcessInstructionLineOutput } from "./process-instruction-line";

export interface SaveInstructionLineInput {
  noteId: string;
  instructionLineId: string;
  parseResult: ProcessInstructionLineOutput;
}

export interface SaveInstructionLineOutput {
  success: boolean;
  stepsSaved: number;
  parseStatus: string;
}

export class SaveInstructionLineAction extends BaseAction<
  SaveInstructionLineInput,
  any
> {
  name = "save-instruction-line";

  async execute(
    input: SaveInstructionLineInput,
    _deps: any,
    _context: ActionContext
  ): Promise<SaveInstructionLineOutput> {
    try {
      const { noteId, instructionLineId, parseResult } = input;

      // TODO: Implement actual database save logic
      // This would typically involve:
      // 1. Updating the ParsedInstructionLine with parse status and normalized text
      // 2. Creating step records for each parsed step
      // 3. Linking steps to the instruction line
      // 4. Updating note parsing error count if needed

      // Stub implementation for now
      console.log(`Saving instruction line data for note ${noteId}:`, {
        instructionLineId,
        parseStatus: parseResult.parseStatus,
        normalizedText: parseResult.normalizedText,
        stepsCount: parseResult.steps?.length || 0,
      });

      const stepsSaved = parseResult.steps?.length || 0;

      const result: SaveInstructionLineOutput = {
        success: parseResult.success,
        stepsSaved,
        parseStatus: parseResult.parseStatus,
      };

      return result;
    } catch (error) {
      throw new Error(`Failed to save instruction line: ${error}`);
    }
  }
}
