import { ParseStatus } from "@peas/database";

import type { IServiceContainer } from "../../services/container";
import type { BaseWorkerDependencies } from "../types";

/**
 * Dependencies required by the InstructionWorker
 */
export interface InstructionWorkerDependencies extends BaseWorkerDependencies {
  /** Business logic services */
  services: {
    /**
     * Format instruction text (trim whitespace, add punctuation, etc.)
     */
    formatInstruction: (
      data: InstructionJobData
    ) => Promise<InstructionJobData>;
    /**
     * Save instruction to database
     */
    saveInstruction: (data: InstructionJobData) => Promise<InstructionJobData>;
  };
  /** Status broadcaster for completion messages */
  statusBroadcaster?: {
    addStatusEventAndBroadcast: (
      event: Record<string, unknown>
    ) => Promise<Record<string, unknown>>;
  };
}

/**
 * Job data for instruction processing
 */
export interface InstructionJobData {
  noteId: string;
  instructionReference: string;
  lineIndex: number;
  importId?: string;
  jobId?: string;
  metadata?: Record<string, unknown>;
  parseStatus: ParseStatus;
  isActive: boolean;
}

/**
 * Build instruction worker dependencies from the service container
 * @param serviceContainer The service container
 * @returns Instruction worker dependencies
 */
export function buildInstructionDependencies(
  serviceContainer: IServiceContainer
): InstructionWorkerDependencies {
  return {
    logger: serviceContainer.logger,
    statusBroadcaster: serviceContainer.statusBroadcaster,
    services: {
      formatInstruction: async (data: InstructionJobData) => {
        // Import and use the actual format instruction service
        const { formatInstruction } = await import(
          "../../services/instruction/actions/format-instruction/service"
        );
        return formatInstruction(data, serviceContainer.logger);
      },
      saveInstruction: async (data: InstructionJobData) => {
        // Import and use the actual save instruction service
        const { saveInstruction } = await import(
          "../../services/instruction/actions/save-instruction/service"
        );
        return saveInstruction(
          data,
          serviceContainer.logger,
          serviceContainer.statusBroadcaster
        );
      },
    },
  };
}
