import type { StructuredLogger } from "../../../../types";
import type { InstructionJobData } from "../../../../workers/instruction/dependencies";

export async function formatInstruction(
  data: InstructionJobData,
  logger: StructuredLogger
): Promise<InstructionJobData> {
  try {
    // Validate that we have required data
    if (!data.noteId) {
      throw new Error("No note ID available for instruction formatting");
    }

    if (!data.instructionReference) {
      throw new Error("No instruction reference available for formatting");
    }

    // Trim whitespace from the instruction reference
    let formattedReference = data.instructionReference.trim();

    // Remove instruction if it has no length after trimming
    if (formattedReference.length === 0) {
      logger.log(
        `[FORMAT_INSTRUCTION_LINE] Marking instruction as inactive: empty after trimming`
      );
      return {
        ...data,
        instructionReference: formattedReference,
        isActive: false,
      };
    }

    // Mark as inactive if too short instead of throwing error
    if (formattedReference.length < 3) {
      logger.log(
        `[FORMAT_INSTRUCTION_LINE] Marking instruction as inactive: too short "${formattedReference}" (minimum 3 characters required)`
      );
      return {
        ...data,
        instructionReference: formattedReference,
        isActive: false,
      };
    }

    // Add period if the string doesn't end with punctuation
    const punctuationRegex = /[.!?;:]$/;
    if (!punctuationRegex.test(formattedReference)) {
      formattedReference += ".";
    }

    // Update the data with formatted reference
    const formattedData = {
      ...data,
      instructionReference: formattedReference,
      isActive: true, // Explicitly mark as active
    };

    return formattedData;
  } catch (error) {
    logger.log(`[FORMAT_INSTRUCTION_LINE] Failed to format instruction: ${error}`);
    throw error;
  }
}
