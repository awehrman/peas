/**
 * Note Processing Provider Interface
 * Defines the contract for processing notes during import
 */

export interface ProcessedNote {
  id: string;
  originalId: string;
  title: string;
  content: string;
  ingredients: ProcessedIngredient[];
  instructions: ProcessedInstruction[];
  metadata: {
    source: string;
    parseTime: number;
    confidence: number;
    language: string;
    tags: string[];
    difficulty?: string;
    prepTime?: string;
    cookTime?: string;
    servings?: number;
    [key: string]: unknown;
  };
  createdAt: string;
  context?: NoteProcessingContext;
}

export interface ProcessedIngredient {
  id: string;
  name: string;
  amount: number;
  unit: string;
  notes?: string;
  category?: string;
  alternatives?: string[];
}

export interface ProcessedInstruction {
  id: string;
  order: number;
  step: string;
  time?: string;
  temperature?: string;
  notes?: string;
}

export interface NoteProcessingContext {
  featureName: string;
  operation: string;
  userId?: string;
  sessionId: string;
  importId: string;
  fileId?: string;
  metadata?: Record<string, unknown>;
}

export interface ProcessingOptions {
  language?: string;
  confidenceThreshold?: number;
  enableAutoCorrection?: boolean;
  enableTagging?: boolean;
  enableDifficultyDetection?: boolean;
  customMetadata?: Record<string, unknown>;
  context?: Partial<NoteProcessingContext>;
}

export interface ProcessingResult {
  note: ProcessedNote;
  processingTime: number;
  confidence: number;
  warnings: string[];
  errors: string[];
  suggestions: {
    title?: string;
    ingredients?: Array<{
      original: string;
      suggestion: string;
      confidence: number;
    }>;
    instructions?: Array<{
      original: string;
      suggestion: string;
      confidence: number;
    }>;
  };
  metadata?: Record<string, unknown>;
}

export interface NoteProcessorProvider {
  /**
   * Process a single note
   */
  processNote(
    content: string,
    options?: ProcessingOptions
  ): Promise<ProcessingResult>;

  /**
   * Process multiple notes in batch
   */
  processNotes(
    contents: string[],
    options?: ProcessingOptions
  ): Promise<ProcessingResult[]>;

  /**
   * Validate processed note structure
   */
  validateNote(
    note: ProcessedNote
  ): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }>;

  /**
   * Enhance note with additional metadata
   */
  enhanceNote(
    note: ProcessedNote,
    enhancements: {
      addTags?: boolean;
      detectDifficulty?: boolean;
      suggestAlternatives?: boolean;
      validateIngredients?: boolean;
    }
  ): Promise<ProcessedNote>;

  /**
   * Extract ingredients from text
   */
  extractIngredients(
    text: string,
    options?: { confidenceThreshold?: number }
  ): Promise<ProcessedIngredient[]>;

  /**
   * Extract instructions from text
   */
  extractInstructions(
    text: string,
    options?: { confidenceThreshold?: number }
  ): Promise<ProcessedInstruction[]>;

  /**
   * Get processing statistics
   */
  getProcessingStats(
    importId?: string,
    timeRange?: { since: Date; until: Date }
  ): Promise<{
    totalNotes: number;
    successfulProcessings: number;
    failedProcessings: number;
    averageProcessingTime: number;
    averageConfidence: number;
    processingErrors: Record<string, number>;
    languageDistribution: Record<string, number>;
  }>;
}

export interface NoteProcessorProviderConfig {
  defaultLanguage: string;
  supportedLanguages: string[];
  confidenceThreshold: number;
  maxProcessingTime: number; // milliseconds
  enableBatchProcessing: boolean;
  batchSize: number;
  enableCaching: boolean;
  cacheExpiry: number; // seconds
  enableMetrics: boolean;
}
