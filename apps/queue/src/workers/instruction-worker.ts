import { Queue } from "bullmq";
import { BaseWorker } from "./core/base-worker";
import { ActionContext } from "./actions/core/types";
import {
  ProcessInstructionLineAction,
  SaveInstructionLineAction,
} from "./actions/instruction";
import { IServiceContainer } from "../services/container";
import type {
  InstructionWorkerDependencies,
  InstructionJobData,
  ActionPipeline,
  ParsedInstructionResult,
} from "./types";

// Using imported types from ./types.ts

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
  ): ActionPipeline<InstructionJobData, ParsedInstructionResult> {
    const actions: ActionPipeline<InstructionJobData, ParsedInstructionResult> =
      [];

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

    // Instruction-specific dependencies
    database: {
      updateInstructionLine: async (id: string, data: any) => {
        container.logger.log(
          `[INSTRUCTION] Updating instruction line ${id} with data: ${JSON.stringify(data)}`
        );
        // TODO: Implement actual database update
        const result = { id, ...data };
        container.logger.log(
          `[INSTRUCTION] Successfully updated instruction line ${id}`
        );
        return result;
      },
      createInstructionSteps: async (steps: any[]) => {
        container.logger.log(
          `[INSTRUCTION] Creating ${steps.length} instruction steps`
        );
        // TODO: Implement actual step creation
        const result = steps;
        container.logger.log(
          `[INSTRUCTION] Successfully created ${steps.length} instruction steps`
        );
        return result;
      },
    },
    parseInstruction: async (text: string) => {
      container.logger.log(
        `[INSTRUCTION] Parsing instruction text: "${text.substring(0, 50)}${text.length > 50 ? "..." : ""}"`
      );
      // TODO: Implement actual instruction parsing
      const result = {
        success: true,
        parseStatus: "CORRECT" as const,
        normalizedText: text,
        steps: [],
        processingTime: 0,
      };
      container.logger.log(
        `[INSTRUCTION] Parsing completed with status: ${result.parseStatus}`
      );
      return result;
    },
  };

  return new InstructionWorker(queue, dependencies);
}
