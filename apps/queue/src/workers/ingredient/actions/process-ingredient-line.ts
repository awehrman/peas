import { BaseAction } from "../../core/base-action";
import { ActionContext } from "../../core/types";
import { broadcastParsingError } from "../../shared/error-broadcasting";
import type {
  IngredientWorkerDependencies,
  ParsedIngredientResult,
  ParserSegment,
  ProcessIngredientLineInput,
  ProcessIngredientLineOutput,
} from "../types";

/**
 * Action to process a single ingredient line: parses, logs, and handles errors.
 */
export class ProcessIngredientLineAction extends BaseAction<
  ProcessIngredientLineInput,
  IngredientWorkerDependencies
> {
  name = "process_ingredient_line";

  /**
   * Executes the ingredient line processing action.
   * @param input - The input data for the ingredient line.
   * @param deps - The ingredient worker dependencies.
   * @param _context - The action context (unused).
   * @returns The output of the ingredient line processing.
   */
  async execute(
    input: ProcessIngredientLineInput,
    deps: IngredientWorkerDependencies,
    _context: ActionContext
  ): Promise<ProcessIngredientLineOutput> {
    try {
      this.logProcessingStart(input, deps);
      const parseResult = await this.parseIngredient(input, deps);
      await this.handleParseErrorIfNeeded(
        {
          ...parseResult,
          errorMessage: parseResult.errorMessage ?? "",
        },
        input,
        deps
      );
      return this.buildSuccessResult(input, parseResult);
    } catch (error) {
      await this.handleProcessingError(error, input, deps);
      return this.buildErrorResult(error, input);
    }
  }

  /**
   * Logs the start of ingredient line processing.
   * @param input - The input data for the ingredient line.
   * @param deps - The ingredient worker dependencies.
   */
  private logProcessingStart(
    input: ProcessIngredientLineInput,
    deps: IngredientWorkerDependencies
  ): void {
    const { noteId, ingredientLineId, reference, blockIndex, lineIndex } =
      input;
    if (deps.logger) {
      deps.logger.log(
        `Processing ingredient line for note ${noteId}: ingredientLineId=${ingredientLineId}, reference="${reference}", blockIndex=${blockIndex}, lineIndex=${lineIndex}`
      );
    } else {
      console.log(`Processing ingredient line for note ${noteId}:`, {
        ingredientLineId,
        reference,
        blockIndex,
        lineIndex,
      });
    }
  }

  /**
   * Parses the ingredient line using the provided dependencies.
   * @param input - The input data for the ingredient line.
   * @param deps - The ingredient worker dependencies.
   * @returns The parse result.
   */
  private async parseIngredient(
    input: ProcessIngredientLineInput,
    deps: IngredientWorkerDependencies
  ): Promise<ParsedIngredientResult> {
    const parseResult = await deps.parseIngredient(input.reference);
    deps.logger?.log(
      `[PROCESS_INGREDIENT_LINE] Parser result for "${input.reference}": ${JSON.stringify(parseResult, null, 2)}`
    );
    return parseResult;
  }

  /**
   * Broadcasts a parsing error if the parse result indicates failure.
   * @param parseResult - The result of parsing the ingredient line.
   * @param input - The input data for the ingredient line.
   * @param deps - The ingredient worker dependencies.
   */
  private async handleParseErrorIfNeeded(
    parseResult: { success: boolean; errorMessage: string },
    input: ProcessIngredientLineInput,
    deps: IngredientWorkerDependencies
  ): Promise<void> {
    if (!parseResult.success && parseResult.errorMessage) {
      await broadcastParsingError(deps, {
        importId: input.importId,
        noteId: input.noteId,
        lineId: input.ingredientLineId,
        reference: input.reference,
        errorMessage: parseResult.errorMessage,
        context: "parse_html_ingredients",
      });
    }
  }

  /**
   * Builds the output object for a successful parse.
   * @param input - The input data for the ingredient line.
   * @param parseResult - The result of parsing the ingredient line.
   * @returns The output object for the action.
   */
  private buildSuccessResult(
    input: ProcessIngredientLineInput,
    parseResult: ParsedIngredientResult
  ): ProcessIngredientLineOutput {
    return {
      noteId: input.noteId,
      ingredientLineId: input.ingredientLineId,
      reference: input.reference,
      blockIndex: input.blockIndex,
      lineIndex: input.lineIndex,
      importId: input.importId,
      currentIngredientIndex: input.currentIngredientIndex,
      totalIngredients: input.totalIngredients,
      success: parseResult.success,
      parseStatus: parseResult.parseStatus,
      parsedSegments: parseResult.success
        ? this.convertParserOutputToSegments(
            parseResult.segments,
            parseResult.processingTime
          )
        : undefined,
      errorMessage: parseResult.errorMessage,
      processingTime: parseResult.processingTime,
    };
  }

  /**
   * Handles errors that occur during processing by broadcasting and logging them.
   * @param error - The error thrown during processing.
   * @param input - The input data for the ingredient line.
   * @param deps - The ingredient worker dependencies.
   */
  private async handleProcessingError(
    error: unknown,
    input: ProcessIngredientLineInput,
    deps: IngredientWorkerDependencies
  ): Promise<void> {
    await broadcastParsingError(deps, {
      importId: input.importId,
      noteId: input.noteId,
      lineId: input.ingredientLineId,
      reference: input.reference,
      errorMessage: `Processing error: ${(error as Error).message}`,
      context: "parse_html_ingredients",
    });
  }

  /**
   * Builds the output object for a failed parse or processing error.
   * @param error - The error thrown during processing.
   * @param input - The input data for the ingredient line.
   * @returns The output object for the action.
   */
  private buildErrorResult(
    error: unknown,
    input: ProcessIngredientLineInput
  ): ProcessIngredientLineOutput {
    return {
      noteId: input.noteId,
      ingredientLineId: input.ingredientLineId,
      reference: input.reference,
      blockIndex: input.blockIndex,
      lineIndex: input.lineIndex,
      importId: input.importId,
      currentIngredientIndex: input.currentIngredientIndex,
      totalIngredients: input.totalIngredients,
      success: false,
      parseStatus: "ERROR",
      errorMessage: (error as Error).message,
    };
  }

  /**
   * Converts parser output segments to an array of parsed segments.
   * @param segments - The segments from the parser output.
   * @param totalProcessingTime - The total processing time for the parse.
   * @returns An array of parsed segments.
   */
  private convertParserOutputToSegments(
    segments: ParserSegment[],
    totalProcessingTime: number
  ): Array<{
    index: number;
    rule: string;
    type: string;
    value: string;
    processingTime?: number;
  }> {
    return segments.map((segment) => ({
      index: segment.index,
      rule: segment.rule,
      type: segment.type,
      value: segment.value ?? "",
      processingTime: totalProcessingTime,
    }));
  }
}
