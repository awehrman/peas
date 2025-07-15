import { parse as Parser } from "@peas/parser";
import { IngredientLine, ProcessingResult } from "./types";

export class IngredientProcessor {
  static async parseIngredientLine(
    line: IngredientLine
  ): Promise<"CORRECT" | "ERROR"> {
    try {
      await Parser(line.reference, {});
      return "CORRECT";
    } catch (error) {
      console.error(`❌ Failed to parse ingredient: ${line.reference}`, error);
      return "ERROR";
    }
  }

  static async processIngredientLines(
    lines: IngredientLine[]
  ): Promise<ProcessingResult> {
    let errorCount = 0;
    const total = lines.length;

    for (const line of lines) {
      const parseStatus = await this.parseIngredientLine(line);
      if (parseStatus === "ERROR") {
        errorCount += 1;
      }
    }

    return {
      errorCount,
      total,
      successCount: total - errorCount,
    };
  }

  static getProgressMessage(current: number, total: number): string {
    const percentage = Math.round((current / total) * 100);
    return `...[${percentage}%] Processed ${current} of ${total} ingredient lines.`;
  }

  static getCompletionMessage(result: ProcessingResult): string {
    if (result.errorCount > 0) {
      return `Finished ingredient parsing with ${result.errorCount} errors`;
    }
    return "Ingredient parsing completed successfully";
  }
}
