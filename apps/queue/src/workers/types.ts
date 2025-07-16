import { Queue } from "bullmq";
import type { Note } from "@peas/database";
import type { ParsedHTMLFile } from "../types";
import type { IServiceContainer } from "../services/container";
import type { BaseWorker } from "./core/base-worker";
import type { BaseAction } from "./actions/core/base-action";
import type { ActionContext as CoreActionContext } from "./actions/core/types";

// ============================================================================
// UNIFIED ACTION CONTEXT
// ============================================================================

/**
 * Extended ActionContext that includes worker-specific fields
 * This extends the core ActionContext from actions/core/types.ts
 */
export interface ActionContext extends CoreActionContext {
  /** Worker name for better logging and metrics */
  workerName: string;
  /** Current attempt number (1-based) */
  attemptNumber: number;
}

// ============================================================================
// ACTION PIPELINE TYPES
// ============================================================================

/**
 * Generic action pipeline type that maintains type safety through the pipeline
 * TInput: Input type for the first action
 * TOutput: Output type of the last action
 * TIntermediate: Intermediate types (for complex pipelines)
 */
export type ActionPipeline<
  TInput,
  TOutput,
  TIntermediate = TInput,
> = BaseAction<TInput | TIntermediate, TOutput | TIntermediate>[];

/**
 * Generic action pipeline builder type with better type safety
 */
export type ActionPipelineBuilder<TInput, TOutput, TDeps = unknown> = (
  data: TInput,
  context: ActionContext,
  deps: TDeps
) => ActionPipeline<TInput, TOutput>;

/**
 * Type-safe action wrapper that preserves input/output types
 */
export type ActionWrapper<TInput, TOutput> = (
  action: BaseAction<TInput, TOutput>
) => BaseAction<TInput, TOutput>;

/**
 * Generic action factory type with better type constraints
 */
export type ActionFactory<TDeps = unknown> = {
  create<TInput, TOutput>(
    actionName: string,
    deps?: TDeps
  ): BaseAction<TInput, TOutput>;
  register<TInput, TOutput>(
    actionName: string,
    factory: (deps?: TDeps) => BaseAction<TInput, TOutput>
  ): void;
  isRegistered(name: string): boolean;
  list(): string[];
};

// ============================================================================
// WORKER PIPELINE TYPES
// ============================================================================

/**
 * Generic worker pipeline type with better type safety
 */
export type WorkerPipeline<TInput, TOutput, TDeps = unknown> = {
  /** Build the action pipeline */
  build: ActionPipelineBuilder<TInput, TOutput, TDeps>;
  /** Validate the pipeline configuration */
  validate?: (config: PipelineConfig<TDeps>) => Error | null;
};

/**
 * Generic pipeline step type with better type safety
 */
export type PipelineStep<TInput, TOutput, TDeps> =
  | BaseAction<TInput, TOutput>
  | ((deps: TDeps) => BaseAction<TInput, TOutput>)
  | string; // Action name for factory-based creation

/**
 * Generic pipeline configuration with validation
 */
export interface PipelineConfig<TDeps = unknown> {
  /** Pipeline steps */
  steps: PipelineStep<unknown, unknown, TDeps>[];
  /** Whether to add status actions */
  addStatusActions?: boolean;
  /** Whether to wrap actions with retry logic */
  useRetry?: boolean;
  /** Whether to wrap actions with error handling */
  useErrorHandling?: boolean;
  /** Custom action wrapper */
  customWrapper?: ActionWrapper<unknown, unknown>;
  /** Pipeline validation */
  validation?: {
    input?: (data: unknown) => Error | null;
    output?: (result: unknown) => Error | null;
  };
}

// ============================================================================
// CORE WORKER TYPES
// ============================================================================

/**
 * Base dependencies that all workers require
 */
