import { updateInstructionLine } from "@peas/database";

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
        await statusBroadcaster.addStatusEventAndBroadcast({
          importId: data.importId,
          noteId: data.noteId,
          status: "AWAITING_PARSING",
          message: `Processing instruction line ${data.lineIndex}`,
          context: "instruction_processing",
          indentLevel: 1,
          metadata: {
            savedInstructionId: result.id,
            lineIndex: data.lineIndex,
          },
        });
        logger.log(
          `[SAVE_INSTRUCTION_LINE] Successfully broadcasted instruction completion for line ${data.lineIndex} with ID ${result.id}`
        );
      } catch (broadcastError) {
        logger.log(
          `[SAVE_INSTRUCTION_LINE] Failed to broadcast instruction completion: ${broadcastError}`
        );
        throw broadcastError;
      }
    } else {
      logger.log(`[SAVE_INSTRUCTION_LINE] StatusBroadcaster is not available`);
    }

    return data;
  } catch (error) {
    logger.log(`[SAVE_INSTRUCTION_LINE] Failed to save instruction: ${error}`);
    throw error;
  }
}
