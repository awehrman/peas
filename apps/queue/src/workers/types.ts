import { Queue } from "bullmq";
import type { Note } from "@peas/database";
import type { ParsedHTMLFile } from "../types";

// ============================================================================
// CORE WORKER TYPES
// ============================================================================

/**
 * Base dependencies that all workers require
 */
export interface BaseWorkerDependencies {
  /** Status broadcasting function */
  addStatusEventAndBroadcast: (event: {
    noteId: string;
    status: string;
    message: string;
    context: string;
    currentCount?: number;
    totalCount?: number;
  }) => Promise<any>;

  /** Error handling utilities */
  ErrorHandler: {
    withErrorHandling: <T>(
      operation: () => Promise<T>,
      context: { jobId: string; operation: string; noteId?: string }
    ) => Promise<T>;
  };

  /** Logging interface */
  logger: {
    log: (message: string, level?: string) => void;
  };
}

/**
 * Base job data that all jobs should include
 */
export interface BaseJobData {
  /** Optional note ID for status tracking */
  noteId?: string;
  /** Job metadata */
  metadata?: Record<string, any>;
  /** Job creation timestamp */
  createdAt?: Date;
}

// ============================================================================
// WORKER-SPECIFIC TYPES
// ============================================================================

/**
 * Note Worker Types
 */
export interface NoteWorkerDependencies extends BaseWorkerDependencies {
  /** HTML parsing function */
  parseHTML: (content: string) => Promise<ParsedHTMLFile>;
  /** Database note creation function */
  createNote: (file: ParsedHTMLFile) => Promise<NoteWithParsedLines>;
  /** Queue instances for follow-up processing */
  ingredientQueue: Queue;
  instructionQueue: Queue;
  imageQueue: Queue;
  categorizationQueue: Queue;
}

export interface NoteJobData extends BaseJobData {
  /** HTML content to process */
  content: string;
  /** Optional source information */
  source?: {
    url?: string;
    filename?: string;
    contentType?: string;
  };
}

export interface NoteWithParsedLines extends Note {
  parsedIngredientLines: Array<{
    id: string;
    reference: string;
    blockIndex: number;
    lineIndex: number;
  }>;
  parsedInstructionLines: Array<{
    id: string;
    originalText: string;
    lineIndex: number;
  }>;
}

/**
 * Ingredient Worker Types
 */
export interface IngredientWorkerDependencies extends BaseWorkerDependencies {
  /** Database operations for ingredient lines */
  database: {
    updateIngredientLine: (id: string, data: any) => Promise<any>;
    createParsedSegments: (segments: any[]) => Promise<any>;
  };
  /** Parser for ingredient lines */
  parseIngredient: (text: string) => Promise<ParsedIngredientResult>;
}

export interface IngredientJobData extends BaseJobData {
  /** Ingredient line ID */
  ingredientLineId: string;
  /** Raw ingredient text */
  reference: string;
  /** Block index in the recipe */
  blockIndex: number;
  /** Line index within the block */
  lineIndex: number;
  /** Associated note ID */
  noteId: string;
}

export interface ParsedIngredientResult {
  success: boolean;
  parseStatus: "CORRECT" | "INCORRECT" | "ERROR";
  segments: Array<{
    index: number;
    rule: string;
    type: "amount" | "unit" | "ingredient" | "modifier";
    value: string;
  }>;
  errorMessage?: string;
  processingTime: number;
}

/**
 * Instruction Worker Types
 */
export interface InstructionWorkerDependencies extends BaseWorkerDependencies {
  /** Database operations for instruction lines */
  database: {
    updateInstructionLine: (id: string, data: any) => Promise<any>;
    createInstructionSteps: (steps: any[]) => Promise<any>;
  };
  /** Parser for instruction lines */
  parseInstruction: (text: string) => Promise<ParsedInstructionResult>;
}

export interface InstructionJobData extends BaseJobData {
  /** Instruction line ID */
  instructionLineId: string;
  /** Raw instruction text */
  originalText: string;
  /** Line index in the recipe */
  lineIndex: number;
  /** Associated note ID */
  noteId: string;
}

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
}

/**
 * Image Worker Types
 */
export interface ImageWorkerDependencies extends BaseWorkerDependencies {
  /** Image processing utilities */
  imageProcessor: {
    processImage: (data: ImageData) => Promise<ProcessedImageResult>;
    saveImage: (result: ProcessedImageResult) => Promise<string>;
  };
  /** Database operations for images */
  database: {
    updateNoteImage: (noteId: string, imageUrl: string) => Promise<any>;
  };
}

export interface ImageJobData extends BaseJobData {
  /** Associated note ID */
  noteId: string;
  /** Image URL */
  imageUrl?: string;
  /** Base64 encoded image data */
  imageData?: string;
  /** MIME type */
  imageType?: string;
  /** Original filename */
  fileName?: string;
}

