import type {
  InstructionJobData,
  InstructionWorkerDependencies,
} from "./types";

import { ActionName } from "../../types";
import type { BaseAction } from "../core/base-action";
import type { ActionContext } from "../core/types";

/**
 * Context object providing the necessary methods and dependencies for building the instruction pipeline.
 */
export interface InstructionPipelineContext {
  /**
   * Adds status actions to the pipeline if required.
   * @param actions - The array of actions to append to.
   * @param data - The job data for the instruction.
   */
  addStatusActions: (
    actions: BaseAction<InstructionJobData, InstructionJobData>[],
    data: InstructionJobData
  ) => void;
  /**
   * Creates a wrapped action for the pipeline.
   * @param actionName - The name of the action to create.
   * @param dependencies - The dependencies required by the action.
   */
  createWrappedAction: (
    actionName: ActionName,
    dependencies?: InstructionWorkerDependencies
  ) => BaseAction<InstructionJobData, InstructionJobData>;
  /**
   * Creates an error-handled action for the pipeline.
   * @param actionName - The name of the action to create.
   * @param dependencies - The dependencies required by the action.
   */
  createErrorHandledAction: (
    actionName: ActionName,
    dependencies?: InstructionWorkerDependencies
  ) => BaseAction<InstructionJobData, InstructionJobData>;
  /**
   * The dependencies object for the instruction worker.
   */
  dependencies: InstructionWorkerDependencies;
}

/**
 * Builds the action pipeline for instruction processing jobs.
 * Receives only the functions and dependencies it needs.
 *
 * @param ctx - The pipeline context providing methods and dependencies.
 * @param data - The job data for the instruction.
 * @param _context - The action context (unused).
 * @returns An array of actions representing the pipeline.
 */
export function createInstructionPipeline(
  ctx: InstructionPipelineContext,
  data: InstructionJobData,
  _context: ActionContext
): BaseAction<InstructionJobData, InstructionJobData>[] {
  const actions: BaseAction<InstructionJobData, InstructionJobData>[] = [];

  // Add standard status actions if we have a noteId
  ctx.addStatusActions(actions, data);

  // Add instruction count update if we have tracking information
  if (
    data.importId &&
    typeof data.currentInstructionIndex === "number" &&
    typeof data.totalInstructions === "number"
  ) {
    actions.push(
      ctx.createWrappedAction(
        ActionName.UPDATE_INSTRUCTION_COUNT,
        ctx.dependencies
      )
    );
  }

  // 1. Process instruction line (with retry and error handling)
  actions.push(
    ctx.createWrappedAction(
      ActionName.PROCESS_INSTRUCTION_LINE,
      ctx.dependencies
    )
  );

  // 2. Save instruction line (with retry and error handling)
  actions.push(
    ctx.createWrappedAction(ActionName.SAVE_INSTRUCTION_LINE, ctx.dependencies)
  );

  // 3. Check completion status and broadcast if all jobs are done
  actions.push(
    ctx.createErrorHandledAction(ActionName.COMPLETION_STATUS, ctx.dependencies)
  );

  return actions;
}
