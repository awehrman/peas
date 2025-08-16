import type { ProcessingOptions, SourceInfo } from "./common";

import type { ParsedHTMLFile } from "@peas/database";

import type { BaseJobData, BaseWorkerDependencies } from "../workers/types";

// ============================================================================
// NOTE PROCESSING TYPES
// ============================================================================

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

  // File path information (for coordinated uploads)
  originalFilePath?: string;

  // Pre-assigned images from coordinated uploads
  imageFiles?: Array<{
    fileName: string;
    filePath: string;
    size: number;
    extension: string;
    importId?: string; // ImportId for this specific image (for directory uploads)
  }>;

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
  images?: Array<{
    id: string;
    originalImageUrl: string;
    thumbnailImageUrl?: string;
    crop3x2ImageUrl?: string;
    crop4x3ImageUrl?: string;
    crop16x9ImageUrl?: string;
    originalWidth?: number;
    originalHeight?: number;
    originalSize?: number;
    originalFormat?: string;
    processingStatus: string;
  }>;
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
  evernoteMetadata?: {
    originalCreatedAt?: Date;
    source?: string;
    tags?: string[];
  };
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
