import { ActionName } from "../../../types";
import type { BaseJobData, StatusDeps } from "../../types";
import { BaseAction } from "../base-action";
import type { ActionContext } from "../types";

/**
 * Action for broadcasting completed status in a worker pipeline.
 */
export class CompletedStatusAction<
  TData extends BaseJobData = BaseJobData,
  TDeps extends StatusDeps = StatusDeps,
> extends BaseAction<TData, TDeps, void> {
  public name = ActionName.COMPLETION_STATUS;

  async execute(
    data: TData,
    deps: TDeps,
    context: ActionContext
  ): Promise<void> {
    // Check if we have status broadcaster in dependencies and importId is available
    if (deps?.statusBroadcaster && "importId" in data && data.importId) {
      try {
        await deps.statusBroadcaster.addStatusEventAndBroadcast({
          importId: data.importId as string,
          noteId:
            "noteId" in data ? (data.noteId as string | undefined) : undefined,
          status: "COMPLETED",
          message: `Completed ${context.operation}`,
          context: context.operation,
          indentLevel: 1,
          metadata: {
            jobId: context.jobId,
            operation: context.operation,
          },
        });
      } catch (error) {
        console.error(`[COMPLETED_STATUS] Failed to broadcast: ${error}`);
      }
    }

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
