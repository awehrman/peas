// Action types for instruction worker actions

export interface ProcessInstructionLineInput {
  noteId: string;
  instructionLineId: string;
  originalText: string;
  lineIndex: number;
  // Tracking information from job data
  importId?: string;
  currentInstructionIndex?: number;
  totalInstructions?: number;
}

export interface ProcessInstructionLineOutput {
  // Pass through original input fields
  noteId: string;
  instructionLineId: string;
  originalText: string;
  lineIndex: number;
  // Tracking information from job data
  importId?: string;
  currentInstructionIndex?: number;
  totalInstructions?: number;
  // Processing results
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
  processingTime?: number;
}

export interface SaveInstructionLineInput extends ProcessInstructionLineOutput {
  noteId: string;
  instructionLineId: string;
  originalText: string;
  lineIndex: number;
  // Tracking information from job data
  importId?: string;
  currentInstructionIndex?: number;
  totalInstructions?: number;
}

export interface SaveInstructionLineOutput {
  success: boolean;
  stepsSaved: number;
  parseStatus: string;
  // Tracking information for completion broadcast
  importId?: string;
  noteId?: string;
  currentInstructionIndex?: number;
  totalInstructions?: number;
  instructionLineId?: string;
}

export interface CompletionStatusInput extends SaveInstructionLineOutput {
  // Additional fields for completion tracking
  importId?: string;
  currentInstructionIndex?: number;
  totalInstructions?: number;
}

export interface UpdateInstructionCountData {
  importId: string;
  noteId?: string;
  currentInstructionIndex: number;
  totalInstructions: number;
}

import type { InstructionWorkerDependencies } from "../types";
export interface UpdateInstructionCountDeps
  extends InstructionWorkerDependencies {
  database: InstructionWorkerDependencies["database"] & {
    incrementNoteCompletionTracker?: (noteId: string) => Promise<unknown>;
  };
}

export interface InstructionCompletedStatusDeps {
  addStatusEventAndBroadcast: (event: {
    importId: string;
    noteId?: string;
    status: string;
    message: string;
    context: string;
    indentLevel?: number;
    metadata?: Record<string, unknown>;
  }) => Promise<void>;
}

export interface InstructionCompletedStatusData {
  // Original job data
  noteId: string;
  instructionLineId: string;
  originalText: string;
  lineIndex: number;
  importId?: string;
  currentInstructionIndex?: number;
  totalInstructions?: number;
  options?: {
    normalizeText?: boolean;
    extractTiming?: boolean;
  };
  // Data from previous actions in pipeline
  parseStatus?: string;
  success?: boolean;
  stepsSaved?: number;
}
