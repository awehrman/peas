import type {
  SaveInstructionLineInput,
  SaveInstructionLineOutput,
} from "./types";

import { ActionName } from "../../../types";
import { BaseAction } from "../../core/base-action";
import { ActionContext } from "../../core/types";
import type { InstructionWorkerDependencies } from "../types";

/**
 * Action to save a processed instruction line to the database or downstream system.
 * Handles logging and result construction for instruction line save operations.
 */
export class SaveInstructionLineAction extends BaseAction<
  SaveInstructionLineInput,
  InstructionWorkerDependencies
> {
  name = ActionName.SAVE_INSTRUCTION_LINE;

  /**
   * Executes the save instruction line action.
   * Logs the operation and returns a summary result.
   */
  async execute(
    input: SaveInstructionLineInput,
    deps: InstructionWorkerDependencies,
    _context: ActionContext
  ): Promise<SaveInstructionLineOutput> {
    try {
      this.logSave(input, deps);
      return this.buildResult(input);
    } catch (error) {
      throw new Error(
        `Failed to save instruction line: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Logs the save operation for the instruction line.
   */
  private logSave(
    input: SaveInstructionLineInput,
    deps: InstructionWorkerDependencies
  ) {
    const { noteId, instructionLineId, parseStatus, normalizedText, steps } =
      input;
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
  }

  /**
   * Builds the result object for the save operation.
   */
  private buildResult(
    input: SaveInstructionLineInput
  ): SaveInstructionLineOutput {
    const {
      success,
      parseStatus,
      importId,
      noteId,
      currentInstructionIndex,
      totalInstructions,
      instructionLineId,
      steps,
    } = input;
    return {
      success,
      stepsSaved: steps?.length || 0,
      parseStatus,
      importId,
      noteId,
      currentInstructionIndex,
      totalInstructions,
      instructionLineId,
    };
  }
}
