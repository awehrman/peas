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

    // Update the instruction line in the database and broadcast completion
    const updatedInstruction = await updateInstructionLine(
      data.noteId,
      data.lineIndex,
      data.instructionReference,
      statusBroadcaster,
      "CORRECT"
    );

    logger.log(
      `[SAVE_INSTRUCTION] Successfully saved instruction: "${data.instructionReference}" (ID: ${updatedInstruction.id})`
    );

    return data;
  } catch (error) {
    logger.log(`[SAVE_INSTRUCTION] Failed to save instruction: ${error}`);
    throw error;
  }
}
