/**
 * Wraps a BaseAction with error handling logic.
 * Catches errors and delegates to the action's onError handler or logs by default.
 */
import { ActionName } from "../../../types";
import type { BaseJobData } from "../../types";
import { BaseAction } from "../base-action";
import type { ActionContext } from "../types";

export class ErrorHandlingAction<
  TData extends BaseJobData = BaseJobData,
  TDeps extends object = object,
> extends BaseAction<TData, TDeps> {
  public name: ActionName;
  private wrappedAction: BaseAction<TData, TDeps>;

  constructor(action: BaseAction<TData, TDeps>) {
    super();
    this.wrappedAction = action;
    this.name = ActionName.ERROR_HANDLING;
  }

  async execute(
    data: TData,
    deps: TDeps,
    context: ActionContext
  ): Promise<unknown> {
    try {
      return await this.wrappedAction.execute(data, deps, context);
    } catch (error) {
      if (this.wrappedAction.onError) {
        await this.wrappedAction.onError(error as Error, data, deps, context);
      } else {
        // Default error logging

        console.error(
          `Action ${this.name} failed for job ${context.jobId}:`,
          error instanceof Error ? error.message : String(error)
        );
      }
      throw error;
    }
  }

  async executeWithTiming(data: TData, deps: TDeps, context: ActionContext) {
    return this.wrappedAction.executeWithTiming(data, deps, context);
  }

  withConfig(
    config: Partial<Pick<BaseAction<TData, TDeps>, "retryable" | "priority">>
  ): this {
    // Return a new wrapper of the same type, wrapping the configured action
    return new ErrorHandlingAction(
      this.wrappedAction.withConfig(config)
    ) as this;
  }
}

/**
 * Wraps an action with error handling only
 */
export function wrapActionWithErrorHandlingOnly<
  TData extends BaseJobData = BaseJobData,
  TDeps extends object = object,
>(action: BaseAction<TData, TDeps>): BaseAction<TData, TDeps> {
  return new ErrorHandlingAction(action);
}
