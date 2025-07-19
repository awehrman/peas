import type { BaseWorkerDependencies, BaseJobData } from "../types";
import { Queue } from "bullmq";

// Ingredient Worker Dependencies
export interface IngredientWorkerDependencies extends BaseWorkerDependencies {
  database: {
    updateIngredientLine: (
      id: string,
      data: Record<string, unknown>
    ) => Promise<unknown>;
    createParsedSegments: (
      segments: Array<Record<string, unknown>>
    ) => Promise<unknown>;
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
    confidence?: number;
  }>;
  errorMessage?: string;
  processingTime: number;
  metadata?: Record<string, unknown>;
}