export interface BaseWorkerDependencies {
  /** Status broadcasting function */
  addStatusEventAndBroadcast: (event: StatusEvent) => Promise<unknown>;
  /** Error handling utilities */
  ErrorHandler: {
    withErrorHandling: <T>(
      operation: () => Promise<T>,
      context: ErrorContext
    ) => Promise<T>;
  };
  /** Logging interface */
  logger: {
    log: (message: string, level?: LogLevel) => void;
  };
}

/**
 * Status event type for better type safety
 */
export interface StatusEvent {
  noteId: string;
  status: string;
  message: string;
  context: string;
  currentCount?: number;
  totalCount?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Error context type for better type safety
 */
export interface ErrorContext {
  jobId: string;
  operation: string;
  noteId?: string;
  workerName?: string;
  attemptNumber?: number;
}

/**
 * Log level type for better type safety
 */
export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

/**
 * Base job data that all jobs should include
 */
export interface BaseJobData {
  /** Optional note ID for status tracking */
  noteId?: string;
  /** Job metadata */
  metadata?: Record<string, unknown>;
  /** Job creation timestamp */
  createdAt?: Date;
  /** Job priority */
  priority?: number;
  /** Job timeout in milliseconds */
  timeout?: number;
}

// ============================================================================
// WORKER-SPECIFIC TYPES
// ============================================================================

/**
 * Note Worker Types with better type safety
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
  sourceQueue: Queue;
}

export interface NoteJobData extends BaseJobData {
  /** HTML content to process */
  content: string;
  /** Optional source information */
  source?: {
    url?: string;
    filename?: string;
    contentType?: string;
    metadata?: Record<string, unknown>;
  };
  /** Processing options */
  options?: {
    skipParsing?: boolean;
    skipCategorization?: boolean;
    skipImageProcessing?: boolean;
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
 * Ingredient Worker Types with better type safety
 */
export interface IngredientWorkerDependencies extends BaseWorkerDependencies {
  /** Database operations for ingredient lines */
  database: {
    updateIngredientLine: (
      id: string,
      data: Record<string, unknown>
    ) => Promise<unknown>;
    createParsedSegments: (
      segments: Array<Record<string, unknown>>
    ) => Promise<unknown>;
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
  /** Parsing options */
  options?: {
    strictMode?: boolean;
    allowPartial?: boolean;
  };
}

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

/**
 * Instruction Worker Types with better type safety
 */
export interface InstructionWorkerDependencies extends BaseWorkerDependencies {
  /** Database operations for instruction lines */
  database: {
    updateInstructionLine: (
      id: string,
      data: Record<string, unknown>
    ) => Promise<unknown>;
    createInstructionSteps: (
      steps: Array<Record<string, unknown>>
    ) => Promise<unknown>;
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
  /** Parsing options */
  options?: {
    normalizeText?: boolean;
    extractTiming?: boolean;
  };
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
    confidence?: number;
  }>;
  errorMessage?: string;
  processingTime: number;
  metadata?: Record<string, unknown>;
}

/**
 * Image Worker Types with better type safety
 */
export interface ImageWorkerDependencies extends BaseWorkerDependencies {
  /** Image processing utilities */
  imageProcessor: {
    processImage: (data: ImageData) => Promise<ProcessedImageResult>;
    saveImage: (result: ProcessedImageResult) => Promise<string>;
  };
  /** Database operations for images */
  database: {
    updateNoteImage: (noteId: string, imageUrl: string) => Promise<unknown>;
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
  /** Processing options */
  options?: {
    resize?: {
      width?: number;
      height?: number;
      quality?: number;
    };
    format?: "jpeg" | "png" | "webp";
  };
}

export interface ImageData {
  noteId: string;
  url?: string;
  data?: string;
  type?: string;
  fileName?: string;
}

export interface ProcessedImageResult {
  success: boolean;
  processedUrl: string;
  imageMetadata: {
    width: number;
    height: number;
    format: string;
    size: number;
    originalSize?: number;
  };
  errorMessage?: string;
  processingTime: number;
  metadata?: Record<string, unknown>;
}

/**
 * Categorization Worker Types with better type safety
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
    ) => Promise<unknown>;
    updateNoteTags: (noteId: string, tags: string[]) => Promise<unknown>;
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
  /** Categorization options */
  options?: {
    confidenceThreshold?: number;
    maxCategories?: number;
    maxTags?: number;
  };
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
  metadata?: Record<string, unknown>;
}

/**
 * Source Worker Types with better type safety
 */
export interface SourceWorkerDependencies extends BaseWorkerDependencies {
  /** Source processing utilities */
  sourceProcessor: {
    processSource: (
      data: Record<string, unknown>
    ) => Promise<Record<string, unknown>>;
  };
  /** Database operations for sources */
  database: {
    saveSource: (data: Record<string, unknown>) => Promise<unknown>;
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
  source?: Record<string, unknown>;
}

// ============================================================================
// ACTION TYPES
// ============================================================================

export interface ActionInput<TData = unknown> {
  data: TData;
  context: ActionContext;
}

export interface ActionOutput<TResult = unknown> {
  success: boolean;
  result?: TResult;
  error?: Error;
  metadata?: Record<string, unknown>;
  duration?: number;
}

export interface TypedAction<TInput, TOutput, TDeps = unknown> {
  name: string;
  execute: (
    input: TInput,
    deps: TDeps,
    context: ActionContext
  ) => Promise<TOutput>;
  validate?: (input: TInput) => Error | null;
  retryable?: boolean;
  priority?: number;
  timeout?: number;
}

// ============================================================================
// FACTORY AND CONFIG TYPES
// ============================================================================

export type WorkerFactory = (
  queue: Queue,
  container: IServiceContainer
) => BaseWorker<BaseJobData, BaseWorkerDependencies>;

export interface WorkerConfig {
  concurrency?: number;
  retryAttempts?: number;
  backoffMs?: number;
  maxBackoffMs?: number;
  timeoutMs?: number;
  healthCheckInterval?: number;
  gracefulShutdownTimeout?: number;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type HasRequired<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type MakeRequired<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Type helper for creating partial types with required fields
 */
export type PartialWithRequired<T, K extends keyof T> = Partial<T> &
  Required<Pick<T, K>>;

/**
 * Type helper for creating union types with better type safety
 */
export type UnionToIntersection<U> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (U extends any ? (k: U) => void : never) extends (k: infer I) => void
    ? I
    : never;

/**
 * Type helper for extracting the return type of a function
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

// ============================================================================
// WORKER TYPE MAPPING
// ============================================================================

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
    result: Record<string, unknown>;
  };
};

// ============================================================================
// TYPE HELPERS
// ============================================================================

export type WorkerData<T extends keyof WorkerTypes> = WorkerTypes[T]["data"];

export type WorkerDeps<T extends keyof WorkerTypes> = WorkerTypes[T]["deps"];

export type WorkerResult<T extends keyof WorkerTypes> =
  WorkerTypes[T]["result"];

/**
 * Type helper for creating strongly-typed worker instances
 */
export type TypedWorker<T extends keyof WorkerTypes> = BaseWorker<
  WorkerData<T>,
  WorkerDeps<T>
>;

/**
 * Type helper for creating strongly-typed action pipelines
 */
export type TypedActionPipeline<T extends keyof WorkerTypes> = ActionPipeline<
  WorkerData<T>,
  WorkerResult<T>
>;

/**
 * Type helper for creating strongly-typed job data
 */
export type TypedJobData<T extends keyof WorkerTypes> = WorkerData<T> & {
  workerType: T;
  metadata?: Record<string, unknown>;
};

/**
 * Type helper for creating strongly-typed worker configurations
 */
export type TypedWorkerConfig<T extends keyof WorkerTypes> = WorkerConfig & {
  workerType: T;
  customConfig?: Record<string, unknown>;
};
