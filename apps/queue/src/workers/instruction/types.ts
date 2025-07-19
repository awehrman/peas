import type { BaseWorkerDependencies, BaseJobData } from "../types";

// Instruction Worker Dependencies
export interface InstructionWorkerDependencies extends BaseWorkerDependencies {
  database: {
    updateInstructionLine: (
      id: string,
      data: Record<string, unknown>
    ) => Promise<unknown>;
    createInstructionSteps: (
      steps: Array<Record<string, unknown>>
    ) => Promise<unknown>;
  };
  parseInstruction: (text: string) => Promise<ParsedInstructionResult>;
}

// Instruction Job Data
export interface InstructionJobData extends BaseJobData {
  instructionLineId: string;
  originalText: string;
  lineIndex: number;
  noteId: string;
  importId?: string; // Add importId for status updates
  currentInstructionIndex?: number; // Current instruction being processed (0-based)
  totalInstructions?: number; // Total number of instructions to process
  options?: {
    normalizeText?: boolean;
    extractTiming?: boolean;
  };
}

// Parsed Instruction Result
export interface ParsedInstructionResult {
  success: boolean;
  parseStatus: "CORRECT" | "INCORRECT" | "ERROR";
  normalizedText: string;
  steps: Array<{
    index: number;
    action: string;
    target?: string;
    time?: string;
    temperature?: string;
    method?: string;
    confidence?: number;
  }>;
  errorMessage?: string;
  processingTime: number;
  metadata?: Record<string, unknown>;
}
