/**
 * Import Note Log Contracts
 * Defines the contracts and events for note log operations
 */
import { type NoteLogEntry, type NoteLogFilter } from "./note-log-provider";

import { type FeatureContext, type FeatureEvent } from "@peas/shared";

export interface NoteLogEvent extends FeatureEvent {
  type: "note-log-created" | "note-log-updated" | "note-log-deleted";
  payload: {
    entry: NoteLogEntry;
    context: FeatureContext;
  };
}

export interface NoteLogCreatedEvent extends NoteLogEvent {
  type: "note-log-created";
  payload: {
    entry: NoteLogEntry;
    context: FeatureContext;
  };
}

export interface NoteLogUpdatedEvent extends NoteLogEvent {
  type: "note-log-updated";
  payload: {
    entry: NoteLogEntry;
    previousEntry?: Partial<NoteLogEntry>;
    context: FeatureContext;
  };
}

export interface NoteLogDeletedEvent extends Omit<NoteLogEvent, 'payload'> {
  type: "note-log-deleted";
  payload: {
    entryId: string;
    noteId: string;
    importId: string;
    context: FeatureContext;
  };
}

export interface NoteLogQuery {
  noteId?: string;
  importId?: string;
  filter?: NoteLogFilter;
  includeMetadata?: boolean;
  sortBy?: "timestamp" | "level" | "id";
  sortOrder?: "asc" | "desc";
}

export interface NoteLogQueryResult {
  entries: NoteLogEntry[];
  total: number;
  hasMore: boolean;
  nextCursor?: string;
}

export interface NoteLogBatchOperation {
  entries: Array<{
    noteId: string;
    importId: string;
    level: NoteLogEntry["level"];
    message: string;
    metadata?: Record<string, unknown>;
    context?: Partial<FeatureContext>;
  }>;
}

export interface NoteLogBatchResult {
  successCount: number;
  failedCount: number;
  errors: Array<{
    index: number;
    entry: NoteLogBatchOperation["entries"][0];
    error: string;
  }>;
}

export interface NoteLogRetentionPolicy {
  retentionDays: number;
  maxEntriesPerNote: number;
  maxTotalEntries: number;
  enableAutoCleanup: boolean;
  cleanupSchedule: string; // cron expression
}

export interface NoteLogMetrics {
  totalEntries: number;
  entriesByLevel: Record<NoteLogEntry["level"], number>;
  entriesByNote: Record<string, number>;
  entriesByImport: Record<string, number>;
  errorRate: number;
  averageEntriesPerMinute: number;
  storageUsage: {
    totalBytes: number;
    averageEntrySize: number;
  };
}
