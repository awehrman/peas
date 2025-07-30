import type { ProcessingOptions, SourceInfo } from "./common";

import type { ParsedHTMLFile } from "@peas/database";

import type { WorkerAction } from "../workers/types";
import type { BaseJobData, BaseWorkerDependencies } from "../workers/types";

// ============================================================================
// NOTE PROCESSING TYPES
// ============================================================================

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
 * This is the single source of truth for note job data
 */
export interface NotePipelineData extends BaseJobData {
  // Core content (required)
  content: string;

  // Source information
  source?: SourceInfo;

  // Processing options
  options?: ProcessingOptions;

  // Pipeline stage data (added by actions)
  file?: ParsedHTMLFile;
  note?: NoteWithParsedLines;
}

/**
 * Note with parsed lines
 * The complete note structure including parsed ingredient and instruction lines
 */
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

// ============================================================================
// NOTE WORKER TYPES
// ============================================================================

/**
 * Dependencies required by the NoteWorker, including HTML parsing and cleaning.
 */
export interface NoteWorkerDependencies extends BaseWorkerDependencies {
  /** Business logic services */
  services: {
    /**
     * Parse HTML content and extract structured data.
     */
    parseHtml: (data: NotePipelineData) => Promise<NotePipelineData>;
    /**
     * Clean HTML content by removing style and icons tags.
     */
    cleanHtml: (data: NotePipelineData) => Promise<NotePipelineData>;
    /**
     * Save note to database.
     */
    saveNote: (data: NotePipelineData) => Promise<NotePipelineData>;
  };
}

// ============================================================================
// NOTE ACTION TYPES
// ============================================================================

/**
 * Base action type for note pipeline actions
 */
export type NotePipelineAction = WorkerAction<
  NotePipelineData,
  NoteWorkerDependencies,
  NotePipelineData
>;

/**
 * Union type for all note action classes
 */
export type NoteActionClass =
  | typeof import("../services/note/actions/parse-html/action").ParseHtmlAction
  | typeof import("../services/note/actions/clean-html/action").CleanHtmlAction
  | typeof import("../services/note/actions/save-note/action").SaveNoteAction;

/**
 * Note job data type
 */
export type NoteJobData = NotePipelineData;

// ============================================================================
// NOTE PIPELINE STAGES
// ============================================================================

/**
 * Stage 1: Raw HTML content (input)
 */
export type NotePipelineStage1 = NotePipelineData;

/**
 * Stage 2: Cleaned HTML content
 */
export type NotePipelineStage2 = NotePipelineData;

/**
 * Stage 3: Parsed HTML file with structured data
 */
export type NotePipelineStage3 = NotePipelineData & {
  file: ParsedHTMLFile;
};

/**
 * Action return types
 */
export type CleanHtmlActionReturn = NotePipelineStage2;
export type ParseHtmlActionReturn = NotePipelineStage3;
