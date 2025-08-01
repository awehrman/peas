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
  logger.log(
    `[SAVE_INSTRUCTION] Starting instruction save for note: ${data.noteId}, line: ${data.lineIndex}`
  );

  try {
    // Validate that we have required data
    if (!data.noteId) {
      throw new Error("No note ID available for instruction saving");
    }

    if (!data.instructionReference) {
      throw new Error("No instruction reference available for saving");
    }

    logger.log(
      `[SAVE_INSTRUCTION] Saving instruction: "${data.instructionReference}"`
    );

    // Update the instruction line in the database
    const updatedInstruction = await updateInstructionLine(
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
        type: "instruction_processed",
        noteId: data.noteId,
        lineIndex: data.lineIndex,
        processedText: data.instructionReference,
        completedInstructions: completionStatus.completedInstructions,
        totalInstructions: completionStatus.totalInstructions,
        progress: completionStatus.progress,
        isComplete: completionStatus.isComplete,
        timestamp: new Date().toISOString(),
      });
    }

    logger.log(
      `[SAVE_INSTRUCTION] Successfully saved instruction: "${data.instructionReference}" (ID: ${updatedInstruction.id})`
    );

    return data;
  } catch (error) {
    logger.log(`[SAVE_INSTRUCTION] Failed to save instruction: ${error}`);
    throw error;
  }
}
