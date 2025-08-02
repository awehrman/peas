import { ActionName } from "../../types";
import type { InstructionJobData, InstructionWorkerDependencies } from "../../workers/instruction/dependencies";
import { ActionFactory } from "../../workers/core/action-factory";
import {
  createActionRegistration,
  registerActions,
} from "../../workers/shared/action-registry";

import { FormatInstructionAction } from "./actions/format-instruction/action";
import { SaveInstructionAction } from "./actions/save-instruction/action";

/**
 * Register all instruction actions in the given ActionFactory with type safety
 */
export function registerInstructionActions(
  factory: ActionFactory<
    InstructionJobData,
    InstructionWorkerDependencies,
    InstructionJobData
  >
): void {
  if (!factory || typeof factory !== "object") {
    throw new Error("Invalid factory");
  }
  registerActions(factory, [
    createActionRegistration<
      InstructionJobData,
      InstructionWorkerDependencies,
      InstructionJobData
    >(ActionName.FORMAT_INSTRUCTION_LINE, FormatInstructionAction),
    createActionRegistration<
      InstructionJobData,
      InstructionWorkerDependencies,
      InstructionJobData
    >(ActionName.SAVE_INSTRUCTION_LINE, SaveInstructionAction),
  ]);
} 