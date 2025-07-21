import type { InstructionWorkerDependencies } from "./types";

import type { IServiceContainer } from "../../services/container";
import { InstructionService } from "../../services/instruction";
import { createBaseDependenciesFromContainer } from "../core/base-worker";

/**
 * Creates the dependencies object required by the InstructionWorker.
 * Wires together instruction-specific and shared database functions.
 *
 * @param container - The service container providing access to core services and database methods.
 * @returns The dependencies object for the instruction worker.
 */
export function createInstructionWorkerDependencies(
  container: IServiceContainer
): InstructionWorkerDependencies {
  const instructionService = new InstructionService(container);
  return {
    ...createBaseDependenciesFromContainer(container),
    database: {
      // instruction specific database functions
      updateInstructionLine:
        instructionService.updateInstructionLine.bind(instructionService),
      createInstructionSteps:
        instructionService.createInstructionSteps.bind(instructionService),
      // shared database functions
      updateNoteCompletionTracker:
        container.database.updateNoteCompletionTracker,
      incrementNoteCompletionTracker:
        container.database.incrementNoteCompletionTracker,
      checkNoteCompletion: container.database.checkNoteCompletion,
      getNoteTitle: container.database.getNoteTitle,
    },
  };
}
