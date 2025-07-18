import { Queue } from "bullmq";
import type { ParsedHTMLFile } from "../../types";
import type { NoteStatus } from "@peas/database";
import type { BaseAction } from "../core/base-action";
import type { ErrorContext } from "../types";

// ============================================================================
// NOTE WORKER TYPES
// ============================================================================

/**
 * Note Worker Dependencies
 * Contains all the functions and services required by the note worker
 */
export interface NoteWorkerDependencies {
  /** HTML parsing function that converts raw HTML to structured data */
  parseHTML: (content: string) => Promise<ParsedHTMLFile>;
  /** Database note creation function that persists parsed data */
  createNote: (file: ParsedHTMLFile) => Promise<NoteWithParsedLines>;
  /** Queue instances for follow-up processing */
  ingredientQueue: Queue;
  instructionQueue: Queue;
  imageQueue: Queue;
  categorizationQueue: Queue;
  sourceQueue: Queue;
  /** Base dependencies (from BaseWorkerDependencies) */
  addStatusEventAndBroadcast: (event: StatusEvent) => Promise<unknown>;
  ErrorHandler: {
    withErrorHandling: <T>(
      operation: () => Promise<T>,
      context: ErrorContext
    ) => Promise<T>;
  };
  logger: {
    log: (message: string, level?: LogLevel) => void;
  };
}

/**
 * Note Job Data
 * The input data structure for note processing jobs
 */
export interface NoteJobData {
  /** HTML content to process - required */
  content: string;
  /** Temporary ID for frontend grouping - required */
  importId: string;
  /** Optional note ID for status tracking and correlation */
  noteId?: string;
  /** Optional source information about where the content came from */
  source?: {
    /** URL where the content was originally found */
    url?: string;
    /** Original filename if from a file upload */
    filename?: string;
    /** MIME type of the original content */
    contentType?: string;
    /** Additional metadata about the source */
    metadata?: Record<string, unknown>;
  };
  /** Processing options to control what gets processed */
  options?: {
    /** Skip HTML parsing step */
    skipParsing?: boolean;
    /** Skip categorization processing */
    skipCategorization?: boolean;
    /** Skip image processing */
    skipImageProcessing?: boolean;
  };
  /** Job metadata for tracking and debugging */
  metadata?: Record<string, unknown>;
  /** Job creation timestamp */
  createdAt?: Date;
  /** Job priority (1-10, lower = higher priority) */
  priority?: number;
  /** Job timeout in milliseconds */
  timeout?: number;
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
  title: string;
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
}

/**
 * Schedule Instructions Action Dependencies
 */
export interface ScheduleInstructionsDeps {
  instructionQueue: {
    add: (name: string, data: Record<string, unknown>) => Promise<unknown>;
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
export interface StatusEvent {
  /** Temporary ID for frontend grouping */
  importId: string;
  /** ID of the note being processed (optional until saved) */
  noteId?: string;
  /** Current status of the note */
  status: NoteStatus;
  /** Optional message describing the status */
  message?: string;
  /** Context about what was being processed */
  context?: string;
  /** Current count for progress tracking */
  currentCount?: number;
  /** Total count for progress tracking */
  totalCount?: number;
  /** Indentation level for UI display */
  indentLevel?: number;
  /** Additional metadata about the status event */
  metadata?: Record<string, unknown>;
}

/**
 * Log levels for consistent logging throughout the system
 */
export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

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
 * Union type for all note pipeline action input/output combinations
 */
export type NotePipelineAction =
  | BaseAction<NotePipelineStage1, NotePipelineStage2> // parse_html
  | BaseAction<NotePipelineStage2, NotePipelineStage3> // save_note
  | BaseAction<NotePipelineStage3, NotePipelineStage3>; // status & schedule actions
