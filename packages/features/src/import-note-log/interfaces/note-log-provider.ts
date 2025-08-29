/**
 * Import Note Log Provider Interface
 * Defines the contract for note log operations in the import process
 */

export interface NoteLogEntry {
  id: string;
  noteId: string;
  importId: string;
  timestamp: string;
  level: "info" | "warn" | "error" | "debug";
  message: string;
  metadata?: Record<string, unknown>;
  context?: NoteLogContext;
}

export interface NoteLogContext {
  featureName: string;
  operation: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
}

export interface NoteLogFilter {
  noteId?: string;
  importId?: string;
  level?: NoteLogEntry["level"];
  since?: Date;
  until?: Date;
  limit?: number;
  offset?: number;
}

export interface NoteLogProvider {
  /**
   * Log a message for a specific note during import
   */
  log(
    noteId: string,
    importId: string,
    level: NoteLogEntry["level"],
    message: string,
    metadata?: Record<string, unknown>,
    context?: Partial<NoteLogContext>
  ): Promise<void>;

  /**
   * Get log entries for a specific note
   */
  getNoteLogs(noteId: string, filter?: NoteLogFilter): Promise<NoteLogEntry[]>;

  /**
   * Get log entries for a specific import
   */
  getImportLogs(
    importId: string,
    filter?: NoteLogFilter
  ): Promise<NoteLogEntry[]>;

  /**
   * Get all log entries with optional filtering
   */
  getLogs(filter?: NoteLogFilter): Promise<NoteLogEntry[]>;

  /**
   * Clear old log entries based on retention policy
   */
  clearOldLogs(retentionDays: number): Promise<number>;

  /**
   * Get log statistics for monitoring
   */
  getLogStats(
    noteId?: string,
    importId?: string,
    timeRange?: { since: Date; until: Date }
  ): Promise<{
    totalEntries: number;
    entriesByLevel: Record<NoteLogEntry["level"], number>;
    errorRate: number;
    averageEntriesPerMinute: number;
  }>;
}

export interface NoteLogProviderConfig {
  retentionDays: number;
  maxEntriesPerNote: number;
  enableRealTimeLogging: boolean;
  logLevel: NoteLogEntry["level"];
  enableMetrics: boolean;
}
