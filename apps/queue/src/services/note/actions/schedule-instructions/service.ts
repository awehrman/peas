import type { StructuredLogger } from "../../../../types";
import { ActionName } from "../../../../types";
import type { NotePipelineData } from "../../../../types/notes";
import type { BaseWorkerDependencies } from "../../../../workers/types";

export async function processInstructions(
  data: NotePipelineData,
  logger: StructuredLogger,
  queues: BaseWorkerDependencies["queues"]
): Promise<NotePipelineData> {
  // Validate that we have a note ID
  if (!data.noteId) {
    throw new Error("No note ID available for instruction processing");
  }

  try {
    logger.log(
      `[SCHEDULE_INSTRUCTIONS] Starting instruction processing for note: ${data.noteId}`
    );

    // Validate that we have file data with instructions
    if (!data.file?.instructions || data.file.instructions.length === 0) {
      logger.log(
        `[SCHEDULE_INSTRUCTIONS] No instructions found for note: ${data.noteId}`
      );
      return data;
    }

    logger.log(
      `[SCHEDULE_INSTRUCTIONS] Found ${data.file.instructions.length} instructions to process`
    );

    // Use the existing instruction queue from the dependencies
    const instructionQueue = queues?.instructionQueue;

    if (!instructionQueue) {
      throw new Error("Instruction queue not available in dependencies");
    }

    for (const instruction of data.file.instructions) {
      logger.log(
        `[SCHEDULE_INSTRUCTIONS] Processing instruction: ${instruction.reference}`
      );

      const instructionJobData = {
        noteId: data.noteId,
        importId: data.importId,
        instructionReference: instruction.reference,
        lineIndex: instruction.lineIndex,
        jobId: `${data.noteId}-instruction-${instruction.lineIndex}`,
      };

      logger.log(
        `[SCHEDULE_INSTRUCTIONS] Adding job to queue for instruction ${instruction.lineIndex}: ${instruction.reference}`
      );

      // Schedule a single job - the worker pipeline will handle format + save
      await instructionQueue.add(
        ActionName.FORMAT_INSTRUCTION_LINE,
        instructionJobData
      );
    }

    // Schedule a completion check job after all instruction jobs
    const completionCheckJobData = {
      noteId: data.noteId,
      importId: data.importId,
      jobId: `${data.noteId}-instruction-completion-check`,
      metadata: {},
    };

    logger.log(
      `[SCHEDULE_INSTRUCTIONS] Scheduling completion check job for note: ${data.noteId}`
    );

    await instructionQueue.add(
      ActionName.CHECK_INSTRUCTION_COMPLETION,
      completionCheckJobData
    );

    logger.log(
      `[SCHEDULE_INSTRUCTIONS] Successfully scheduled ${data.file.instructions.length} instruction jobs and 1 completion check job`
    );

    return data;
  } catch (error) {
    logger.log(
      `[SCHEDULE_INSTRUCTIONS] Failed to schedule instructions: ${error}`
    );
    throw error;
  }
}
