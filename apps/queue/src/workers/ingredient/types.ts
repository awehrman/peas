import { Queue } from "bullmq";

import type { IDatabaseService } from "../../services";
import type {
  BaseJobData,
  BaseWorkerDependencies,
  StatusEvent,
} from "../types";

export interface IngredientWorkerDependencies extends BaseWorkerDependencies {
  [key: string]: unknown;
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

export const IngredientSegmentType = {
  Ingredient: "ingredient",
  Amount: "amount",
  Unit: "unit",
  Modifier: "modifier",
} as const;

// Parsed Ingredient Result
export interface ParsedIngredientResult {
  success: boolean;
  parseStatus: "CORRECT" | "INCORRECT" | "ERROR";
  segments: Array<{
    index: number;
    rule: string;
    type: (typeof IngredientSegmentType)[keyof typeof IngredientSegmentType];
    value: string;
    processingTime?: number; // Processing time in milliseconds
  }>;
  errorMessage?: string;
  processingTime: number;
  metadata?: Record<string, unknown>;
}

export type ParserSegment = {
  index: number;
  rule: string;
  type: (typeof IngredientSegmentType)[keyof typeof IngredientSegmentType];
  value?: string;
  values?: string[] | string;
  processingTime?: number;
};

export interface ProcessIngredientLineInput {
  noteId: string;
  ingredientLineId: string;
  reference: string;
  blockIndex: number;
  lineIndex: number;
  // Tracking information from job data
  importId?: string;
  currentIngredientIndex?: number;
  totalIngredients?: number;
}

export interface ProcessIngredientLineOutput {
  // Pass through original input fields
  noteId: string;
  ingredientLineId: string;
  reference: string;
  blockIndex: number;
  lineIndex: number;
  // Tracking information from job data
  importId?: string;
  currentIngredientIndex?: number;
  totalIngredients?: number;
  // Processing results
  success: boolean;
  parseStatus: "CORRECT" | "INCORRECT" | "ERROR";
  parsedSegments?: Array<{
    index: number;
    rule: string;
    type: (typeof IngredientSegmentType)[keyof typeof IngredientSegmentType];
    value: string;
    processingTime?: number;
  }>;
  errorMessage?: string;
  processingTime?: number;
}

export interface ProcessIngredientsInput {
  noteId: string;
  importId: string;
  ingredientLines: Array<{
    id: string;
    reference: string;
    blockIndex: number;
    lineIndex: number;
  }>;
}

export interface ProcessIngredientsOutput {
  success: boolean;
  processedCount: number;
  totalCount: number;
  errors: Array<{
    lineId: string;
    error: string;
  }>;
}

export interface SaveIngredientLineInput extends ProcessIngredientLineOutput {
  noteId: string;
  ingredientLineId: string;
  reference: string;
  blockIndex: number;
  lineIndex: number;
  // Tracking information from job data
  importId?: string;
  currentIngredientIndex?: number;
  totalIngredients?: number;
}

export interface SaveIngredientLineOutput {
  // Pass through original input fields needed by next actions
  noteId: string;
  ingredientLineId: string;
  reference: string;
  blockIndex: number;
  lineIndex: number;
  parsedSegments?: Array<{
    index: number;
    rule: string;
    type: string;
    value: string;
  }>;
  // Tracking information from job data
  importId?: string;
  currentIngredientIndex?: number;
  totalIngredients?: number;
  // Save operation results
  success: boolean;
  segmentsSaved: number;
  parseStatus: string;
}

export interface ScheduleCategorizationAfterCompletionDeps {
  categorizationQueue: {
    add: (name: string, data: Record<string, unknown>) => Promise<unknown>;
  };
  addStatusEventAndBroadcast: (event: StatusEvent) => Promise<unknown>;
  logger: { log: (message: string, level?: string) => void };
}

export interface ScheduleCategorizationAfterCompletionData {
  noteId: string;
  importId: string;
  title?: string;
  content: string;
}

export interface TrackPatternInput {
  noteId: string;
  ingredientLineId: string;
  reference: string; // The original ingredient line text
  parsedSegments?: Array<{
    index: number;
    rule: string;
    type: (typeof IngredientSegmentType)[keyof typeof IngredientSegmentType];
    value: string;
  }>;
  // Tracking information from job data
  importId?: string;
  currentIngredientIndex?: number;
  totalIngredients?: number;
}

export interface TrackPatternOutput extends TrackPatternInput {
  patternTracked: boolean;
}

export interface UpdateIngredientCountData {
  importId: string;
  noteId?: string;
  currentIngredientIndex: number;
  totalIngredients: number;
}

export interface UpdateIngredientCountDeps
  extends IngredientWorkerDependencies {
  database: IngredientWorkerDependencies["database"] & {
    incrementNoteCompletionTracker?: (noteId: string) => Promise<unknown>;
  };
}
