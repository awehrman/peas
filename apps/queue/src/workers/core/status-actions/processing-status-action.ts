import { ActionName } from "../../../types";
import type { BaseJobData } from "../../types";
import { BaseAction } from "../base-action";
import type { ActionContext } from "../types";

// Define types for dependencies and data
interface StatusBroadcaster {
  addStatusEventAndBroadcast: (event: {
    importId: string;
    noteId?: string;
    status: string;
    message: string;
    context: string;
    indentLevel: number;
    metadata: Record<string, unknown>;
  }) => Promise<void>;
}

interface StatusDeps {
  statusBroadcaster?: StatusBroadcaster;
}

interface NoteData extends BaseJobData {
  importId: string;
  noteId?: string;
}

/**
 * Action for broadcasting processing status in a worker pipeline.
 */
export class ProcessingStatusAction<
  TData extends NoteData = NoteData,
  TDeps extends StatusDeps = StatusDeps,
> extends BaseAction<TData, TDeps, void> {
  public name = ActionName.PROCESSING_STATUS;

  async execute(
    data: TData,
    deps: TDeps,
    context: ActionContext
  ): Promise<void> {
    // Check if we have status broadcaster in dependencies
    if (deps?.statusBroadcaster && data.importId) {
      try {
        await deps.statusBroadcaster.addStatusEventAndBroadcast({
          importId: data.importId,
          noteId: data.noteId,
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
