import { BaseAction } from "../../core/base-action";
import { ActionContext } from "../../core/types";
import type { InstructionWorkerDependencies } from "../types";

export interface ProcessInstructionLineInput {
  noteId: string;
  instructionLineId: string;
  originalText: string;
  lineIndex: number;
}

export interface ProcessInstructionLineOutput {
  success: boolean;
  parseStatus: "CORRECT" | "INCORRECT" | "ERROR";
  normalizedText?: string;
  steps?: Array<{
    stepNumber: number;
    action: string;
    duration?: string;
    temperature?: string;
  }>;
  errorMessage?: string;
  processingTime: number;
}

export class ProcessInstructionLineAction extends BaseAction<
  ProcessInstructionLineInput,
  InstructionWorkerDependencies
> {
  name = "process-instruction-line";

  async execute(
    input: ProcessInstructionLineInput,
    deps: InstructionWorkerDependencies,
    _context: ActionContext
  ): Promise<ProcessInstructionLineOutput> {
    try {
      const { noteId, instructionLineId, originalText, lineIndex } = input;

      // TODO: Implement actual instruction parsing logic
      // This would typically involve:
      // 1. Text normalization and cleaning
      // 2. Step extraction and numbering
      // 3. Action verb identification
      // 4. Time and temperature extraction
      // 5. Cooking method detection

      // Stub implementation for now
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

      // Simulate parsing
      await new Promise((resolve) => setTimeout(resolve, 30));

      // Simple text normalization for demo
      const normalizedText = this.normalizeText(originalText);
      const parseStatus = this.validateInstruction(originalText);
      const steps =
        parseStatus === "CORRECT" ? this.extractSteps(originalText) : undefined;

      const result: ProcessInstructionLineOutput = {
        success: parseStatus !== "ERROR",
        parseStatus,
        normalizedText,
        steps,
        processingTime: 30,
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

  private normalizeText(text: string): string {
    // TODO: Implement proper text normalization
    return text
      .trim()
      .replace(/\s+/g, " ") // Normalize whitespace
      .replace(/^\d+\.\s*/, "") // Remove step numbers
      .toLowerCase();
  }

  private validateInstruction(text: string): "CORRECT" | "INCORRECT" | "ERROR" {
    // TODO: Replace with actual validation logic
    const trimmed = text.trim();

    if (!trimmed) return "ERROR";

    // Simple validation - check if it contains cooking-related words
    const cookingWords = [
      "add",
      "mix",
      "stir",
      "cook",
      "bake",
      "fry",
      "grill",
      "boil",
      "simmer",
      "heat",
      "preheat",
      "combine",
      "pour",
      "spread",
      "sprinkle",
      "season",
    ];

    const hasCookingAction = cookingWords.some((word) =>
      trimmed.toLowerCase().includes(word)
    );

    if (hasCookingAction) {
      return "CORRECT";
    } else if (trimmed.length > 10) {
      return "CORRECT"; // Assume it's valid if it's long enough
    } else {
      return "INCORRECT";
    }
  }

  private extractSteps(text: string) {
    // TODO: Replace with actual step extraction logic
    const steps: Array<{
      stepNumber: number;
      action: string;
      duration?: string;
      temperature?: string;
    }> = [];

    // Simple step extraction for demo
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim());

    sentences.forEach((sentence, index) => {
      const trimmed = sentence.trim();
      if (trimmed) {
        const step: {
          stepNumber: number;
          action: string;
          duration?: string;
          temperature?: string;
        } = {
          stepNumber: index + 1,
          action: trimmed,
        };

        // Extract duration
        const durationMatch = trimmed.match(
          /(\d+)\s*(minutes?|mins?|hours?|hrs?)/i
        );
        if (durationMatch) {
          step.duration = `${durationMatch[1]} ${durationMatch[2]}`;
        }

        // Extract temperature
        const tempMatch = trimmed.match(/(\d+)\s*(degrees?|°|f|c)/i);
        if (tempMatch) {
          step.temperature = `${tempMatch[1]}°${tempMatch[3]?.toUpperCase() || "F"}`;
        }

        steps.push(step);
      }
    });

    return steps;
  }
}
