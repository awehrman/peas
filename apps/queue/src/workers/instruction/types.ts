import type { NoteStatus } from "@peas/database";

import type { BaseJobData, BaseWorkerDependencies } from "../types";

/**
 * Dependencies required by the InstructionWorker, including database methods for instruction processing.
 */
export interface InstructionWorkerDependencies extends BaseWorkerDependencies {
  database: {
    /**
     * Updates an instruction line in the database.
     */
    updateInstructionLine: (
      id: string,
      data: Record<string, unknown>
    ) => Promise<unknown>;
    /**
     * Creates instruction steps in the database.
     */
    createInstructionSteps: (
      steps: Array<Record<string, unknown>>
    ) => Promise<unknown>;
    /**
     * Updates the note completion tracker (optional).
     */
    updateNoteCompletionTracker?: (
      noteId: string,
      completedJobs: number
    ) => Promise<unknown>;
    /**
     * Increments the note completion tracker (optional).
     */
    incrementNoteCompletionTracker?: (noteId: string) => Promise<unknown>;
    /**
     * Checks if a note is complete (optional).
     */
    checkNoteCompletion?: (noteId: string) => Promise<{
      isComplete: boolean;
      completedJobs: number;
      totalJobs: number;
    }>;
    /**
     * Gets the title of a note (optional).
     */
    getNoteTitle?: (noteId: string) => Promise<string | null>;
  };
  addStatusEventAndBroadcast: (event: {
    importId: string;
    noteId?: string;
    status: NoteStatus;
    message?: string;
    context?: string;
    currentCount?: number;
    totalCount?: number;
    indentLevel?: number;
    metadata?: Record<string, unknown>;
  }) => Promise<unknown>;
}

/**
 * Data structure for jobs processed by the InstructionWorker.
 */
export interface InstructionJobData extends BaseJobData {
  instructionLineId: string;
  originalText: string;
  lineIndex: number;
  noteId: string;
  /**
   * Import ID for status updates (optional).
   */
  importId?: string;
  /**
   * Current instruction being processed (0-based, optional).
   */
  currentInstructionIndex?: number;
  /**
   * Total number of instructions to process (optional).
   */
  totalInstructions?: number;
  options?: {
    normalizeText?: boolean;
    extractTiming?: boolean;
  };
}

/**
 * Result of parsing an instruction line.
 */
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
  }>;
  errorMessage?: string;
  processingTime: number;
  metadata?: Record<string, unknown>;
}
