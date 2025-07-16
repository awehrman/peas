import { BaseAction } from "../core/base-action";
import { ActionContext } from "../core/types";

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
  [key: string]: any;
}

/**
 * Action that wraps another action with error handling
 */
export class ErrorHandlingWrapperAction extends BaseAction<
  ErrorHandlingData,
  ErrorHandlingDeps
> {
  name: string;

  constructor(private wrappedAction: BaseAction<any, any>) {
    super();
    this.name = `error_handling_wrapper(${wrappedAction.name})`;
  }

  async execute(
    data: ErrorHandlingData,
    deps: ErrorHandlingDeps,
    context: ActionContext
  ) {
    return deps.ErrorHandler.withErrorHandling(
      async () => {
        const result = await this.wrappedAction.execute(data, deps, context);
        return result;
      },
      {
        jobId: context.jobId,
        operation: `${context.operation} (${this.wrappedAction.name})`,
        noteId: data.noteId,
      }
    );
  }
}

/**
 * Action that logs errors and continues processing
 */
export class LogErrorAction extends BaseAction<
  { error: Error; noteId?: string },
  any
> {
  name = "log_error";

  async execute(
    data: { error: Error; noteId?: string },
    _deps: any,
    context: ActionContext
  ) {
    console.error(
      `Error in ${context.operation} for job ${context.jobId}${data.noteId ? ` (note: ${data.noteId})` : ""}:`,
      data.error.message
    );
    return data;
  }

  retryable = false;
}

/**
 * Action that captures and stores errors for later analysis
 */
export class CaptureErrorAction extends BaseAction<
  { error: Error; noteId?: string },
  any
> {
  name = "capture_error";

  async execute(
    data: { error: Error; noteId?: string },
    _deps: any,
    context: ActionContext
  ) {
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
 * Action that attempts to recover from errors
 */
export class ErrorRecoveryAction extends BaseAction<
  { error: Error; noteId?: string },
  any
> {
  name = "error_recovery";

  async execute(
    data: { error: Error; noteId?: string },
    _deps: any,
    context: ActionContext
  ) {
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
 * Helper function to create an error handling wrapper for any action
 */
export function withErrorHandling<T extends BaseAction<any, any>>(
  action: T,
  errorHandler?: (error: Error, context: ActionContext) => Promise<void>
): ErrorHandlingWrapperAction {
  if (errorHandler) {
    action.onError = errorHandler;
  }
  return new ErrorHandlingWrapperAction(action);
}

/**
 * Helper function to create a chain of error handling actions
 */
export function createErrorHandlingChain(
  _noteId?: string
): BaseAction<{ error: Error; noteId?: string }, any>[] {
  return [
    new LogErrorAction(),
    new CaptureErrorAction(),
    new ErrorRecoveryAction(),
  ];
}
