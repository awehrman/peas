import {
  getInstructionCompletionStatus,
  updateInstructionLine,
} from "@peas/database";

import { ActionName } from "../../../../types";
import type { StructuredLogger } from "../../../../types";
import type { InstructionJobData } from "../../../../workers/instruction/dependencies";

export async function saveInstruction(
  data: InstructionJobData,
  logger: StructuredLogger,
  statusBroadcaster?: {
    addStatusEventAndBroadcast: (
      event: Record<string, unknown>
    ) => Promise<Record<string, unknown>>;
  }
): Promise<InstructionJobData> {
  try {
    // Validate that we have required data
    if (!data.noteId) {
      throw new Error("No note ID available for instruction saving");
    }

    if (!data.instructionReference) {
      throw new Error("No instruction reference available for saving");
    }

    logger.log(
      `[SAVE_INSTRUCTION_LINE] Starting to save instruction: noteId=${data.noteId}, lineIndex=${data.lineIndex}, jobId=${data.jobId}`
    );

    // Update the instruction line in the database
    const result = await updateInstructionLine(
      data.noteId,
      data.lineIndex,
      data.instructionReference,
      "COMPLETED_SUCCESSFULLY",
      data.isActive
    );

    // Broadcast completion message if statusBroadcaster is available
    if (statusBroadcaster) {
      logger.log(
        `[SAVE_INSTRUCTION_LINE] StatusBroadcaster is available, broadcasting completion`
      );

      try {
        // Get completion status for broadcasting
        const completionStatus = await getInstructionCompletionStatus(
          data.noteId
        );

        // Only broadcast at meaningful milestones to prevent UI resets
        const shouldBroadcast =
          completionStatus.isComplete || // All done
          completionStatus.completedInstructions %
            Math.max(1, Math.floor(completionStatus.totalInstructions / 4)) ===
            0; // Every 25% milestone

        /* istanbul ignore else -- @preserve */
        if (shouldBroadcast) {
          /* istanbul ignore next -- @preserve */
          await statusBroadcaster.addStatusEventAndBroadcast({
            importId: data.importId,
            noteId: data.noteId,
            status: completionStatus.isComplete ? "COMPLETED" : "PROCESSING",
            message: completionStatus.isComplete
              ? `All ${completionStatus.totalInstructions} instructions processed`
              : `Processing ${completionStatus.completedInstructions}/${completionStatus.totalInstructions} instructions`,
            context: "instruction_processing",
            currentCount: completionStatus.completedInstructions,
            totalCount: completionStatus.totalInstructions,
            indentLevel: 1,
            metadata: {
              totalInstructions: completionStatus.totalInstructions,
              completedInstructions: completionStatus.completedInstructions,
              savedInstructionId: result.id,
              lineIndex: data.lineIndex,
            },
          });
          logger.log(
            `[SAVE_INSTRUCTION_LINE] Successfully broadcasted instruction completion for line ${data.lineIndex} with ID ${result.id}`
          );
        }

        // Check if all instructions are completed and trigger completion check
        /* istanbul ignore next -- @preserve */
        if (completionStatus.isComplete) {
          /* istanbul ignore next -- @preserve */
          logger.log(
            `[SAVE_INSTRUCTION_LINE] All instructions completed for note ${data.noteId}, triggering completion check`
          );

          /* istanbul ignore next -- @preserve */
          try {
            // Import queue dynamically to avoid circular dependencies
            /* istanbul ignore next -- @preserve */
            const { createQueue } = await import(
              "../../../../queues/create-queue"
            );
            const instructionQueue = createQueue("instruction");

            await instructionQueue.add(
              ActionName.CHECK_INSTRUCTION_COMPLETION,
              {
                noteId: data.noteId,
                importId: data.importId,
                jobId: `${data.noteId}-instruction-completion-check`,
                metadata: {},
              },
              {
                removeOnComplete: 100,
                removeOnFail: 50,
                attempts: 3,
                backoff: {
                  type: "exponential",
                  delay: 1000,
                },
              }
            );

            logger.log(
              `[SAVE_INSTRUCTION_LINE] Successfully queued completion check for note ${data.noteId}`
            );
          } catch (queueError) {
            /* istanbul ignore next -- @preserve */
            logger.log(
              `[SAVE_INSTRUCTION_LINE] Failed to queue completion check: ${queueError}`
            );
            // Don't fail the main save operation if completion check fails
          }
        }
      } catch (broadcastError) {
        /* istanbul ignore next -- @preserve */
        logger.log(
          `[SAVE_INSTRUCTION_LINE] Failed to broadcast instruction completion: ${broadcastError}`
        );
        throw broadcastError;
      }
    } else {
      /* istanbul ignore next -- @preserve */
      logger.log(`[SAVE_INSTRUCTION_LINE] StatusBroadcaster is not available`);
    }

    return data;
  } catch (error) {
    /* istanbul ignore next -- @preserve */
    logger.log(`[SAVE_INSTRUCTION_LINE] Failed to save instruction: ${error}`);
    throw error;
  }
}
