import { buildInstructionDependencies } from "./dependencies";
import type {
  InstructionJobData,
  InstructionWorkerDependencies,
} from "./dependencies";
import { createInstructionPipeline } from "./pipeline";

import { Queue } from "bullmq";

import { IServiceContainer } from "../../services/container";
import { registerInstructionActions } from "../../services/instruction/register";
import { ActionFactory } from "../core/action-factory";
import { BaseWorker } from "../core/base-worker";
import type { ActionContext, WorkerAction } from "../core/types";

/**
 * InstructionWorker class that extends BaseWorker for processing instruction jobs
 */
export class InstructionWorker extends BaseWorker<
  InstructionJobData,
  InstructionWorkerDependencies,
  InstructionJobData
> {
  protected actionFactory: ActionFactory<
    InstructionJobData,
    InstructionWorkerDependencies,
    InstructionJobData
  >;

  constructor(
    queue: Queue,
    dependencies: InstructionWorkerDependencies,
    actionFactory: ActionFactory<
      InstructionJobData,
      InstructionWorkerDependencies,
      InstructionJobData
    >,
    container: IServiceContainer
  ) {
    super(queue, dependencies, actionFactory, container);
    this.actionFactory = actionFactory;
    this.registerActions();
  }

  /**
   * Register actions specific to instruction processing
   * This is where all instruction-related actions are registered with the factory
   */
  protected registerActions(): void {
    // Register all instruction actions using the centralized registration function
    registerInstructionActions(this.actionFactory);
  }

  /**
   * Get the operation name for this worker
   */
  protected getOperationName(): string {
    return "instruction-worker";
  }

  /**
   * Create the action pipeline for instruction processing
   */
  protected createActionPipeline(
    data: InstructionJobData,
    context: ActionContext
  ): WorkerAction<
    InstructionJobData,
    InstructionWorkerDependencies,
    InstructionJobData
  >[] {
    return createInstructionPipeline(
      this.actionFactory,
      this.dependencies,
      data,
      context
    );
  }
}

/**
 * Create an instruction worker instance
 */
export function createInstructionWorker(
  queue: Queue,
  container: IServiceContainer
): InstructionWorker {
  const dependencies = buildInstructionDependencies(container);
  const actionFactory = new ActionFactory<
    InstructionJobData,
    InstructionWorkerDependencies,
    InstructionJobData
  >();

  return new InstructionWorker(queue, dependencies, actionFactory, container);
}
