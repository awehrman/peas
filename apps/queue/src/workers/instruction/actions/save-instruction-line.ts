import { BaseAction } from "../../core/base-action";
import { ActionContext } from "../../core/types";
import type { InstructionWorkerDependencies } from "../types";
import { ProcessInstructionLineOutput } from "./process-instruction-line";

export interface SaveInstructionLineInput extends ProcessInstructionLineOutput {
  noteId: string;
  instructionLineId: string;
  originalText: string;
  lineIndex: number;
  // Tracking information from job data
  importId?: string;
  currentInstructionIndex?: number;
  totalInstructions?: number;
}

export interface SaveInstructionLineOutput {
  success: boolean;
  stepsSaved: number;
  parseStatus: string;
  // Tracking information for completion broadcast
  importId?: string;
  noteId?: string;
  currentInstructionIndex?: number;
  totalInstructions?: number;
  instructionLineId?: string;
}

export class SaveInstructionLineAction extends BaseAction<
  SaveInstructionLineInput,
  InstructionWorkerDependencies
> {
  name = "save-instruction-line";

  async execute(
    input: SaveInstructionLineInput,
    deps: InstructionWorkerDependencies,
    _context: ActionContext
  ): Promise<SaveInstructionLineOutput> {
    try {
      const {
        noteId,
        instructionLineId,
        success,
        parseStatus,
        normalizedText,
        steps,
        importId,
        currentInstructionIndex,
        totalInstructions,
      } = input;

      // TODO: Implement actual database save logic
      // This would typically involve:
      // 1. Updating the ParsedInstructionLine with parse status and normalized text
      // 2. Creating step records for each parsed step
      // 3. Linking steps to the instruction line
      // 4. Updating note parsing error count if needed

      // Stub implementation for now
      if (deps.logger) {
        deps.logger.log(
          `Saving instruction line data for note ${noteId}: instructionLineId=${instructionLineId}, parseStatus=${parseStatus}, stepsCount=${steps?.length || 0}`
        );
      } else {
        console.log(`Saving instruction line data for note ${noteId}:`, {
          instructionLineId,
          parseStatus,
          normalizedText,
          stepsCount: steps?.length || 0,
        });
      }

      const stepsSaved = steps?.length || 0;

      const result: SaveInstructionLineOutput = {
        success,
        stepsSaved,
        parseStatus,
        // Pass through tracking information for completion broadcast
        importId,
        noteId,
        currentInstructionIndex,
        totalInstructions,
        instructionLineId,
      };

      return result;
    } catch (error) {
      throw new Error(`Failed to save instruction line: ${error}`);
    }
  }
}
