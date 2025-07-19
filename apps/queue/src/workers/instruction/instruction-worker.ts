import { Queue } from "bullmq";
import { BaseWorker } from "../core/base-worker";
import { ActionContext } from "../core/types";
import { registerInstructionActions } from "./actions";
import { IServiceContainer } from "../../services/container";
import type {
  InstructionWorkerDependencies,
  InstructionJobData,
} from "./types";
import type { BaseAction } from "../core/base-action";

/**
 * Instruction Worker that extends BaseWorker for instruction processing
 */
export class InstructionWorker extends BaseWorker<
  InstructionJobData,
  InstructionWorkerDependencies
> {
  protected registerActions(): void {
    registerInstructionActions(this.actionFactory);
  }

  protected getOperationName(): string {
    return "instruction_processing";
  }

  /**
   * Override addStatusActions to prevent generic status messages when we have instruction tracking
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

  protected createActionPipeline(
    data: InstructionJobData,
    _context: ActionContext
  ): BaseAction<unknown, unknown>[] {
    const actions: BaseAction<unknown, unknown>[] = [];

    // Add standard status actions if we have a noteId
    this.addStatusActions(actions, data);

    // Add instruction count update if we have tracking information
    if (
      data.importId &&
      typeof data.currentInstructionIndex === "number" &&
      typeof data.totalInstructions === "number"
    ) {
      actions.push(
        this.createWrappedAction("update_instruction_count", this.dependencies)
      );
    }

    // 1. Process instruction line (with retry and error handling)
    actions.push(
      this.createWrappedAction("process_instruction_line", this.dependencies)
    );

    // 2. Save instruction line (with retry and error handling)
    actions.push(
      this.createWrappedAction("save_instruction_line", this.dependencies)
    );

    // 3. Check completion status and broadcast if all jobs are done
    actions.push(
      this.createErrorHandledAction("completion_status", this.dependencies)
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
      updateInstructionLine: async (
        id: string,
        data: Record<string, unknown>
      ) => {
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
      createInstructionSteps: async (steps: Array<Record<string, unknown>>) => {
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
      // Add job completion tracker methods from the container's database service
      updateNoteCompletionTracker:
        container.database.updateNoteCompletionTracker,
      incrementNoteCompletionTracker:
        container.database.incrementNoteCompletionTracker,
      checkNoteCompletion: container.database.checkNoteCompletion,
      getNoteTitle: container.database.getNoteTitle,
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
