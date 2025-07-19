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

    // Handle the parser output structure with proper type guards
    if (
      parserOutput &&
      typeof parserOutput === "object" &&
      parserOutput !== null &&
      "parsed" in parserOutput &&
      Array.isArray((parserOutput as { parsed: unknown }).parsed)
    ) {
      const parsed = (parserOutput as { parsed: unknown[] }).parsed;
      for (const parsedItem of parsed) {
        if (
          parsedItem &&
          typeof parsedItem === "object" &&
          "values" in parsedItem &&
          Array.isArray((parsedItem as { values: unknown }).values)
        ) {
          const values = (parsedItem as { values: unknown[] }).values;
          for (const value of values) {
            if (value && typeof value === "object" && value !== null) {
              const valueObj = value as Record<string, unknown>;
              segments.push({
                index: index++,
                rule: (valueObj.rule as string) || "unknown",
                type: (valueObj.type as string) || "unknown",
                value: Array.isArray(valueObj.values)
                  ? (valueObj.values as string[]).join(" ")
                  : String(valueObj.values || ""),
              });
            }
          }
        }
      }
    }

    return segments;
  }
}
