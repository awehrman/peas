import { WORKER_CONSTANTS } from "./constants";
import type { StatusEvent } from "../types";
import type { NoteStatus } from "@peas/database";

/**
 * Status broadcasting utility functions
 */
export class StatusUtils {
  /**
   * Create a processing status event
   */
  static createProcessingStatus(data: {
    importId: string;
    noteId?: string;
    message: string;
    context?: string;
    indentLevel?: number;
    metadata?: Record<string, unknown>;
  }): StatusEvent {
    return {
      importId: data.importId,
      noteId: data.noteId,
      status: "PROCESSING",
      message: data.message,
      context: data.context || WORKER_CONSTANTS.STATUS_CONTEXTS.PROCESSING,
      indentLevel:
        data.indentLevel || WORKER_CONSTANTS.INDENT_LEVELS.MAIN_OPERATION,
      metadata: data.metadata,
    };
  }

  /**
   * Create a completion status event
   */
  static createCompletionStatus(data: {
    importId: string;
    noteId?: string;
    message: string;
    context?: string;
    indentLevel?: number;
    metadata?: Record<string, unknown>;
  }): StatusEvent {
    return {
      importId: data.importId,
      noteId: data.noteId,
      status: "COMPLETED",
      message: data.message,
      context: data.context || WORKER_CONSTANTS.STATUS_CONTEXTS.IMPORT_COMPLETE,
      indentLevel: data.indentLevel || WORKER_CONSTANTS.INDENT_LEVELS.TOP_LEVEL,
      metadata: data.metadata,
    };
  }

  /**
   * Create a progress status event for countable items
   */
  static createProgressStatus(data: {
    importId: string;
    noteId?: string;
    current: number;
    total: number;
    itemType: string;
    context: string;
    indentLevel?: number;
    metadata?: Record<string, unknown>;
  }): StatusEvent {
    const isComplete = data.current === data.total;
    const status = isComplete ? "COMPLETED" : "PROCESSING";
    const emoji = isComplete
      ? WORKER_CONSTANTS.EMOJIS.SUCCESS
      : WORKER_CONSTANTS.EMOJIS.PROCESSING;

    return {
      importId: data.importId,
      noteId: data.noteId,
      status,
      message: `${emoji} ${data.current}/${data.total} ${data.itemType}`,
      context: data.context,
      indentLevel:
        data.indentLevel || WORKER_CONSTANTS.INDENT_LEVELS.SUB_OPERATION,
      metadata: {
        ...data.metadata,
        current: data.current,
        total: data.total,
        isComplete,
      },
    };
  }

  /**
   * Create an error status event
   */
  static createErrorStatus(data: {
    importId: string;
    noteId?: string;
    message: string;
    context?: string;
    indentLevel?: number;
    metadata?: Record<string, unknown>;
  }): StatusEvent {
    return {
      importId: data.importId,
      noteId: data.noteId,
      status: "FAILED" as NoteStatus,
      message: `${WORKER_CONSTANTS.EMOJIS.ERROR} ${data.message}`,
      context: data.context || WORKER_CONSTANTS.STATUS_CONTEXTS.ERROR,
      indentLevel:
        data.indentLevel || WORKER_CONSTANTS.INDENT_LEVELS.MAIN_OPERATION,
      metadata: data.metadata,
    };
  }
}
