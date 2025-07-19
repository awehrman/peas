import { BaseAction } from "../../core/base-action";
import { ActionContext } from "../../core/types";
import type { IngredientWorkerDependencies } from "../types";
import { broadcastParsingError } from "../../shared/error-broadcasting";

export interface ProcessIngredientLineInput {
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

export interface ProcessIngredientLineOutput {
  // Pass through original input fields
  noteId: string;
  ingredientLineId: string;
  reference: string;
  blockIndex: number;
  lineIndex: number;
  // Tracking information from job data
  importId?: string;
  currentIngredientIndex?: number;
  totalIngredients?: number;
  // Processing results
  success: boolean;
  parseStatus: "CORRECT" | "INCORRECT" | "ERROR";
  parsedSegments?: Array<{
    index: number;
    rule: string;
    type: string;
    value: string;
    processingTime?: number;
  }>;
  errorMessage?: string;
  processingTime?: number;
}

export class ProcessIngredientLineAction extends BaseAction<
  ProcessIngredientLineInput,
  IngredientWorkerDependencies
> {
  name = "process_ingredient_line";

  async execute(
    input: ProcessIngredientLineInput,
    deps: IngredientWorkerDependencies,
    _context: ActionContext
  ): Promise<ProcessIngredientLineOutput> {
    try {
      const { noteId, ingredientLineId, reference, blockIndex, lineIndex } =
        input;

      // Stub implementation for now
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

      // Use the actual parser from dependencies
      const parseResult = await deps.parseIngredient(reference);

      deps.logger?.log(
        `[PROCESS_INGREDIENT_LINE] Parser result for "${reference}": ${JSON.stringify(parseResult, null, 2)}`
      );

      // If parsing failed, broadcast the error
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

      const result: ProcessIngredientLineOutput = {
        // Pass through original input fields
        noteId,
        ingredientLineId,
        reference,
        blockIndex,
        lineIndex,
        // Tracking information from job data
        importId: input.importId,
        currentIngredientIndex: input.currentIngredientIndex,
        totalIngredients: input.totalIngredients,

        // Processing results
        success: parseResult.success,
        parseStatus: parseResult.parseStatus,
        parsedSegments: parseResult.success
          ? this.convertParserOutputToSegments(
              parseResult,
              parseResult.processingTime
            )
          : undefined,
        errorMessage: parseResult.errorMessage,
        processingTime: parseResult.processingTime,
      };

      return result;
    } catch (error) {
      // Broadcast processing error
      await broadcastParsingError(deps, {
        importId: input.importId,
        noteId: input.noteId,
        lineId: input.ingredientLineId,
        reference: input.reference,
        errorMessage: `Processing error: ${(error as Error).message}`,
        context: "parse_html_ingredients",
      });

      // Return error result
      return {
        // Pass through original input fields
        noteId: input.noteId,
        ingredientLineId: input.ingredientLineId,
        reference: input.reference,
        blockIndex: input.blockIndex,
        lineIndex: input.lineIndex,
        // Tracking information from job data
        importId: input.importId,
        currentIngredientIndex: input.currentIngredientIndex,
        totalIngredients: input.totalIngredients,

        // Error results
        success: false,
        parseStatus: "ERROR",
        errorMessage: (error as Error).message,
      };
    }
  }

  private convertParserOutputToSegments(
    parserOutput: unknown,
    totalProcessingTime: number
  ): Array<{
    index: number;
    rule: string;
    type: string;
    value: string;
    processingTime?: number;
  }> {
    const segments: Array<{
      index: number;
      rule: string;
      type: string;
      value: string;
      processingTime?: number;
    }> = [];
    let index = 0;

    // Handle the new parser output structure (with 'segments' property)
    if (
      parserOutput &&
      typeof parserOutput === "object" &&
      parserOutput !== null &&
      "segments" in parserOutput &&
      Array.isArray((parserOutput as { segments: unknown }).segments)
    ) {
      const segmentsArray = (parserOutput as { segments: unknown[] }).segments;
      for (const segment of segmentsArray) {
        if (
          segment &&
          typeof segment === "object" &&
          "rule" in segment &&
          "type" in segment &&
          "value" in segment
        ) {
          segments.push({
            index,
            rule: String(segment.rule),
            type: String(segment.type),
            value: String(segment.value),
            processingTime: totalProcessingTime,
          });
          index++;
        }
      }
    }
    // Handle the old parser output structure (with 'values' property)
    else if (
      parserOutput &&
      typeof parserOutput === "object" &&
      parserOutput !== null &&
      "values" in parserOutput &&
      Array.isArray((parserOutput as { values: unknown }).values)
    ) {
      const valuesArray = (parserOutput as { values: unknown[] }).values;
      for (const value of valuesArray) {
        if (
          value &&
          typeof value === "object" &&
          "rule" in value &&
          "type" in value &&
          "value" in value
        ) {
          segments.push({
            index,
            rule: String(value.rule),
            type: String(value.type),
            value: String(value.value),
            processingTime: totalProcessingTime,
          });
          index++;
        }
      }
    }

    return segments;
  }
}
