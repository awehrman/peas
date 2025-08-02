import type { StructuredLogger } from "../../../../types";
import { ActionName } from "../../../../types";
import type { NotePipelineData } from "../../../../types/notes";
import type { BaseWorkerDependencies } from "../../../../workers/types";

export async function processInstructions(
  data: NotePipelineData,
  logger: StructuredLogger,
  queues: BaseWorkerDependencies["queues"]
): Promise<NotePipelineData> {
  logger.log(
    `[START PROCESS INSTRUCTIONS] num instructions: ${data.file?.instructions?.length}`
  );

  // Validate that we have a note ID
  if (!data.noteId) {
    throw new Error("No note ID available for instruction processing");
  }

  try {
    // Validate that we have file data with instructions
    if (!data.file?.instructions || data.file.instructions.length === 0) {
      logger.log(
        `[PROCESS_INSTRUCTION_LINES] No instructions found for note: ${data.noteId}`
      );
      return data;
    }

    // Use the existing instruction queue from the dependencies
    const instructionQueue = queues?.instructionQueue;

    if (!instructionQueue) {
      throw new Error("Instruction queue not available in dependencies");
    }

    for (const instruction of data.file.instructions) {
      console.log("scheduling instruction", instruction);
      const instructionJobData = {
        noteId: data.noteId,
        importId: data.importId,
        instructionReference: instruction.reference,
        lineIndex: instruction.lineIndex,
        jobId: `${data.noteId}-instruction-${instruction.lineIndex}`,
      };

      // Schedule a single job - the worker pipeline will handle format + save
      await instructionQueue.add(
        ActionName.FORMAT_INSTRUCTION,
        instructionJobData
      );
    }

    return data;
  } catch (error) {
    logger.log(
      `[PROCESS_INSTRUCTION_LINES] Failed to process instructions: ${error}`
    );
    throw error;
  }
}
