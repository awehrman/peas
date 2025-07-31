import type { StructuredLogger } from "../../../../types";
import type { InstructionJobData } from "../../../../workers/instruction/dependencies";

export async function formatInstruction(
  data: InstructionJobData,
  logger: StructuredLogger
): Promise<InstructionJobData> {
  logger.log(
    `[FORMAT_INSTRUCTION] Starting instruction formatting for note: ${data.noteId}, line: ${data.lineIndex}`
  );

  try {
    // Validate that we have required data
    if (!data.noteId) {
      throw new Error("No note ID available for instruction formatting");
    }

    if (!data.instructionReference) {
      throw new Error("No instruction reference available for formatting");
    }

    logger.log(
      `[FORMAT_INSTRUCTION] Formatting instruction: "${data.instructionReference}"`
    );

    // Trim whitespace from the instruction reference
    let formattedReference = data.instructionReference.trim();

    // Remove instruction if it has no length after trimming
    if (formattedReference.length === 0) {
      logger.log(
        `[FORMAT_INSTRUCTION] Instruction is empty after trimming, skipping`
      );
      throw new Error("Instruction is empty after trimming");
    }

    // Add period if the string doesn't end with punctuation
    const punctuationRegex = /[.!?;:]$/;
    if (!punctuationRegex.test(formattedReference)) {
      formattedReference += ".";
      logger.log(
        `[FORMAT_INSTRUCTION] Added period to instruction`
      );
    }

    // Update the data with formatted reference
    const formattedData = {
      ...data,
      instructionReference: formattedReference,
    };

    logger.log(
      `[FORMAT_INSTRUCTION] Successfully formatted instruction: "${formattedReference}"`
    );

    return formattedData;
  } catch (error) {
    logger.log(
      `[FORMAT_INSTRUCTION] Failed to format instruction: ${error}`
    );
    throw error;
  }
} 