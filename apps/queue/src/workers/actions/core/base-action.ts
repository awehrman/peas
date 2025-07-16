import { WorkerAction, ActionContext, ActionResult } from "./types";

/**
 * Abstract base class for all worker actions.
 * Provides timing, error handling, and config utilities.
 */
export abstract class BaseAction<TData = any, TDeps = any>
  implements WorkerAction<TData, TDeps>
{
  abstract name: string;
  abstract execute(
    data: TData,
    deps: TDeps,
    context: ActionContext
  ): Promise<any>;

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
  ): Promise<ActionResult> {
    const startTime = Date.now();
    try {
      const result = await this.execute(data, deps, context);
      const duration = Date.now() - startTime;
      return { success: true, data: result, duration };
    } catch (error) {
      const duration = Date.now() - startTime;
      if (this.onError) {
        await this.onError(error as Error, data, deps, context);
      }
      return { success: false, error: error as Error, duration };
    }
  }

  /**
   * Default error handler - can be overridden by subclasses.
   */
  async onError?(
    error: Error,
    data: TData,
    deps: TDeps,
    context: ActionContext
  ): Promise<void> {
    // Default: log to console
    console.error(
      `Action ${this.name} failed for job ${context.jobId}:`,
      error.message
    );
  }

  /**
   * Validate input data - can be overridden by subclasses.
   */
  validateInput?(data: TData): Error | null {
    return null;
  }

  /**
   * Create a new action instance with custom configuration.
   */
  withConfig(
    config: Partial<Pick<WorkerAction, "retryable" | "priority">>
  ): this {
    const newAction = Object.create(this);
    Object.assign(newAction, config);
    return newAction;
  }
}

/**
 * Action that does nothing - useful for testing or as a placeholder.
 */
export class NoOpAction extends BaseAction<any, any> {
  name = "no_op";
  async execute(_data?: any): Promise<void> {
    // No operation performed
  }
}

/**
 * Action that validates data and passes it through.
 */
export class ValidationAction<TData> extends BaseAction<TData, any> {
  name = "validation";
  constructor(private validator: (data: TData) => Error | null) {
    super();
  }
  async execute(_data: TData): Promise<TData> {
    const error = this.validator(_data);
    if (error) throw error;
    return _data;
  }
  retryable = false;
}

/**
 * Action that logs information about the job.
 */
export class LoggingAction extends BaseAction<any, any> {
  name = "logging";
  constructor(
    private message: string | ((data: any, context: ActionContext) => string)
  ) {
    super();
  }
  async execute(data: any, deps: any, context: ActionContext): Promise<any> {
    const logMessage =
      typeof this.message === "function"
        ? this.message(data, context)
        : this.message;
    if (deps.logger) {
      deps.logger.log(`[${context.jobId}] ${logMessage}`);
    } else {
      console.log(`[${context.jobId}] ${logMessage}`);
    }
    return data;
  }
  retryable = false;
}
