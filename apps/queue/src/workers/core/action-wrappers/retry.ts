/**
 * Wraps a BaseAction with retry logic.
 * Retries the action on failure according to the retry policy.
 */
import type { BaseJobData } from "../../types";
import { BaseAction } from "../base-action";
import type { ActionContext } from "../types";

export class RetryAction<
  TData extends BaseJobData = BaseJobData,
  TDeps extends object = object,
> extends BaseAction<TData, TDeps> {
  public name: string;
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
    this.name = `retry_wrapper(${action.name})`;
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
