import { Queue } from "bullmq";
import {
  BaseWorker,
  BaseWorkerDependencies,
  BaseJobData,
} from "./core/base-worker";
import { BaseAction } from "./actions/core/base-action";
import { ActionContext } from "./actions/core/types";
import {
  ProcessInstructionLineAction,
  SaveInstructionLineAction,
} from "./actions/instruction";
import { IServiceContainer } from "../services/container";

export type InstructionWorkerDependencies = BaseWorkerDependencies;

export interface InstructionJobData extends BaseJobData {
  instructionLineId: string;
  originalText: string;
  lineIndex: number;
}

/**
 * Instruction Worker that extends BaseWorker for instruction processing
 */
export class InstructionWorker extends BaseWorker<
  InstructionJobData,
  InstructionWorkerDependencies
> {
  protected registerActions(): void {
    // Register instruction actions
    this.actionFactory.register(
      "process_instruction_line",
      () => new ProcessInstructionLineAction()
    );
    this.actionFactory.register(
      "save_instruction_line",
      () => new SaveInstructionLineAction()
    );
  }

  protected getOperationName(): string {
    return "instruction_processing";
  }

  protected createActionPipeline(
    data: InstructionJobData,
    _context: ActionContext
  ): BaseAction<any, any>[] {
    const actions: BaseAction<any, any>[] = [];

    // Add standard status actions if we have a noteId
    this.addStatusActions(actions, data);

    // 1. Process instruction line (with retry and error handling)
    actions.push(
      this.createWrappedAction("process_instruction_line", this.dependencies)
    );

    // 2. Save instruction line (with retry and error handling)
    actions.push(
      this.createWrappedAction("save_instruction_line", this.dependencies)
    );

    return actions;
  }
}

/**
 * Factory function to create an instruction worker with dependencies from the service container
 */
export function createInstructionWorker(
  queue: Queue,
  container: IServiceContainer
): InstructionWorker {
  const dependencies: InstructionWorkerDependencies = {
    // Base dependencies
    addStatusEventAndBroadcast:
      container.statusBroadcaster?.addStatusEventAndBroadcast ||
      (() => Promise.resolve()),
    ErrorHandler: container.errorHandler?.errorHandler || {
      withErrorHandling: async (operation) => operation(),
    },
    logger: container.logger,
  };

  return new InstructionWorker(queue, dependencies);
}
