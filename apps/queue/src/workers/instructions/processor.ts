import { InstructionLine, ProcessingResult } from "./types";

export class InstructionProcessor {
  static async parseInstructionLine(
    line: InstructionLine
  ): Promise<"CORRECT" | "ERROR"> {
    try {
      // For now, just mark as CORRECT (no parser yet)
      // In the future, this would call an instruction parser
      await Promise.resolve(); // Placeholder for future parser
      return "CORRECT";
    } catch (error) {
      console.error(
        `❌ Failed to parse instruction: ${line.originalText}`,
        error
      );
      return "ERROR";
    }
  }

  static async processInstructionLines(
    lines: InstructionLine[]
  ): Promise<ProcessingResult> {
    let errorCount = 0;
    const total = lines.length;

    for (const line of lines) {
      const parseStatus = await this.parseInstructionLine(line);
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
    return `...[${percentage}%] Processed ${current} of ${total} instruction lines.`;
  }

  static getCompletionMessage(result: ProcessingResult): string {
    if (result.errorCount > 0) {
      return `Finished instruction parsing with ${result.errorCount} errors`;
    }
    return "Instruction parsing completed successfully";
  }
}
