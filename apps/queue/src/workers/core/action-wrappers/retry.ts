/**
 * Wraps a BaseAction with retry logic.
 * Retries the action on failure according to the retry policy.
 */
import { ActionName } from "../../../types";
import type { BaseJobData } from "../../types";
import { BaseAction } from "../base-action";
import type { ActionContext } from "../types";
import type { StructuredLogger } from "../types";
import type { ActionFactory } from "../action-factory";

export class RetryAction<
  TData extends BaseJobData = BaseJobData,
  TDeps extends object = object,
> extends BaseAction<TData, TDeps> {
  public name: ActionName;
  private wrappedAction: BaseAction<TData, TDeps>;
  private maxRetries: number;
  private retryDelayMs: number;

  constructor(
    action: BaseAction<TData, TDeps>,
    maxRetries = 3,
    retryDelayMs = 1000
  ) {
    super();
    this.wrappedAction = action;
    this.name = ActionName.RETRY_WRAPPER;
    this.maxRetries = maxRetries;
    this.retryDelayMs = retryDelayMs;
  }

  async execute(
    data: TData,
    deps: TDeps,
    context: ActionContext
  ): Promise<unknown> {
    let attempt = 0;
    let lastError: unknown;
    while (attempt <= this.maxRetries) {
      try {
        return await this.wrappedAction.execute(data, deps, context);
      } catch (error) {
        lastError = error;
        attempt++;
        if (attempt > this.maxRetries) break;

        console.warn(
          `Retrying action ${this.name} for job ${context.jobId} (attempt ${attempt}/${this.maxRetries}) due to error:`,
          error instanceof Error ? error.message : String(error)
        );
        await new Promise((resolve) => setTimeout(resolve, this.retryDelayMs));
      }
    }
    throw lastError;
  }

  async executeWithTiming(data: TData, deps: TDeps, context: ActionContext) {
    return this.wrappedAction.executeWithTiming(data, deps, context);
  }

  withConfig(
    config: Partial<Pick<BaseAction<TData, TDeps>, "retryable" | "priority">>
  ): this {
    // Return a new wrapper of the same type, wrapping the configured action
    return new RetryAction(
      this.wrappedAction.withConfig(config),
      this.maxRetries,
      this.retryDelayMs
    ) as this;
  }
}

/**
 * Wraps an action with retry and error handling
 */
export function wrapActionWithRetryAndErrorHandling<
  TData extends BaseJobData = BaseJobData,
  TDeps extends object = object,
>(action: BaseAction<TData, TDeps>): BaseAction<TData, TDeps> {
  return new RetryAction(action);
}

/**
 * Factory-based wrapper for retry and error handling
 */
export function wrapActionWithRetryAndErrorHandlingFactory<
  TData extends BaseJobData = BaseJobData,
  TDeps extends object = object,
>(
  actionFactory: ActionFactory<TData, TDeps>,
  actionName: ActionName
): BaseAction<TData, TDeps> {
  const action = actionFactory.create(actionName, {} as TDeps) as BaseAction<TData, TDeps>;
  return new RetryAction(action);
}

export interface RetryConfig {
  maxRetries: number;
  backoffMs: number;
  backoffMultiplier: number;
  maxBackoffMs: number;
}

export interface RetryDeps {
  logger?: StructuredLogger;
}

export interface RetryData extends BaseJobData {
  retryCount?: number;
}

/**
 * Retry wrapper that automatically retries failed actions with exponential backoff
 */
export function createRetryWrapper<
  TData extends RetryData,
  TDeps extends object,
>(config: RetryConfig) {
  return (action: BaseAction<TData, TDeps>) => {
    return {
      ...action,
      async execute(
        data: TData,
        deps: TDeps,
        context: ActionContext
      ): Promise<unknown> {
        let lastError: Error;
        let attempt = 0;
        const maxAttempts = config.maxRetries + 1;

        while (attempt < maxAttempts) {
          try {
            return await action.execute(data, deps, context);
          } catch (error) {
            lastError = error as Error;
            attempt++;

            if (attempt >= maxAttempts) {
              break;
            }

            // Calculate backoff delay
            const delay = Math.min(
              config.backoffMs *
                Math.pow(config.backoffMultiplier, attempt - 1),
              config.maxBackoffMs
            );

            // Log retry attempt
            if (deps && typeof deps === "object" && "logger" in deps) {
              const logger = (deps as RetryDeps).logger;
              logger?.log(
                `[RETRY] Action ${action.name} failed (attempt ${attempt}/${maxAttempts}), retrying in ${delay}ms: ${lastError.message}`
              );
            }

            // Wait before retry
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }

        // All attempts failed
        throw lastError!;
      },
    };
  };
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  backoffMs: 1000,
  backoffMultiplier: 2,
  maxBackoffMs: 10000,
};
