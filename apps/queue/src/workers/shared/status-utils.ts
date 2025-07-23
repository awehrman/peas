import { WORKER_CONSTANTS } from "./constants";

import type { StatusEvent } from "../types";

/**
 * Utility class for creating status events for broadcasting.
 */
export class StatusUtils {
  /**
   * Create a processing status event.
   * @param data - Processing status data
   * @returns StatusEvent
   */
  static createProcessingStatus(data: {
    importId: string;
    noteId?: string;
    message: string;
    context?: string | Record<string, unknown>;
    indentLevel?: number;
    metadata?: Record<string, unknown>;
  }): StatusEvent {
    return {
      type: "PROCESSING",
      message: data.message,
      timestamp: new Date(),
      severity: "info",
      metadata: data.metadata,
      jobId: data.importId,
      noteId: data.noteId,
      context:
        typeof data.context === "object"
          ? data.context
          : {
              type: data.context || WORKER_CONSTANTS.STATUS_CONTEXTS.PROCESSING,
            },
    };
  }

  /**
   * Create a completion status event.
   * @param data - Completion status data
   * @returns StatusEvent
   */
  static createCompletionStatus(data: {
    importId: string;
    noteId?: string;
    message: string;
    context?: string | Record<string, unknown>;
    indentLevel?: number;
    metadata?: Record<string, unknown>;
  }): StatusEvent {
    return {
      type: "COMPLETED",
      message: data.message,
      timestamp: new Date(),
      severity: "info",
      metadata: data.metadata,
      jobId: data.importId,
      noteId: data.noteId,
      context:
        typeof data.context === "object"
          ? data.context
          : {
              type:
                data.context ||
                WORKER_CONSTANTS.STATUS_CONTEXTS.IMPORT_COMPLETE,
            },
    };
  }

  /**
   * Create a progress status event for countable items.
   * @param data - Progress status data
   * @returns StatusEvent
   */
  static createProgressStatus(data: {
    importId: string;
    noteId?: string;
    current: number;
    total: number;
    itemType: string;
    context: string | Record<string, unknown>;
    indentLevel?: number;
    metadata?: Record<string, unknown>;
  }): StatusEvent {
    const isComplete = data.current === data.total;
    const type = isComplete ? "COMPLETED" : "PROCESSING";
    const emoji = isComplete
      ? WORKER_CONSTANTS.EMOJIS.SUCCESS
      : WORKER_CONSTANTS.EMOJIS.PROCESSING;

    return {
      type,
      message: `${emoji} ${data.current}/${data.total} ${data.itemType}`,
      timestamp: new Date(),
      severity: "info",
      metadata: {
        ...data.metadata,
        current: data.current,
        total: data.total,
        isComplete,
      },
      jobId: data.importId,
      noteId: data.noteId,
      context:
        typeof data.context === "object"
          ? data.context
          : { type: data.context },
    };
  }

  /**
   * Create an error status event.
   * @param data - Error status data
   * @returns StatusEvent
   */
  static createErrorStatus(data: {
    importId: string;
    noteId?: string;
    message: string;
    context?: string | Record<string, unknown>;
    indentLevel?: number;
    metadata?: Record<string, unknown>;
  }): StatusEvent {
    return {
      type: "FAILED",
      message: `${WORKER_CONSTANTS.EMOJIS.ERROR} ${data.message}`,
      timestamp: new Date(),
      severity: "error",
      metadata: data.metadata,
      jobId: data.importId,
      noteId: data.noteId,
      context:
        typeof data.context === "object"
          ? data.context
          : { type: data.context || WORKER_CONSTANTS.STATUS_CONTEXTS.ERROR },
    };
  }
}
