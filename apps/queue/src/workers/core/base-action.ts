import type { ActionContext, ActionResult, WorkerAction } from "./types";

import { ActionName } from "../../types";
import type { BaseJobData } from "../types";

// ============================================================================
// TYPES
// ============================================================================

interface StatusBroadcaster {
  addStatusEventAndBroadcast: (event: {
    importId?: string;
    status: string;
    message: string;
    context: string;
    indentLevel: number;
  }) => Promise<void>;
}

interface BaseErrorLoggerDeps {
  logger: {
    log: (
      message: string,
      level: string,
      meta?: Record<string, unknown>
    ) => void;
  };
}

type SimpleLogger = { log: (message: string) => void };

type ActionConfig = Pick<
  WorkerAction<Record<string, unknown>, object, unknown>,
  "retryable" | "priority"
>;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function hasLogger(deps: unknown): deps is BaseErrorLoggerDeps {
  return (
    deps !== null &&
    deps !== undefined &&
    typeof deps === "object" &&
    "logger" in deps &&
    deps.logger !== null &&
    deps.logger !== undefined &&
    typeof deps.logger === "object" &&
    "log" in deps.logger &&
    typeof deps.logger.log === "function"
  );
}

/**
 * Abstract base class for all worker actions.
 * Provides timing, error handling, and config utilities.
 */
export abstract class BaseAction<
  TData extends BaseJobData = BaseJobData,
  TDeps extends object = object,
  TResult = unknown,
> implements WorkerAction<TData, TDeps, TResult>
{
  /** Unique identifier for this action */
  abstract name: ActionName;

  /**
   * Execute the action with the given data and dependencies
   * @param data The input data for the action
   * @param deps Dependencies required by the action
   * @param context Context information about the job
   * @returns Promise that resolves to the action result
   */
  abstract execute(
    data: TData,
    deps: TDeps,
    context: ActionContext
  ): Promise<TResult>;

  /** Whether this action should be retried on failure */
  retryable?: boolean = true;
  /** Priority of this action (lower numbers = higher priority) */
  priority?: number = 0;

  /**
   * Execute the action with timing and error handling.
   * @param data The input data for the action
   * @param deps Dependencies required by the action
   * @param context Context information about the job
   * @returns Promise that resolves to an ActionResult with timing information
   */
  async executeWithTiming(
    data: TData,
    deps: TDeps,
    context: ActionContext
  ): Promise<ActionResult<TResult>> {
    const startTime = Date.now();
    try {
      const result = await this.execute(data, deps, context);
      const duration = Date.now() - startTime;
      return { success: true, data: result, duration };
    } catch (error) {
      const duration = Date.now() - startTime;
      if (this.onError) {
        await this.onError(error as Error, data, deps, context);
      } else if (hasLogger(deps)) {
        /* istanbul ignore next -- @preserve */
        deps.logger.log(
          `Action ${this.name} failed for job ${context.jobId}: ${error instanceof Error ? error.message : String(error)}`,
          "error",
          { error }
        );
      } else {
        // Default error logging when no custom handler is provided
        console.error(
          `Action ${this.name} failed for job ${context.jobId}:`,
          error instanceof Error ? error.message : String(error)
        );
      }
      return { success: false, error: error as Error, duration };
    }
  }

  /**
   * Default error handler - can be overridden by subclasses.
   * @param error The error that occurred
   * @param data The input data that was being processed
   * @param deps The dependencies that were available
   * @param context Context information about the job
   */
  onError?(
    error: Error,
    _data: TData,
    _deps: TDeps,
    context: ActionContext
  ): Promise<void>;

  /**
   * Validate input data - can be overridden by subclasses.
   * @param data The data to validate
   * @returns Error if validation fails, null if validation passes
   */
  validateInput(_data: TData): Error | null {
    return null;
  }

  /**
   * Create a new action instance with custom configuration.
   * @param config Configuration options to apply
   * @returns A new action instance with the specified configuration
   */
  withConfig(config: Partial<ActionConfig>): this {
    const newAction = Object.create(this);
    Object.assign(newAction, config);
    return newAction;
  }

  /**
   * Execute a service action with optional status broadcasting.
   * This provides a standardized way to handle service calls with consistent error handling.
   * @param options Configuration options for the service action execution
   * @returns Promise that resolves to the service result
   */
  protected async executeServiceAction(options: {
    suppressDefaultBroadcast?: boolean;
    data: TData;
    deps: TDeps;
    context: ActionContext;
    serviceCall: () => Promise<TResult>;
    contextName?: string;
    startMessage?: string;
    completionMessage?: string;
    additionalBroadcasting?: (result: TResult) => Promise<void>;
  }): Promise<TResult> {
    const {
      suppressDefaultBroadcast = false,
      data,
      deps,
      serviceCall,
      contextName,
      startMessage,
      completionMessage,
      additionalBroadcasting,
    } = options;

    // Check if we have status broadcasting capabilities
    const hasStatusBroadcaster =
      deps &&
      "statusBroadcaster" in deps &&
      deps.statusBroadcaster &&
      typeof (deps.statusBroadcaster as StatusBroadcaster)
        .addStatusEventAndBroadcast === "function";

    const hasImportId = data && "importId" in data && data.importId;

    // Broadcast start status if enabled
    if (!suppressDefaultBroadcast && hasImportId && hasStatusBroadcaster) {
      const finalContextName = contextName || this.name;
      const finalStartMessage = startMessage || `${this.name} started`;

      try {
        await (
          deps.statusBroadcaster as StatusBroadcaster
        ).addStatusEventAndBroadcast({
          importId: data.importId,
          status: "PROCESSING",
          message: finalStartMessage,
          context: finalContextName,
          indentLevel: 1,
        });
      } catch (error) {
        /* istanbul ignore next -- @preserve */
        this.logError(deps, `Failed to broadcast start status: ${error}`);
      }
    }

    // Call the service function
    /* istanbul ignore next -- @preserve */
    const result = await serviceCall();

    // Handle completion broadcasting
    if (hasImportId && hasStatusBroadcaster) {
      try {
        if (additionalBroadcasting) {
          // If additional broadcasting is provided, let it handle all completion messages
          // (This should always be called, even when suppressDefaultBroadcast is true)
          await additionalBroadcasting(result);
        } else if (!suppressDefaultBroadcast) {
          // Otherwise, send the standard completion message only if not suppressed
          const finalContextName = contextName || this.name;
          const finalCompletionMessage =
            completionMessage || `${this.name} completed`;

          await (
            deps.statusBroadcaster as StatusBroadcaster
          ).addStatusEventAndBroadcast({
            importId: data.importId,
            status: "COMPLETED",
            message: finalCompletionMessage,
            context: finalContextName,
            indentLevel: 1,
          });
        }
      } catch (error) {
        /* istanbul ignore next -- @preserve */
        this.logError(deps, `Failed to broadcast completion status: ${error}`);
      }
    }

    return result;
  }

  /**
   * Helper method to log errors consistently
   * @param deps Dependencies that may contain a logger
   * @param message Error message to log
   */
  private logError(deps: TDeps, message: string): void {
    /* istanbul ignore next -- @preserve */
    if (hasLogger(deps)) {
      /* istanbul ignore next -- @preserve */
      deps.logger.log(`[${this.name.toUpperCase()}] ${message}`, "error");
    } else {
      /* istanbul ignore next -- @preserve */
      console.error(`[${this.name.toUpperCase()}] ${message}`);
    }
  }
}

