import { BaseAction } from "../core/base-action";
import { ActionContext } from "../core/types";

export interface BroadcastStatusDeps {
  addStatusEventAndBroadcast: (event: {
    importId: string;
    noteId?: string;
    status: string;
    message: string;
    context: string;
    indentLevel?: number;
  }) => Promise<void>;
}

export interface BroadcastStatusData {
  importId: string;
  noteId?: string;
  status: string;
  message: string;
  context?: string;
}

/**
 * Action that broadcasts a status update for a note
 */
export class BroadcastStatusAction extends BaseAction<
  BroadcastStatusData,
  BroadcastStatusDeps
> {
  name = "broadcast_status";

  async execute(
    data: BroadcastStatusData,
    deps: BroadcastStatusDeps,
    context: ActionContext
  ) {
    await deps.addStatusEventAndBroadcast({
      importId: data.importId,
      noteId: data.noteId,
      status: data.status,
      message: data.message,
      context: data.context || context.operation,
    });
    return data;
  }
}

/**
 * Action that broadcasts a processing status
 */
export class BroadcastProcessingAction extends BaseAction<
  { importId: string; noteId?: string; message?: string },
  BroadcastStatusDeps
> {
  name = "broadcast_processing";

  async execute(
    data: { importId: string; noteId?: string; message?: string },
    deps: BroadcastStatusDeps,
    context: ActionContext
  ) {
    await deps.addStatusEventAndBroadcast({
      importId: data.importId,
      noteId: data.noteId,
      status: "PROCESSING",
      message: data.message || `${context.operation} in progress`,
      context: context.operation,
    });
    return data;
  }
}

/**
 * Action that broadcasts a completed status
 */
export class BroadcastCompletedAction extends BaseAction<
  { importId: string; noteId?: string; message?: string },
  BroadcastStatusDeps
> {
  name = "broadcast_completed";

  async execute(
    data: { importId: string; noteId?: string; message?: string },
    deps: BroadcastStatusDeps,
    context: ActionContext
  ) {
    await deps.addStatusEventAndBroadcast({
      importId: data.importId,
      noteId: data.noteId,
      status: "COMPLETED",
      message: data.message || `${context.operation} completed successfully`,
      context: context.operation,
    });
    return data;
  }
}

/**
 * Action that broadcasts a failed status
 */
export class BroadcastFailedAction extends BaseAction<
  { importId: string; noteId?: string; error?: string },
  BroadcastStatusDeps
> {
  name = "broadcast_failed";

  async execute(
    data: { importId: string; noteId?: string; error?: string },
    deps: BroadcastStatusDeps,
    context: ActionContext
  ) {
    await deps.addStatusEventAndBroadcast({
      importId: data.importId,
      noteId: data.noteId,
      status: "FAILED",
      message: data.error || `${context.operation} failed`,
      context: context.operation,
    });
    return data;
  }
}

/**
 * Helper function to create a status update action with custom status and message
 */
export function createStatusAction(
  status: string,
  message:
    | string
    | ((data: BroadcastStatusData, context: ActionContext) => string)
): typeof BroadcastStatusAction {
  return class extends BroadcastStatusAction {
    async execute(
      data: BroadcastStatusData,
      deps: BroadcastStatusDeps,
      context: ActionContext
    ) {
      const statusMessage =
        typeof message === "function" ? message(data, context) : message;
      await deps.addStatusEventAndBroadcast({
        importId: data.importId,
        noteId: data.noteId,
        status,
        message: statusMessage,
        context: context.operation,
      });
      return data;
    }
  };
}
