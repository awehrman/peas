import { ActionContext, ActionResult, WorkerAction } from "./types";

/**
 * Abstract base class for all worker actions.
 * Provides timing, error handling, and config utilities.
 */
export abstract class BaseAction<TData = unknown, TDeps = unknown>
  implements WorkerAction<TData, TDeps>
{
  abstract name: string;
  abstract execute(
    data: TData,
    deps: TDeps,
    context: ActionContext
  ): Promise<unknown>;

  /** Whether this action should be retried on failure */
  retryable?: boolean = true;
  /** Priority of this action (lower numbers = higher priority) */
  priority?: number = 0;

  /**
   * Execute the action with timing and error handling.
   */
  async executeWithTiming(
    data: TData,
    deps: TDeps,
    context: ActionContext
  ): Promise<ActionResult<unknown>> {
    const startTime = Date.now();
    try {
      const result = await this.execute(data, deps, context);
      const duration = Date.now() - startTime;
      return { success: true, data: result, duration };
    } catch (error) {
      const duration = Date.now() - startTime;
      if (this.onError) {
        await this.onError(error as Error, data, deps, context);
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
   */
  onError?(
    error: Error,
    _data: TData,
    _deps: TDeps,
    context: ActionContext
  ): Promise<void>;

  /**
   * Validate input data - can be overridden by subclasses.
   */
  validateInput?(_data: TData): Error | null {
    return null;
  }

  /**
   * Create a new action instance with custom configuration.
   */
  withConfig(
    config: Partial<Pick<WorkerAction<TData, TDeps>, "retryable" | "priority">>
  ): this {
    const newAction = Object.create(this);
    Object.assign(newAction, config);
    return newAction;
  }
}

/**
 * Action that does nothing - useful for testing or as a placeholder.
 */
export class NoOpAction extends BaseAction<unknown, unknown> {
  name = "no_op";
  async execute(data?: unknown): Promise<unknown> {
    // No operation performed, just return the data
    return data;
  }
  validateInput = undefined;
}

/**
 * Action that validates data and passes it through.
 */
export class ValidationAction<TData> extends BaseAction<TData, unknown> {
  name = "validation";
  constructor(private validator: (data: TData) => Error | null) {
    super();
  }
  async execute(data: TData): Promise<TData> {
    const error = this.validator(data);
    if (error) throw error;
    return data;
  }
  retryable = false;
  validateInput = undefined;
}

/**
 * Action that logs information about the job.
 */
export class LoggingAction extends BaseAction<
  unknown,
  { logger?: { log: (message: string) => void } }
> {
  name = "logging";
  constructor(
    private message:
      | string
      | ((data: unknown, context: ActionContext) => string)
  ) {
    super();
  }
  async execute(
    data: unknown,
    deps: { logger?: { log: (message: string) => void } },
    context: ActionContext
  ): Promise<unknown> {
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
  validateInput = undefined;
}
