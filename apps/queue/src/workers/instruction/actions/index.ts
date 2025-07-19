export * from "./process-instruction-line";
export * from "./save-instruction-line";
export * from "./update-instruction-count";
export * from "./instruction-completed-status";

import { ActionFactory } from "../../core/action-factory";
import { ProcessInstructionLineAction } from "./process-instruction-line";
import { SaveInstructionLineAction } from "./save-instruction-line";
import { UpdateInstructionCountAction } from "./update-instruction-count";
import { InstructionCompletedStatusAction } from "./instruction-completed-status";
import {
  registerActions,
  createActionRegistration,
} from "../../shared/action-registry";

/**
 * Register all instruction actions in the given ActionFactory
 */
export function registerInstructionActions(factory: ActionFactory): void {
  registerActions(factory, [
    createActionRegistration(
      "process_instruction_line",
      ProcessInstructionLineAction
    ),
    createActionRegistration(
      "save_instruction_line",
      SaveInstructionLineAction
    ),
    createActionRegistration(
      "update_instruction_count",
      UpdateInstructionCountAction
    ),
    createActionRegistration(
      "instruction_completed_status",
      InstructionCompletedStatusAction
    ),
  ]);
}