/**
 * Action that does nothing - useful for testing or as a placeholder.
 */
export class NoOpAction<
  TData extends BaseJobData = BaseJobData,
> extends BaseAction<TData, { logger?: SimpleLogger }> {
  name = ActionName.NO_OP;

  /**
   * Execute the no-op action
   * @param data Optional data to pass through
   * @returns The input data unchanged
   */
  async execute(
    data: TData,
    _deps?: { logger?: SimpleLogger }
  ): Promise<TData> {
    // No operation performed, just return the data
    return data;
  }
}

/**
 * Action that validates data and passes it through.
 */
export class ValidationAction<TData extends BaseJobData> extends BaseAction<
  TData,
  { logger?: SimpleLogger }
> {
  name = ActionName.VALIDATION;

  /**
   * Create a new validation action
   * @param validator Function that validates the data and returns an error if invalid
   */
  constructor(private validator: (data: TData) => Error | null) {
    super();
  }

  /**
   * Execute the validation action
   * @param data The data to validate
   * @returns The validated data
   * @throws Error if validation fails
   */
  async execute(data: TData): Promise<TData> {
    const error = this.validator(data);
    if (error) throw error;
    return data;
  }

  retryable = false;
}

/**
 * Action that logs information about the job.
 */
export class LoggingAction<
  TData extends BaseJobData = BaseJobData,
> extends BaseAction<TData, { logger?: SimpleLogger }> {
  name = ActionName.LOGGING;

  /**
   * Create a new logging action
   * @param message Static message or function that generates a message from data and context
   */
  constructor(
    private message: string | ((data: TData, context: ActionContext) => string)
  ) {
    super();
  }

  /**
   * Execute the logging action
   * @param data The data being processed
   * @param deps Dependencies including optional logger
   * @param context Context information about the job
   * @returns The input data unchanged
   */
  async execute(
    data: TData,
    deps: { logger?: SimpleLogger },
    context: ActionContext
  ): Promise<TData> {
    const logMessage =
      typeof this.message === "function"
        ? this.message(data, context)
        : this.message;

    // Check if logger exists and has a proper log method
    if (deps.logger && typeof deps.logger.log === "function") {
      deps.logger.log(`[${context.jobId}] ${logMessage}`);
    } else {
      console.log(`[${context.jobId}] ${logMessage}`);
    }
    return data;
  }

  retryable = false;
}
