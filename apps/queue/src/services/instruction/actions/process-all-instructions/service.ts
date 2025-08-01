import type { StructuredLogger } from "../../../../types";
import { deleteInstructionLine, reindexInstructionLines } from "@peas/database";

export interface ProcessAllInstructionsData {
  noteId: string;
  instructionLines: Array<{
    lineIndex: number;
    originalText: string;
  }>;
}

export interface ProcessAllInstructionsResult {
  noteId: string;
  processedCount: number;
  deletedCount: number;
  reindexedCount: number;
  finalInstructionCount: number;
}

/**
 * Process all instructions for a note, delete short ones, and reindex
 */
export async function processAllInstructions(
  data: ProcessAllInstructionsData,
  logger: StructuredLogger
): Promise<ProcessAllInstructionsResult> {
  logger.log(
    `[PROCESS_ALL_INSTRUCTIONS] Starting processing for note: ${data.noteId}`
  );

  try {
    const { noteId, instructionLines } = data;
    let deletedCount = 0;

    // Process each instruction line
    for (const instructionLine of instructionLines) {
      const { lineIndex, originalText } = instructionLine;
      
      // Trim whitespace
      const trimmedText = originalText.trim();
      
      // Check if instruction is too short (less than 3 characters)
      if (trimmedText.length < 3) {
        logger.log(
          `[PROCESS_ALL_INSTRUCTIONS] Instruction too short (${trimmedText.length} chars), deleting: "${trimmedText}"`
        );
        
        try {
          // Delete the instruction line from the database
          const deletedInstruction = await deleteInstructionLine(noteId, lineIndex);
          
          logger.log(
            `[PROCESS_ALL_INSTRUCTIONS] Deleted instruction line ${lineIndex} (ID: ${deletedInstruction.id})`
          );
          
          deletedCount++;
        } catch (error) {
          logger.log(
            `[PROCESS_ALL_INSTRUCTIONS] Failed to delete instruction line ${lineIndex}: ${error}`
          );
        }
      }
    }

    // Reindex the remaining instruction lines
    logger.log(
      `[PROCESS_ALL_INSTRUCTIONS] Reindexing instruction lines after deleting ${deletedCount} short instructions`
    );

    const reindexResult = await reindexInstructionLines(noteId);
    
    logger.log(
      `[PROCESS_ALL_INSTRUCTIONS] Reindexed ${reindexResult.reindexedCount} instruction lines`
    );

    if (reindexResult.updatedLines.length > 0) {
      logger.log(
        `[PROCESS_ALL_INSTRUCTIONS] Updated ${reindexResult.updatedLines.length} line indexes`
      );
      
      for (const updatedLine of reindexResult.updatedLines) {
        logger.log(
          `[PROCESS_ALL_INSTRUCTIONS] Line ${updatedLine.oldLineIndex} → ${updatedLine.newLineIndex}`
        );
      }
    }

    const result: ProcessAllInstructionsResult = {
      noteId,
      processedCount: instructionLines.length,
      deletedCount,
      reindexedCount: reindexResult.reindexedCount,
      finalInstructionCount: reindexResult.reindexedCount,
    };

    logger.log(
      `[PROCESS_ALL_INSTRUCTIONS] Completed processing for note ${noteId}: ${result.processedCount} processed, ${result.deletedCount} deleted, ${result.finalInstructionCount} remaining`
    );

    return result;
  } catch (error) {
    logger.log(
      `[PROCESS_ALL_INSTRUCTIONS] Failed to process instructions: ${error}`
    );
    throw error;
  }
} 