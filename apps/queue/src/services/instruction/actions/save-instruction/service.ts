import {
  getInstructionCompletionStatus,
  updateInstructionLine,
} from "@peas/database";

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

    // Update the instruction line in the database
    await updateInstructionLine(
      data.noteId,
      data.lineIndex,
      data.instructionReference,
      "CORRECT",
      data.isActive
    );

    // Broadcast completion message if statusBroadcaster is available
    if (statusBroadcaster) {
      const completionStatus = await getInstructionCompletionStatus(
        data.noteId
      );

      await statusBroadcaster.addStatusEventAndBroadcast({
        importId: data.importId,
        status: "PENDING",
        message: `Processing ${completionStatus.completedInstructions}/${completionStatus.totalInstructions} instructions`,
        context: "instruction_processing",
        currentCount: completionStatus.completedInstructions,
        totalCount: completionStatus.totalInstructions,
        indentLevel: 1,
        metadata: {
          totalInstructions: completionStatus.totalInstructions,
          completedInstructions: completionStatus.completedInstructions,
          lineIndex: data.lineIndex,
        },
      });
    }

    return data;
  } catch (error) {
    logger.log(`[SAVE_INSTRUCTION_LINE] Failed to save instruction: ${error}`);
    throw error;
  }
}
