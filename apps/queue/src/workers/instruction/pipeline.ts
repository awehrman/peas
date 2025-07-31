import type {
  InstructionJobData,
  InstructionWorkerDependencies,
} from "./dependencies";

import { ActionName } from "../../types";
import type { ActionFactory } from "../core/action-factory";
import type { ActionContext, WorkerAction } from "../core/types";

/**
 * Creates the action pipeline for instruction processing using the factory approach.
 * @param actionFactory - The action factory to create actions
 * @param dependencies - Worker dependencies
 * @param data - Job data to determine conditional actions
 * @param context - Action context
 * @returns Array of instruction pipeline actions
 */
export function createInstructionPipeline(
  actionFactory: ActionFactory<
    InstructionJobData,
    InstructionWorkerDependencies,
    InstructionJobData
  >,
  dependencies: InstructionWorkerDependencies,
  _data: InstructionJobData,
  _context: ActionContext
): WorkerAction<
  InstructionJobData,
  InstructionWorkerDependencies,
  InstructionJobData
>[] {
  const actions: WorkerAction<
    InstructionJobData,
    InstructionWorkerDependencies,
    InstructionJobData
  >[] = [];

  // Always start with format instruction
  actions.push(
    actionFactory.create(ActionName.FORMAT_INSTRUCTION, dependencies)
  );

  // Always save the formatted instruction
  actions.push(actionFactory.create(ActionName.SAVE_INSTRUCTION, dependencies));

  return actions;
}
