import type { NoteJobData } from "../../services/actions/note/types";
import type { ParsedHTMLFile } from "../../types";
import type { BaseAction } from "../core/base-action";
import type { StructuredLogger } from "../core/types";
import type { LogLevel } from "../core/types";
import type {
  BaseWorkerDependencies,
  DatabaseCreateResult,
  DatabaseOperationResult,
  DatabaseUpdateResult,
  ErrorContext,
  StatusEvent,
} from "../types";

// ============================================================================
// NOTE WORKER TYPES
// ============================================================================

/**
 * Dependencies required by the NoteWorker, including HTML parsing and database methods.
 */
export interface NoteWorkerDependencies extends BaseWorkerDependencies {
  /** HTML parsing utilities */
  htmlParser: {
    /**
     * Parse HTML content and extract structured data.
     */
    parseHtml: (data: NoteJobData) => Promise<{
      success: boolean;
      parsedData?: {
        title?: string;
        ingredients?: string[];
        instructions?: string[];
        images?: string[];
        metadata?: Record<string, unknown>;
      };
      errorMessage?: string;
      processingTime: number;
    }>;
  };
  /** Database operations for notes */
  database: {
    /**
     * Create a new note in the database.
     */
    createNote: (
      data: Record<string, unknown>
    ) => Promise<DatabaseCreateResult>;
    /**
     * Update an existing note in the database.
     */
    updateNote: (
      noteId: string,
      data: Record<string, unknown>
    ) => Promise<DatabaseUpdateResult>;
    /**
     * Save note metadata.
     */
    saveNoteMetadata: (
      noteId: string,
      metadata: Record<string, unknown>
    ) => Promise<DatabaseOperationResult>;
  };
  /** Status event broadcaster */
  addStatusEventAndBroadcast: (event: StatusEvent) => Promise<void>;
  /** Structured logger for all logging */
  logger: StructuredLogger;
}

/**
 * Note with parsed lines
 * The complete note structure including parsed ingredient and instruction lines
 */
export interface NoteWithParsedLines extends Note {
  /** Parsed ingredient lines extracted from the note */
  parsedIngredientLines: Array<{
    /** Unique identifier for the ingredient line */
    id: string;
    /** Original text of the ingredient line */
    reference: string;
    /** Index of the block containing this ingredient */
    blockIndex: number;
    /** Index of the line within the block */
    lineIndex: number;
  }>;
  /** Parsed instruction lines extracted from the note */
  parsedInstructionLines: Array<{
    /** Unique identifier for the instruction line */
    id: string;
    /** Original text of the instruction line */
    originalText: string;
    /** Index of the line within the instructions */
    lineIndex: number;
  }>;
}

/**
 * Basic Note interface
 * Core note structure without parsed lines
 */
export interface Note {
  /** Unique identifier for the note */
  id: string;
  /** Title of the note */
  title: string | null;
  /** Full content of the note */
  content: string;
  /** When the note was created */
  createdAt: Date;
  /** When the note was last updated */
  updatedAt: Date;
}

// ============================================================================
// ACTION-SPECIFIC TYPES
// ============================================================================

/**
 * Schedule Categorization Action Dependencies
 */
export interface ScheduleCategorizationDeps {
  categorizationQueue: {
    add: (name: string, data: Record<string, unknown>) => Promise<unknown>;
  };
}

/**
 * Schedule Images Action Dependencies
 */
export interface ScheduleImagesDeps {
  imageQueue: {
    add: (name: string, data: Record<string, unknown>) => Promise<unknown>;
  };
}

/**
 * Schedule Ingredients Action Dependencies
 */
export interface ScheduleIngredientsDeps {
  ingredientQueue: {
    add: (name: string, data: Record<string, unknown>) => Promise<unknown>;
  };
  logger: {
    log: (message: string, level?: LogLevel) => void;
  };
}

/**
 * Schedule Instructions Action Dependencies
 */
export interface ScheduleInstructionsDeps {
  instructionQueue: {
    add: (name: string, data: Record<string, unknown>) => Promise<unknown>;
  };
  logger: {
    log: (message: string, level?: LogLevel) => void;
  };
}

/**
 * Schedule Source Action Dependencies
 */
