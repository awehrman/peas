import { ActionName } from "../../../types";
import type { BaseJobData, StatusDeps } from "../../types";
import { BaseAction } from "../base-action";
import type { ActionContext } from "../types";

/**
 * Action for broadcasting processing status in a worker pipeline.
 */
export class ProcessingStatusAction<
  TData extends BaseJobData = BaseJobData,
  TDeps extends StatusDeps = StatusDeps,
> extends BaseAction<TData, TDeps, void> {
  public name = ActionName.PROCESSING_STATUS;

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
          status: "PROCESSING",
          message: `Processing ${context.operation}`,
          context: context.operation,
          indentLevel: 1,
          metadata: {
            jobId: context.jobId,
            operation: context.operation,
          },
        });
      } catch (error) {
        console.error(`[PROCESSING_STATUS] Failed to broadcast: ${error}`);
      }
    }

    console.log(
      `[${context.operation}] Processing status for job ${context.jobId}`
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
