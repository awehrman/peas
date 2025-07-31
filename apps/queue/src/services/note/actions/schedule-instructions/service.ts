import { createQueue } from "../../../../queues/create-queue";
import type { StructuredLogger } from "../../../../types";
import { ActionName, QueueName } from "../../../../types";
import type { NotePipelineData } from "../../../../types/notes";

export async function processInstructions(
  data: NotePipelineData,
  logger: StructuredLogger
): Promise<NotePipelineData> {
  logger.log(
    `[PROCESS_INSTRUCTION_LINES] Starting instruction processing for note: ${data.noteId}`
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

    logger.log(
      `[PROCESS_INSTRUCTION_LINES] Processing ${data.file.instructions.length} instructions for note: ${data.noteId}`
    );

    // Process each instruction line
    const processedInstructions = data.file.instructions
      .map((instruction, index) => {
        logger.log(
          `[PROCESS_INSTRUCTION_LINES] Processing instruction ${index + 1}: ${instruction.reference}`
        );

        // Trim whitespace from the instruction reference
        let processedReference = instruction.reference.trim();

        // Remove instruction if it has no length after trimming
        if (processedReference.length === 0) {
          logger.log(
            `[PROCESS_INSTRUCTION_LINES] Removing empty instruction ${index + 1}`
          );
          return null;
        }

        // Add period if the string doesn't end with punctuation
        const punctuationRegex = /[.!?;:]$/;
        if (!punctuationRegex.test(processedReference)) {
          processedReference += ".";
          logger.log(
            `[PROCESS_INSTRUCTION_LINES] Added period to instruction ${index + 1}`
          );
        }

        // Return the processed instruction with updated reference
        return {
          ...instruction,
          reference: processedReference,
        };
      })
      .filter(
        (instruction): instruction is NonNullable<typeof instruction> =>
          instruction !== null
      );

    const originalCount = data.file.instructions.length;
    const removedCount = originalCount - processedInstructions.length;

    // Update the data with processed instructions
    data.file.instructions = processedInstructions;

    logger.log(
      `[PROCESS_INSTRUCTION_LINES] Processed ${processedInstructions.length} instructions (removed ${removedCount} empty ones)`
    );

    // Schedule individual instruction processing jobs
    const instructionQueue = createQueue(QueueName.INSTRUCTION);

    for (const instruction of processedInstructions) {
      const instructionJobData = {
        noteId: data.noteId,
        instructionReference: instruction.reference,
        lineIndex: instruction.lineIndex,
        jobId: `${data.noteId}-instruction-${instruction.lineIndex}`,
      };

      // Schedule format instruction job
      await instructionQueue.add(
        ActionName.FORMAT_INSTRUCTION,
        instructionJobData
      );
      logger.log(
        `[PROCESS_INSTRUCTION_LINES] Scheduled format instruction job for line ${instruction.lineIndex}: ${instruction.reference}`
      );

      // Schedule save instruction job (will run after format)
      await instructionQueue.add(
        ActionName.SAVE_INSTRUCTION,
        instructionJobData
      );
      logger.log(
        `[PROCESS_INSTRUCTION_LINES] Scheduled save instruction job for line ${instruction.lineIndex}`
      );
    }

    logger.log(
      `[PROCESS_INSTRUCTION_LINES] Scheduled ${processedInstructions.length * 2} instruction processing jobs (format + save)`
    );

    logger.log(
      `[PROCESS_INSTRUCTION_LINES] Successfully processed instructions for note: ${data.noteId}`
    );

    return data;
  } catch (error) {
    logger.log(
      `[PROCESS_INSTRUCTION_LINES] Failed to process instructions: ${error}`
    );
    throw error;
  }
}
