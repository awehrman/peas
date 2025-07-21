import type { BaseWorkerDependencies, BaseJobData } from "../types";
import type { IDatabaseService } from "../../services";
import { Queue } from "bullmq";

export interface IngredientWorkerDependencies extends BaseWorkerDependencies {
  database: IDatabaseService & {
    updateNoteCompletionTracker?: (
      noteId: string,
      completedJobs: number
    ) => Promise<unknown>;
    incrementNoteCompletionTracker?: (noteId: string) => Promise<unknown>;
    checkNoteCompletion?: (noteId: string) => Promise<{
      isComplete: boolean;
      completedJobs: number;
      totalJobs: number;
    }>;
  };
  parseIngredient: (text: string) => Promise<ParsedIngredientResult>;
  categorizationQueue: Queue; // Add categorization queue for scheduling
}

// Ingredient Job Data
export interface IngredientJobData extends BaseJobData {
  ingredientLineId: string;
  reference: string;
  blockIndex: number;
  lineIndex: number;
  noteId: string;
  // Tracking information for progress display
  importId?: string;
  currentIngredientIndex?: number;
  totalIngredients?: number;
  options?: {
    strictMode?: boolean;
    allowPartial?: boolean;
  };
}

// Parsed Ingredient Result
export interface ParsedIngredientResult {
  success: boolean;
  parseStatus: "CORRECT" | "INCORRECT" | "ERROR";
  segments: Array<{
    index: number;
    rule: string;
    type: "amount" | "unit" | "ingredient" | "modifier";
    value: string;
    processingTime?: number; // Processing time in milliseconds
  }>;
  errorMessage?: string;
  processingTime: number;
  metadata?: Record<string, unknown>;
}
