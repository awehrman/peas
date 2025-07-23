import type { NoteStatus } from "@peas/database";

import type { BaseWorkerDependencies, StructuredLogger } from "../core/types";

/**
 * Data required to broadcast an error event.
 */
export interface ErrorBroadcastData {
  importId?: string;
  noteId?: string;
  errorType:
    | "PARSING_ERROR"
    | "PROCESSING_ERROR"
    | "DATABASE_ERROR"
    | "VALIDATION_ERROR";
  errorMessage: string;
  context: string;
  metadata?: Record<string, unknown>;
}

/**
 * Dependencies required for error broadcasting, including a structured logger and status broadcaster.
 */
export interface ErrorBroadcastDependencies extends BaseWorkerDependencies {
  logger: StructuredLogger;
  addStatusEventAndBroadcast: (event: {
    importId: string;
    noteId?: string;
    status: NoteStatus;
    message?: string;
    context?: string;
    currentCount?: number;
    totalCount?: number;
    indentLevel?: number;
    metadata?: Record<string, unknown>;
  }) => Promise<unknown>;
}

/**
 * Broadcast error events for real-time error reporting.
 * Logs the error and sends a status event if importId is present.
 *
 * @param deps - Error broadcasting dependencies
 * @param errorData - Error event data
 */
export async function broadcastError(
  deps: ErrorBroadcastDependencies,
  errorData: ErrorBroadcastData
): Promise<void> {
  const { importId, noteId, errorType, errorMessage, context, metadata } =
    errorData;

  // Log the error (with error handling)
  try {
    deps.logger?.log(
      `[ERROR_BROADCAST] Broadcasting ${errorType} for ${context}: ${errorMessage}`,
      "error",
      { errorType, errorMessage, context, noteId, importId, metadata }
    );
  } catch (loggerError) {
    // If logger fails, just continue - don't let logger errors break error broadcasting
    console.error(`[ERROR_BROADCAST] Logger failed: ${loggerError}`);
  }

  // Only broadcast if we have an importId
  if (!importId) {
    try {
      deps.logger?.log(
        `[ERROR_BROADCAST] Skipping error broadcast - no importId provided`,
        "warn",
        { errorType, errorMessage, context, noteId, metadata }
      );
    } catch (loggerError) {
      console.error(`[ERROR_BROADCAST] Logger failed: ${loggerError}`);
    }
    return;
  }

  // Broadcast error status
  try {
    await deps.addStatusEventAndBroadcast({
      importId,
      noteId,
      status: "FAILED" as NoteStatus,
      message: ` 274c ${errorMessage}`,
      context,
      indentLevel: 2,
      metadata: {
        errorType,
        errorMessage,
        ...metadata,
      },
    });
  } catch (broadcastError) {
    // If broadcasting fails, log it but don't throw
    try {
      deps.logger?.log(
        `[ERROR_BROADCAST] Failed to broadcast error: ${broadcastError}`,
        "error",
        { errorType, errorMessage, context, noteId, importId, metadata }
      );
    } catch (loggerError) {
      console.error(
        `[ERROR_BROADCAST] Failed to broadcast error and logger failed: ${broadcastError}, ${loggerError}`
      );
    }
  }
}

/**
 * Broadcast parsing errors specifically.
 *
 * @param deps - Error broadcasting dependencies
 * @param data - Parsing error data
 */
export async function broadcastParsingError(
  deps: ErrorBroadcastDependencies,
  data: {
    importId?: string;
    noteId?: string;
    lineId: string;
    reference: string;
    errorMessage: string;
    context: string;
  }
): Promise<void> {
  await broadcastError(deps, {
    importId: data.importId,
    noteId: data.noteId,
    errorType: "PARSING_ERROR",
    errorMessage: data.errorMessage,
    context: data.context,
    metadata: {
      lineId: data.lineId,
      reference: data.reference,
    },
  });
}

/**
 * Broadcast processing errors.
 *
 * @param deps - Error broadcasting dependencies
 * @param data - Processing error data
 */
export async function broadcastProcessingError(
  deps: ErrorBroadcastDependencies,
  data: {
    importId?: string;
    noteId?: string;
    errorMessage: string;
    context: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  await broadcastError(deps, {
    importId: data.importId,
    noteId: data.noteId,
    errorType: "PROCESSING_ERROR",
    errorMessage: data.errorMessage,
    context: data.context,
    metadata: data.metadata,
  });
}