export interface ImageData {
  url?: string;
  data?: string;
  type?: string;
  fileName?: string;
}

export interface ProcessedImageResult {
  success: boolean;
  processedUrl: string;
  metadata: {
    width: number;
    height: number;
    format: string;
    size: number;
  };
  errorMessage?: string;
  processingTime: number;
}

/**
 * Categorization Worker Types
 */
export interface CategorizationWorkerDependencies
  extends BaseWorkerDependencies {
  /** Categorization service */
  categorizer: {
    categorizeRecipe: (
      data: CategorizationInput
    ) => Promise<CategorizationResult>;
  };
  /** Database operations for categories */
  database: {
    updateNoteCategories: (
      noteId: string,
      categories: string[]
    ) => Promise<any>;
    updateNoteTags: (noteId: string, tags: string[]) => Promise<any>;
  };
}

export interface CategorizationJobData extends BaseJobData {
  /** Associated note ID */
  noteId: string;
  /** Recipe title */
  title?: string;
  /** Recipe content */
  content: string;
  /** Extracted ingredients */
  ingredients?: string[];
  /** Extracted instructions */
  instructions?: string[];
}

export interface CategorizationInput {
  title?: string;
  content: string;
  ingredients?: string[];
  instructions?: string[];
}

export interface CategorizationResult {
  success: boolean;
  categories: string[];
  tags: string[];
  confidence: number;
  errorMessage?: string;
  processingTime: number;
}

/**
 * Source Worker Types
 */
export interface SourceWorkerDependencies extends BaseWorkerDependencies {
  /** Source processing utilities */
  sourceProcessor: {
    processSource: (data: any) => Promise<any>;
  };
  /** Database operations for sources */
  database: {
    saveSource: (data: any) => Promise<any>;
  };
}

export interface SourceJobData extends BaseJobData {
  /** Source title */
  title?: string;
  /** Source content */
  content?: string;
  /** Source ID */
  sourceId?: string;
  /** Processed source data */
  source?: any;
}

// ============================================================================
// ACTION TYPES
// ============================================================================

/**
 * Generic action input/output types
 */
export interface ActionInput<TData = any> {
  data: TData;
  context: ActionContext;
}

export interface ActionOutput<TResult = any> {
  success: boolean;
  result?: TResult;
  error?: Error;
  metadata?: Record<string, any>;
}

/**
 * Typed action interface
 */
export interface TypedAction<TInput, TOutput, TDeps = any> {
  name: string;
  execute: (
    input: TInput,
    deps: TDeps,
    context: ActionContext
  ) => Promise<TOutput>;
  validate?: (input: TInput) => Error | null;
  retryable?: boolean;
  priority?: number;
}

/**
 * Action context with enhanced typing
 */
export interface ActionContext {
  jobId: string;
  retryCount: number;
  queueName: string;
  noteId?: string;
  operation: string;
  startTime: number;
  workerName: string;
  attemptNumber: number;
}

// ============================================================================
// WORKER FACTORY TYPES
// ============================================================================

/**
 * Worker factory function signature
 */
export type WorkerFactory = (queue: Queue, container: any) => any;

/**
 * Worker configuration
 */
export interface WorkerConfig {
  concurrency?: number;
  retryAttempts?: number;
  backoffMs?: number;
  maxBackoffMs?: number;
  timeoutMs?: number;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Type guard for checking if data has required properties
 */
export type HasRequired<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Make specific properties optional
 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Make specific properties required (renamed to avoid conflict with built-in Required)
 */
export type MakeRequired<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Worker type mapping for easy lookup
 */
export type WorkerTypes = {
  note: {
    data: NoteJobData;
    deps: NoteWorkerDependencies;
    result: NoteWithParsedLines;
  };
  ingredient: {
    data: IngredientJobData;
    deps: IngredientWorkerDependencies;
    result: ParsedIngredientResult;
  };
  instruction: {
    data: InstructionJobData;
    deps: InstructionWorkerDependencies;
    result: ParsedInstructionResult;
  };
  image: {
    data: ImageJobData;
    deps: ImageWorkerDependencies;
    result: ProcessedImageResult;
  };
  categorization: {
    data: CategorizationJobData;
    deps: CategorizationWorkerDependencies;
    result: CategorizationResult;
  };
  source: {
    data: SourceJobData;
    deps: SourceWorkerDependencies;
    result: any;
  };
};

/**
 * Get worker data type by name
 */
export type WorkerData<T extends keyof WorkerTypes> = WorkerTypes[T]["data"];

/**
 * Get worker dependencies type by name
 */
export type WorkerDeps<T extends keyof WorkerTypes> = WorkerTypes[T]["deps"];

/**
 * Get worker result type by name
 */
export type WorkerResult<T extends keyof WorkerTypes> =
  WorkerTypes[T]["result"];
