import { Queue } from "bullmq";
import type { ParsedHTMLFile } from "../../types";

// ============================================================================
// NOTE WORKER TYPES
// ============================================================================

/**
 * Note Worker Dependencies
 */
export interface NoteWorkerDependencies {
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
 */
export interface NoteJobData {
  /** HTML content to process */
  content: string;
  /** Optional note ID for status tracking */
  noteId?: string;
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
  /** Job metadata */
  metadata?: Record<string, unknown>;
  /** Job creation timestamp */
  createdAt?: Date;
  /** Job priority */
  priority?: number;
  /** Job timeout in milliseconds */
  timeout?: number;
}

/**
 * Note with parsed lines
 */
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
 * Basic Note interface
 */
export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// ACTION-SPECIFIC TYPES
// ============================================================================

/**
 * Parse HTML Action Dependencies
 */
export interface ParseHtmlDeps {
  parseHTML: (content: string) => Promise<ParsedHtmlFile>;
}

/**
 * Save Note Action Dependencies
 */
export interface SaveNoteDeps {
  createNote: (file: ParsedHtmlFile) => Promise<NoteWithParsedLines>;
}

/**
 * Schedule Action Dependencies
 */
export interface ScheduleActionDeps {
  queue: {
    add: (name: string, data: Record<string, any>) => Promise<any>;
  };
}

/**
 * Parse HTML Action Data
 */
export interface ParseHtmlData {
  content: string;
}

/**
 * Save Note Action Data
 */
export interface SaveNoteData {
  file: ParsedHtmlFile;
}

/**
 * Schedule Action Data
 */
export interface ScheduleActionData {
  noteId: string;
  file: ParsedHtmlFile;
}

/**
 * Schedule Categorization Action Data
 */
export interface ScheduleCategorizationData {
  noteId: string;
}

/**
 * Schedule Categorization Action Dependencies
 */
export interface ScheduleCategorizationDeps {
  categorizationQueue: {
    add: (name: string, data: Record<string, any>) => Promise<any>;
  };
}

/**
 * Schedule Images Action Data
 */
export interface ScheduleImagesData {
  noteId: string;
}

/**
 * Schedule Images Action Dependencies
 */
export interface ScheduleImagesDeps {
  imageQueue: {
    add: (name: string, data: Record<string, any>) => Promise<any>;
  };
}

/**
 * Schedule Ingredients Action Data
 */
export interface ScheduleIngredientsData {
  noteId: string;
}

/**
 * Schedule Ingredients Action Dependencies
 */
export interface ScheduleIngredientsDeps {
  ingredientQueue: {
    add: (name: string, data: Record<string, any>) => Promise<any>;
  };
}

/**
 * Schedule Instructions Action Data
 */
export interface ScheduleInstructionsData {
  noteId: string;
}

/**
 * Schedule Instructions Action Dependencies
 */
export interface ScheduleInstructionsDeps {
  instructionQueue: {
    add: (name: string, data: Record<string, any>) => Promise<any>;
  };
}

// ============================================================================
// RE-EXPORTS AND ALIASES
// ============================================================================

/** Re-export for convenience */
export type ParsedHtmlFile = ParsedHTMLFile;

// ============================================================================
// SHARED TYPES (from global types.ts)
// ============================================================================

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

// Re-export ActionContext from core to avoid conflicts
export type { ActionContext } from "../core";

/**
 * Action pipeline type
 */
export type ActionPipeline = Array<unknown>;

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