export interface ScheduleSourceDeps {
  sourceQueue: {
    add: (name: string, data: Record<string, unknown>) => Promise<unknown>;
  };
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Status event for tracking note processing progress
 */

/**
 * Generic pipeline configuration with validation
 */
export interface PipelineConfig {
  /** Whether to enable retry logic */
  retry?: boolean;
  /** Maximum number of retry attempts */
  maxRetries?: number;
  /** Whether to enable error handling */
  errorHandling?: boolean;
  /** Whether to enable logging */
  logging?: boolean;
  /** Pipeline validation */
  validation?: {
    /** Whether to validate input data */
    input?: boolean;
    /** Whether to validate output data */
    output?: boolean;
    /** Custom validation function */
    custom?: (data: unknown) => boolean;
  };
}

/**
 * Generic pipeline type for type safety
 */
export type ActionPipeline = Array<unknown>;

// ============================================================================
// JOB RESULT TYPES
// ============================================================================

/**
 * Result of a successful job execution
 */
export interface JobResult<T = unknown> {
  success: true;
  data: T;
  duration: number;
  jobId: string;
}

/**
 * Result of a failed job execution
 */
export interface JobError {
  success: false;
  error: Error;
  duration: number;
  jobId: string;
  context: ErrorContext;
}

/**
 * Union type for job results
 */
export type JobResultOrError<T = unknown> = JobResult<T> | JobError;

// ============================================================================
// QUEUE JOB TYPES
// ============================================================================

/**
 * Type for queue job data with proper typing
 */
export interface QueueJobData<T = unknown> {
  data: T;
  id: string;
  name: string;
  opts: Record<string, unknown>;
  progress: number;
  delay: number;
  timestamp: number;
  attemptsMade: number;
  failedReason?: string;
  stacktrace?: string[];
  returnvalue?: unknown;
  processedOn?: number;
  finishedOn?: number;
}

/**
 * Type for queue job options
 */
export interface QueueJobOptions {
  priority?: number;
  delay?: number;
  attempts?: number;
  backoff?: {
    type: "exponential" | "fixed";
    delay: number;
  };
  removeOnComplete?: boolean | number;
  removeOnFail?: boolean | number;
  jobId?: string;
  timeout?: number;
}

// ============================================================================
// PIPELINE STAGE TYPES
// ============================================================================

/**
 * Stage 1: Initial job data (input to pipeline)
 */
export type NotePipelineStage1 = NoteJobData;

/**
 * Stage 2: After HTML parsing (NoteJobData + ParsedHTMLFile)
 */
export type NotePipelineStage2 = NoteJobData & {
  file: ParsedHTMLFile;
};

/**
 * Stage 3: After note creation (NoteJobData + ParsedHTMLFile + NoteWithParsedLines)
 */
export type NotePipelineStage3 = NoteJobData & {
  file: ParsedHTMLFile;
  note: NoteWithParsedLines;
};

/**
 * Stage 4: After status updates and scheduling (final output)
 */
export type NotePipelineStage4 = NoteJobData & {
  file: ParsedHTMLFile;
  note: NoteWithParsedLines;
  statusEvents: StatusEvent[];
  scheduledJobs: {
    source?: string;
    images?: string;
    ingredients?: string;
    instructions?: string;
  };
};

// ============================================================================
// ACTION RETURN TYPES
// ============================================================================

/**
 * Parse HTML action return type
 */
export type ParseHtmlActionReturn = NotePipelineStage2;

/**
 * Save Note action return type
 */
export type SaveNoteActionReturn = NotePipelineStage3;

/**
 * Status action return type
 */
export type StatusActionReturn = NotePipelineStage3;

/**
 * Schedule action return type
 */
export type ScheduleActionReturn = NotePipelineStage3;

/**
 * Note pipeline action type compatible with BaseWorker generics.
 */
export type NotePipelineAction = BaseAction<
  NoteJobData,
  NoteWorkerDependencies,
  unknown
>;

/**
 * (Legacy) Union type for all note pipeline action input/output combinations (for tests or migration)
 */
export type LegacyNotePipelineAction =
  | BaseAction<NotePipelineStage1, NotePipelineStage2>
  | BaseAction<NotePipelineStage2, NotePipelineStage3>
  | BaseAction<NotePipelineStage3, NotePipelineStage3>;

// Type-checking-only utility types
/**
 * Type-safe method to get the expected output type of the pipeline
 * Usage: type Output = GetExpectedOutputType<NotePipelineStage3>;
 */
export type GetExpectedOutputType = NotePipelineStage3;

/**
 * Get the current pipeline stage type for a given stage number
 * Usage: type StageType = GetPipelineStageType<2>;
 */
export type GetPipelineStageType<T extends 1 | 2 | 3 | 4> = T extends 1
  ? NotePipelineStage1
  : T extends 2
    ? NotePipelineStage2
    : T extends 3
      ? NotePipelineStage3
      : NotePipelineStage4;
