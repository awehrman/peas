import type { BaseWorkerDependencies, BaseJobData } from "../types";

// Categorization Worker Dependencies
export interface CategorizationWorkerDependencies
  extends BaseWorkerDependencies {
  categorizer: {
    categorizeRecipe: (
      data: CategorizationInput
    ) => Promise<CategorizationResult>;
  };
  database: {
    updateNoteCategories: (
      noteId: string,
      categories: string[]
    ) => Promise<unknown>;
    updateNoteTags: (noteId: string, tags: string[]) => Promise<unknown>;
  };
}

// Categorization Job Data
export interface CategorizationJobData extends BaseJobData {
  noteId: string;
  title?: string;
  content: string;
  ingredients?: string[];
  instructions?: string[];
  options?: {
    confidenceThreshold?: number;
    maxCategories?: number;
    maxTags?: number;
  };
}

// Categorization Input
export interface CategorizationInput {
  title?: string;
  content: string;
  ingredients?: string[];
  instructions?: string[];
}

// Categorization Result
export interface CategorizationResult {
  success: boolean;
  categories: string[];
  tags: string[];
  confidence: number;
  errorMessage?: string;
  processingTime: number;
  metadata?: Record<string, unknown>;
}
