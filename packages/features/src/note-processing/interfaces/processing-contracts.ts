/**
 * Note Processing Contracts
 * Defines the contracts and events for note processing operations
 */

import { type FeatureContext, type FeatureEvent } from "@peas/shared";
import {
  type ProcessedNote,
  type ProcessingResult,
  type ProcessingOptions,
} from "./note-processor";

export interface NoteProcessingEvent extends FeatureEvent {
  type:
    | "note-processing-started"
    | "note-processing-completed"
    | "note-processing-failed"
    | "note-processing-batch-started"
    | "note-processing-batch-completed";
  payload: {
    noteId: string;
    context: FeatureContext;
  };
}

export interface NoteProcessingStartedEvent extends NoteProcessingEvent {
  type: "note-processing-started";
  payload: {
    noteId: string;
    contentLength: number;
    options: ProcessingOptions;
    context: FeatureContext;
  };
}

export interface NoteProcessingCompletedEvent extends NoteProcessingEvent {
  type: "note-processing-completed";
  payload: {
    noteId: string;
    result: ProcessingResult;
    processingTime: number;
    context: FeatureContext;
  };
}

export interface NoteProcessingFailedEvent extends NoteProcessingEvent {
  type: "note-processing-failed";
  payload: {
    noteId: string;
    error: string;
    processingTime: number;
    context: FeatureContext;
  };
}

export interface NoteProcessingBatchStartedEvent extends Omit<NoteProcessingEvent, 'payload'> {
  type: "note-processing-batch-started";
  payload: {
    batchId: string;
    noteIds: string[];
    totalNotes: number;
    options: ProcessingOptions;
    context: FeatureContext;
  };
}

export interface NoteProcessingBatchCompletedEvent extends Omit<NoteProcessingEvent, 'payload'> {
  type: "note-processing-batch-completed";
  payload: {
    batchId: string;
    results: ProcessingResult[];
    successfulCount: number;
    failedCount: number;
    totalProcessingTime: number;
    context: FeatureContext;
  };
}

export interface NoteProcessingQuery {
  importId?: string;
  status?: "pending" | "processing" | "completed" | "failed";
  language?: string;
  confidenceThreshold?: number;
  since?: Date;
  until?: Date;
  limit?: number;
  offset?: number;
}

export interface NoteProcessingQueryResult {
  notes: ProcessedNote[];
  total: number;
  hasMore: boolean;
  nextCursor?: string;
}

export interface NoteProcessingBatchOperation {
  notes: Array<{
    content: string;
    options?: ProcessingOptions;
    context?: Partial<FeatureContext>;
  }>;
}

export interface NoteProcessingBatchResult {
  successCount: number;
  failedCount: number;
  results: ProcessingResult[];
  errors: Array<{
    index: number;
    content: string;
    error: string;
  }>;
  totalProcessingTime: number;
}

export interface NoteProcessingValidationRule {
  name: string;
  validate: (note: ProcessedNote) => Promise<{
    isValid: boolean;
    error?: string;
    warning?: string;
  }>;
}

export interface NoteProcessingMetrics {
  totalNotes: number;
  successfulProcessings: number;
  failedProcessings: number;
  averageProcessingTime: number;
  averageConfidence: number;
  processingErrors: Record<string, number>;
  languageDistribution: Record<string, number>;
  notesByStatus: Record<string, number>;
  notesByImport: Record<string, number>;
  batchProcessingStats: {
    totalBatches: number;
    averageBatchSize: number;
    averageBatchProcessingTime: number;
  };
}
