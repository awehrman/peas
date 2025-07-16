import { BaseAction } from "../../core/base-action";
import { ActionContext } from "../../core/types";

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
  any
> {
  name = "process-ingredient-line";

  async execute(
    input: ProcessIngredientLineInput,
    _deps: any,
    _context: ActionContext
  ): Promise<ProcessIngredientLineOutput> {
    try {
      const { noteId, ingredientLineId, reference, blockIndex, lineIndex } =
        input;

      // TODO: Implement actual ingredient parsing logic
      // This would typically involve:
      // 1. Using the parser grammar to parse the ingredient line
      // 2. Validating the parsed segments
      // 3. Extracting amounts, units, ingredients, etc.
      // 4. Normalizing ingredient names
      // 5. Storing parsed segments in the database

      // Stub implementation for now
      if (_deps.logger) {
        _deps.logger.log(
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

      // Simulate parsing
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Simple rule-based parsing for demo
      const parseStatus = this.simpleParse(reference);
      const parsedSegments =
        parseStatus === "CORRECT" ? this.extractSegments(reference) : undefined;

      const result: ProcessIngredientLineOutput = {
        success: parseStatus !== "ERROR",
        parseStatus,
        parsedSegments,
        processingTime: 50,
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

  private simpleParse(reference: string): "CORRECT" | "INCORRECT" | "ERROR" {
    // TODO: Replace with actual parser integration
    const trimmed = reference.trim();

    if (!trimmed) return "ERROR";

    // Simple validation - check if it contains common ingredient patterns
    const hasAmount = /\d+/.test(trimmed);
    const hasIngredient = /[a-zA-Z]{3,}/.test(trimmed);

    if (hasAmount && hasIngredient) {
      return "CORRECT";
    } else if (hasIngredient) {
      return "CORRECT"; // Some ingredients don't need amounts
    } else {
      return "INCORRECT";
    }
  }

  private extractSegments(reference: string) {
    // TODO: Replace with actual parser output
    const segments: Array<{
      index: number;
      rule: string;
      type: string;
      value: string;
    }> = [];
    let index = 0;

    // Extract amount
    const amountMatch = reference.match(/^(\d+(?:\/\d+)?(?:\s+\d+\/\d+)?)/);
    if (amountMatch && amountMatch[1]) {
      segments.push({
        index: index++,
        rule: "amount",
        type: "amount",
        value: amountMatch[1],
      });
    }

    // Extract unit
    const unitMatch = reference.match(
      /(cup|tablespoon|teaspoon|ounce|pound|gram|ml|g|tbsp|tsp|oz|lb)s?/i
    );
    if (unitMatch && unitMatch[1]) {
      segments.push({
        index: index++,
        rule: "unit",
        type: "unit",
        value: unitMatch[1].toLowerCase(),
      });
    }

    // Extract ingredient (everything after amount/unit)
    const ingredientMatch = reference.match(
      /(?:[\d/\s]+(?:cup|tablespoon|teaspoon|ounce|pound|gram|ml|g|tbsp|tsp|oz|lb)s?\s+)?(.+)/i
    );
    if (ingredientMatch && ingredientMatch[1]) {
      segments.push({
        index: index++,
        rule: "ingredient",
        type: "ingredient",
        value: ingredientMatch[1].trim(),
      });
    }

    return segments;
  }
}
