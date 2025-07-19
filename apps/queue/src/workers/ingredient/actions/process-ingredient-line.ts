import { BaseAction } from "../../core/base-action";
import { ActionContext } from "../../core/types";
import type { IngredientWorkerDependencies } from "../types";

export interface ProcessIngredientLineInput {
  noteId: string;
  ingredientLineId: string;
  reference: string;
  blockIndex: number;
  lineIndex: number;
}

export interface ProcessIngredientLineOutput {
  // Original input fields (needed by next action)
  noteId: string;
  ingredientLineId: string;
  reference: string;
  blockIndex: number;
  lineIndex: number;

  // Processing results
  success: boolean;
  parseStatus: "CORRECT" | "INCORRECT" | "ERROR";
  parsedSegments?: Array<{
    index: number;
    rule: string;
    type: string;
    value: string;
  }>;
  errorMessage?: string;
  processingTime: number;
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

      const result: ProcessIngredientLineOutput = {
        // Pass through original input fields
        noteId,
        ingredientLineId,
        reference,
        blockIndex,
        lineIndex,

        // Processing results
        success: parseResult.success,
        parseStatus: parseResult.parseStatus,
        parsedSegments:
          parseResult.success && parseResult.segments
            ? this.convertParserOutputToSegments(parseResult.segments)
            : undefined,
        errorMessage: parseResult.errorMessage,
        processingTime: parseResult.processingTime,
      };

      return result;
    } catch (error) {
      return {
        // Pass through original input fields (even on error)
        noteId: input.noteId,
        ingredientLineId: input.ingredientLineId,
        reference: input.reference,
        blockIndex: input.blockIndex,
        lineIndex: input.lineIndex,

        // Error results
        success: false,
        parseStatus: "ERROR",
        errorMessage: `Parsing failed: ${error}`,
        processingTime: 0,
      };
    }
  }

  private convertParserOutputToSegments(parserOutput: unknown): Array<{
    index: number;
    rule: string;
    type: string;
    value: string;
  }> {
    const segments: Array<{
      index: number;
      rule: string;
      type: string;
      value: string;
    }> = [];
    let index = 0;

    // Log the raw parser output for debugging
    console.log("Raw parser output:", JSON.stringify(parserOutput, null, 2));

    // Handle the actual parser output structure (based on test results)
    if (
      parserOutput &&
      typeof parserOutput === "object" &&
      parserOutput !== null &&
      "values" in parserOutput &&
      Array.isArray((parserOutput as { values: unknown }).values)
    ) {
      const values = (parserOutput as { values: unknown[] }).values;
      console.log("Values array:", JSON.stringify(values, null, 2));

      for (const value of values) {
        if (value && typeof value === "object" && value !== null) {
          const valueObj = value as Record<string, unknown>;
          console.log("Value object:", JSON.stringify(valueObj, null, 2));

          // Extract the segment value from the 'value' property
          const segmentValue =
            typeof valueObj.value === "string"
              ? valueObj.value
              : String(valueObj.value || "");

          // Only add segments with actual values
          if (segmentValue.trim()) {
            segments.push({
              index: index++,
              rule: (valueObj.rule as string) || "unknown",
              type: (valueObj.type as string) || "unknown",
              value: segmentValue.trim(),
            });

            console.log(`Created segment ${index - 1}:`, {
              rule: (valueObj.rule as string) || "unknown",
              type: (valueObj.type as string) || "unknown",
              value: segmentValue.trim(),
            });
          }
        }
      }
    }

    console.log("Final segments:", JSON.stringify(segments, null, 2));
    return segments;
  }
}
