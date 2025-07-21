import type {
  ProcessInstructionLineInput,
  ProcessInstructionLineOutput,
} from "./types";

import { ActionName } from "../../../types";
import { BaseAction } from "../../core/base-action";
import { ActionContext } from "../../core/types";
import { broadcastParsingError } from "../../shared/error-broadcasting";
import type { InstructionWorkerDependencies } from "../types";

/**
 * Action to process a single instruction line for a recipe note.
 * Handles normalization, validation, and error broadcasting for instruction text.
 */
export class ProcessInstructionLineAction extends BaseAction<
  ProcessInstructionLineInput,
  InstructionWorkerDependencies
> {
  name = ActionName.PROCESS_INSTRUCTION_LINE;

  /**
   * Execute the action: parse, validate, and extract steps from an instruction line.
   * Broadcasts errors as needed.
   */
  async execute(
    input: ProcessInstructionLineInput,
    deps: InstructionWorkerDependencies,
    _context: ActionContext
  ): Promise<ProcessInstructionLineOutput> {
    const start = Date.now();
    try {
      this.logProcessing(input, deps);

      // Generic processing: normalize text and validate
      const normalizedText = this.processInstructionText(input.originalText);
      const isValid = normalizedText.trim().length > 3;
      const parseStatus = isValid ? "CORRECT" : "ERROR";

      if (!isValid) {
        await this.broadcastParseError(input, deps);
      }

      const processingTime = Date.now() - start;
      return this.buildResult(
        input,
        normalizedText,
        parseStatus,
        undefined,
        processingTime
      );
    } catch (error) {
      const processingTime = Date.now() - start;
      await this.broadcastProcessingError(input, deps, error as Error);
      return this.buildErrorResult(input, error as Error, processingTime);
    }
  }

  /**
   * Normalize and clean up the instruction text.
   * - Removes ALL CAPS prefix before ':' or '-'.
   * - Ensures final punctuation.
   */
  private processInstructionText(text: string): string {
    let result = text.trim();
    // Remove ALL CAPS prefix before ':' or '-'
    result = result.replace(/^([A-Z\s]+)(:|-)\s*/, "");
    // Ensure final punctuation
    return /[.!?]$/.test(result) ? result : result + ".";
  }

  /**
   * Log the start of instruction line processing.
   */
  private logProcessing(
    input: ProcessInstructionLineInput,
    deps: InstructionWorkerDependencies
  ) {
    const { noteId, instructionLineId, originalText, lineIndex } = input;
    if (deps.logger) {
      deps.logger.log(
        `Processing instruction line for note ${noteId}: instructionLineId=${instructionLineId}, originalText="${originalText}", lineIndex=${lineIndex}`
      );
    } else {
      console.log(`Processing instruction line for note ${noteId}:`, {
        instructionLineId,
        originalText,
        lineIndex,
      });
    }
  }

  /**
   * Broadcast a parsing error using only the required dependencies.
   */
  private async broadcastParseError(
    input: ProcessInstructionLineInput,
    deps: InstructionWorkerDependencies
  ) {
    await broadcastParsingError(
      {
        logger: deps.logger as {
          log: (message: string, level?: string) => void;
        },
        addStatusEventAndBroadcast: deps.addStatusEventAndBroadcast,
      },
      {
        importId: input.importId,
        noteId: input.noteId,
        lineId: input.instructionLineId,
        reference: input.originalText,
        errorMessage: "Instruction parsing failed",
        context: "parse_html_instructions",
      }
    );
  }

  /**
   * Broadcast a processing error using only the required dependencies.
   */
  private async broadcastProcessingError(
    input: ProcessInstructionLineInput,
    deps: InstructionWorkerDependencies,
    error: Error
  ) {
    await broadcastParsingError(
      {
        logger: deps.logger as {
          log: (message: string, level?: string) => void;
        },
        addStatusEventAndBroadcast: deps.addStatusEventAndBroadcast,
      },
      {
        importId: input.importId,
        noteId: input.noteId,
        lineId: input.instructionLineId,
        reference: input.originalText,
        errorMessage: `Processing error: ${error.message}`,
        context: "parse_html_instructions",
      }
    );
  }

  /**
   * Build the successful result object.
   */
  private buildResult(
    input: ProcessInstructionLineInput,
    normalizedText: string,
    parseStatus: "CORRECT" | "INCORRECT" | "ERROR",
    steps: undefined,
    processingTime: number
  ): ProcessInstructionLineOutput {
    return {
      noteId: input.noteId,
      instructionLineId: input.instructionLineId,
      originalText: input.originalText,
      lineIndex: input.lineIndex,
      importId: input.importId,
      currentInstructionIndex: input.currentInstructionIndex,
      totalInstructions: input.totalInstructions,
      success: parseStatus !== "ERROR",
      parseStatus,
      normalizedText,
      steps,
      processingTime,
    };
  }

  /**
   * Build the error result object.
   */
  private buildErrorResult(
    input: ProcessInstructionLineInput,
    error: Error,
    processingTime: number
  ): ProcessInstructionLineOutput {
    return {
      noteId: input.noteId,
      instructionLineId: input.instructionLineId,
      originalText: input.originalText,
      lineIndex: input.lineIndex,
      importId: input.importId,
      currentInstructionIndex: input.currentInstructionIndex,
      totalInstructions: input.totalInstructions,
      success: false,
      parseStatus: "ERROR",
      errorMessage: error.message,
      processingTime,
    };
  }
}
