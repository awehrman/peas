// Import types from schemas to ensure consistency
import type {
  ParseHtmlData,
  ParsedHtmlFile,
  SaveNoteData,
} from "../../../schemas";
import type {
  BaseWorkerDependencies,
  WorkerAction,
} from "../../../workers/types";

/**
 * Result type for note processing operations
 */
export interface NoteProcessingResult {
  noteId: string;
  status: "completed" | "failed" | "partial";
  parsedLines: number;
  errors?: string[];
  duration?: number;
}

/**
 * Unified pipeline data for the note processing pipeline
 */
export interface NotePipelineData {
  content: string;
  importId?: string;
  source?: {
    url?: string;
    filename?: string;
    contentType?: string;
    metadata?: Record<string, unknown>;
  };
  options?: {
    skipParsing?: boolean;
    skipCategorization?: boolean;
    skipImageProcessing?: boolean;
  };
  metadata?: Record<string, unknown>;
  createdAt?: Date;
  priority?: number;
  timeout?: number;
  file?: ParsedHtmlFile;
  note?: NoteWithParsedLines;
  noteId?: string;
  // Add any other fields needed by any action in the pipeline
}

/**
 * Unified job data for note processing pipeline
 */
export interface NoteJobData {
  // Always present
  content: string;

  // Optional, used by various actions
  importId?: string;
  source?: {
    url?: string;
    filename?: string;
    contentType?: string;
    metadata?: Record<string, unknown>;
  };
  options?: {
    skipParsing?: boolean;
    skipCategorization?: boolean;
    skipImageProcessing?: boolean;
  };
  metadata?: Record<string, unknown>;
  createdAt?: Date;
  priority?: number;
  timeout?: number;

  // Added/used by later pipeline stages
  file?: ParsedHtmlFile;
  note?: NoteWithParsedLines;
}

/**
 * Dependencies required by note worker actions
 */
export interface NoteWorkerDependencies extends BaseWorkerDependencies {
  // Database operations
  createNote: (file: ParsedHtmlFile) => Promise<NoteWithParsedLines>;
  createNoteCompletionTracker: (
    noteId: string,
    totalJobs: number
  ) => Promise<Record<string, unknown>>;

  // Parser operations
  parseHTML: (content: string) => Promise<ParsedHtmlFile>;

  // Queue operations (optional for future use)
  // ingredientQueue?: Queue;
  // instructionQueue?: Queue;
  // imageQueue?: Queue;
  // categorizationQueue?: Queue;
  // sourceQueue?: Queue;

  // Logger with specific methods
  logger: {
    log: (
      message: string,
      level?: string,
      meta?: Record<string, unknown>
    ) => void;
  };

  // Status broadcasting
  addStatusEventAndBroadcast: (event: Record<string, unknown>) => Promise<void>;
}

// NoteWithParsedLines type definition
export interface NoteWithParsedLines {
  id: string;
  title: string | null;
  content: string;
  html: string;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
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
 * Action names for note processing
 */
export enum NoteActionName {
  PARSE_HTML = "parse_html",
  CLEAN_HTML = "clean_html",
  SAVE_NOTE = "save_note",
}

/**
 * Pipeline action type for note processing
 */
export type NotePipelineAction = WorkerAction<
  NotePipelineData,
  NoteWorkerDependencies,
  NotePipelineData
>;

/**
 * Union type for all valid note action constructors
 */
export type NoteActionClass =
  | typeof import("./parse-html").ParseHtmlAction
  | typeof import("./clean-html").CleanHtmlAction
  | typeof import("./save-note").SaveNoteAction;

// Re-export schema types for convenience
export type { ParseHtmlData, ParsedHtmlFile, SaveNoteData };
