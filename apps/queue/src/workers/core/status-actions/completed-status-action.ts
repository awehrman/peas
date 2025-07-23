import type { BaseJobData } from "../../types";
import { BaseAction } from "../base-action";
import type { ActionContext } from "../types";

/**
 * Action for broadcasting completed status in a worker pipeline.
 */
export class CompletedStatusAction<
  TData extends BaseJobData = BaseJobData,
  TDeps extends object = object,
> extends BaseAction<TData, TDeps, void> {
  public name = "completed_status_action";

  async execute(
    data: TData,
    deps: TDeps,
    context: ActionContext
  ): Promise<void> {
    // Implement broadcasting logic here
    // For now, just log

    console.log(
      `[${context.operation}] Completed status for job ${context.jobId}`
    );
  }

  async executeWithTiming(data: TData, deps: TDeps, context: ActionContext) {
    return super.executeWithTiming(data, deps, context);
  }

  withConfig(
    config: Partial<
      Pick<BaseAction<TData, TDeps, void>, "retryable" | "priority">
    >
  ): this {
    return super.withConfig(config);
  }
}
