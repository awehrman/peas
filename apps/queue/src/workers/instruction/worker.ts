import { registerInstructionActions } from "./actions";
import { createInstructionWorkerDependencies } from "./dependencies";
import { createInstructionPipeline } from "./pipeline";
import type {
  InstructionJobData,
  InstructionWorkerDependencies,
} from "./types";

import { Queue } from "bullmq";

import { WORKER_CONSTANTS } from "../../config/constants";
import { IServiceContainer } from "../../services/container";
import type { BaseAction } from "../core/base-action";
import { BaseWorker } from "../core/base-worker";
import { ActionContext } from "../core/types";

/**
 * Worker responsible for processing instruction jobs.
 * Extends BaseWorker and orchestrates the instruction action pipeline.
 */
export class InstructionWorker extends BaseWorker<
  InstructionJobData,
  InstructionWorkerDependencies
> {
  /**
   * Registers all instruction-related actions with the action factory.
   */
  protected registerActions(): void {
    registerInstructionActions(this.actionFactory);
  }

  /**
   * Returns the operation name for this worker (used in logging and status).
   */
  protected getOperationName(): string {
    return WORKER_CONSTANTS.NAMES.INSTRUCTION;
  }

  /**
   * Adds status actions to the pipeline, but skips generic status actions in favor of custom instruction tracking.
   *
   * @param actions - The array of actions to append to.
   * @param data - The job data for the instruction.
   */
  protected addStatusActions(
    actions: BaseAction<unknown, unknown>[],
    data: InstructionJobData
  ): void {
    this.dependencies.logger.log(
      `[${this.getOperationName().toUpperCase()}] addStatusActions called with data: noteId=${data.noteId}, hasNoteId=${!!data.noteId}, dataKeys=${Object.keys(data).join(", ")}`
    );

    // Skip both processing and completion status actions since we handle them specifically
    this.dependencies.logger.log(
      `[${this.getOperationName().toUpperCase()}] Skipping generic status actions - using custom instruction tracking`
    );
    // Note: We don't add BroadcastProcessingAction or BroadcastCompletedAction here because we handle
    // status updates specifically with UpdateInstructionCountAction and InstructionCompletedStatusAction
  }

  /**
   * Builds the action pipeline for a given instruction job.
   * Delegates to createInstructionPipeline with the required context.
   *
   * @param data - The job data for the instruction.
   * @param _context - The action context (unused).
   * @returns An array of actions representing the pipeline.
   */
  protected createActionPipeline(
    data: InstructionJobData,
    _context: ActionContext
  ): BaseAction<unknown, unknown>[] {
    return createInstructionPipeline(
      {
        addStatusActions: this.addStatusActions.bind(this),
        createWrappedAction: this.createWrappedAction.bind(this),
        createErrorHandledAction: this.createErrorHandledAction.bind(this),
        dependencies: this.dependencies,
      },
      data,
      _context
    );
  }
}

/**
 * Factory function to create an instruction worker with dependencies from the service container.
 *
 * @param queue - The BullMQ queue instance for job processing.
 * @param container - The service container providing dependencies.
 * @returns A new instance of InstructionWorker.
 */
export function createInstructionWorker(
  queue: Queue,
  container: IServiceContainer
): InstructionWorker {
  const dependencies = createInstructionWorkerDependencies(container);
  return new InstructionWorker(queue, dependencies);
}
