import { ActionName } from "../../types";
import { BaseAction } from "../core/base-action";
import { ActionContext } from "../core/types";
import type { BaseJobData } from "../types";

export interface ErrorHandlingDeps {
  ErrorHandler: {
    withErrorHandling: <T>(
      operation: () => Promise<T>,
      context: { jobId: string; operation: string; noteId?: string }
    ) => Promise<T>;
  };
}

export interface ErrorHandlingData {
  noteId?: string;
  context?: Record<string, unknown>;
}

export interface ErrorJobData extends BaseJobData {
  error: Error;
  noteId?: string;
}

/**
 * Action that wraps another action with error handling.
 * @template TData - The data type
 * @template TDeps - The dependencies type
 */
export class ErrorHandlingWrapperAction<
  TData extends BaseJobData = BaseJobData,
  TDeps extends ErrorHandlingDeps = ErrorHandlingDeps,
> extends BaseAction<TData, TDeps> {
  name: ActionName;
  constructor(private wrappedAction: BaseAction<BaseJobData, object>) {
    super();
    this.name = ActionName.ERROR_HANDLING;
  }
  async execute(data: TData, deps: TDeps, context: ActionContext) {
    return await deps.ErrorHandler.withErrorHandling(
      async () => {
        const result = await this.wrappedAction.execute(data, deps, context);
        return result;
      },
      {
        jobId: context.jobId,
        operation: `${context.operation} (${this.wrappedAction.name})`,
        noteId: (data as Record<string, unknown>).noteId as string | undefined,
      }
    );
  }
}

/**
 * Action that logs errors and continues processing.
 */
export class LogErrorAction extends BaseAction<
  ErrorJobData,
  {
    logger?: {
      log: (
        message: string,
        level?: string,
        meta?: Record<string, unknown>
      ) => void;
    };
  }
> {
  name = ActionName.LOG_ERROR;
  async execute(
    data: ErrorJobData,
    deps: {
      logger?: {
        log: (
          message: string,
          level?: string,
          meta?: Record<string, unknown>
        ) => void;
      };
    },
    context: ActionContext
  ) {
    if (deps.logger) {
      deps.logger.log(
        `Error in ${context.operation} for job ${context.jobId}${data.noteId ? ` (note: ${data.noteId})` : ""}: ${data.error.message}`,
        "error",
        { error: data.error, noteId: data.noteId, jobId: context.jobId }
      );
    } else {
      console.error(
        `Error in ${context.operation} for job ${context.jobId}${data.noteId ? ` (note: ${data.noteId})` : ""}:`,
        data.error.message
      );
    }
    return data;
  }
  retryable = false;
}

/**
 * Action that captures and stores errors for later analysis.
 */
export class CaptureErrorAction extends BaseAction<ErrorJobData, object> {
  name = ActionName.CAPTURE_ERROR;
  async execute(data: ErrorJobData, _deps: object, context: ActionContext) {
    // Store error information for monitoring/alerting
    const errorInfo = {
      timestamp: new Date().toISOString(),
      jobId: context.jobId,
      operation: context.operation,
      noteId: data.noteId,
      error: {
        message: data.error.message,
        stack: data.error.stack,
        name: data.error.name,
      },
    };
    // TODO: Send to error tracking service (e.g., Sentry, DataDog)
    console.error("Captured error:", JSON.stringify(errorInfo, null, 2));
    return data;
  }
  retryable = false;
}

/**
 * Action that attempts to recover from errors.
 */
export class ErrorRecoveryAction extends BaseAction<ErrorJobData, object> {
  name = ActionName.ERROR_RECOVERY;
  async execute(data: ErrorJobData, _deps: object, context: ActionContext) {
    // Attempt to recover based on error type
    if (data.error.name === "ValidationError") {
      console.log(`Recovering from validation error in ${context.operation}`);
      // Could implement validation error recovery logic
    } else if (data.error.name === "NetworkError") {
      console.log(`Recovering from network error in ${context.operation}`);
      // Could implement network error recovery logic
    } else {
      console.log(`No recovery strategy for error type: ${data.error.name}`);
    }
    return data;
  }
  retryable = true;
}

/**
 * Helper function to create an error handling wrapper for any action.
 * @template T - The action type
 * @param action - The action to wrap
 * @param errorHandler - Optional error handler
 * @returns ErrorHandlingWrapperAction
 */
export function withErrorHandling<T extends BaseAction<BaseJobData, object>>(
  action: T,
  errorHandler?: (error: Error, context: ActionContext) => Promise<void>
): ErrorHandlingWrapperAction {
  if (errorHandler) {
    action.onError = (error, _data, _deps, context) =>
      errorHandler(error, context);
  }
  return new ErrorHandlingWrapperAction(action);
}

/**
 * Helper function to create a chain of error handling actions.
 * @param _noteId - Optional note ID
 * @returns Array of error handling actions
 */
export function createErrorHandlingChain(
  _noteId?: string
): BaseAction<ErrorJobData, object>[] {
  return [
    new LogErrorAction(),
    new CaptureErrorAction(),
    new ErrorRecoveryAction(),
  ];
}
