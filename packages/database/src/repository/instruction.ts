import { prisma } from "../client.js";

/**
 * Update a parsed instruction line with processed text and broadcast completion
 */
export async function updateInstructionLine(
  noteId: string,
  lineIndex: number,
  processedText: string,
  statusBroadcaster?: {
    addStatusEventAndBroadcast: (
      event: Record<string, unknown>
    ) => Promise<Record<string, unknown>>;
  },
  parseStatus: "CORRECT" | "ERROR" = "CORRECT"
): Promise<{
  id: string;
  lineIndex: number;
  originalText: string;
  normalizedText: string;
  parseStatus: string;
}> {
  try {
    // Find the instruction line by noteId and lineIndex
    const instructionLine = await prisma.parsedInstructionLine.findFirst({
      where: {
        noteId,
        lineIndex,
      },
    });

    if (!instructionLine) {
      throw new Error(
        `Instruction line not found for note ${noteId} at line ${lineIndex}`
      );
    }

    // Update the instruction line with processed text
    const updatedInstructionLine = await prisma.parsedInstructionLine.update({
      where: {
        id: instructionLine.id,
      },
      data: {
        normalizedText: processedText,
        parseStatus,
        updatedAt: new Date(),
      },
    });

    // Get the note to check completion status
    const note = await prisma.note.findUnique({
      where: { id: noteId },
      select: {
        id: true,
        title: true,
        totalInstructionLines: true,
        parsedInstructionLines: {
          where: {
            parseStatus: "CORRECT",
          },
          select: {
            id: true,
          },
        },
      },
    });

    if (!note) {
      throw new Error(`Note not found: ${noteId}`);
    }

    const completedInstructions = note.parsedInstructionLines.length;
    const totalInstructions = note.totalInstructionLines;

    // Broadcast completion message if statusBroadcaster is available
    if (statusBroadcaster) {
      await statusBroadcaster.addStatusEventAndBroadcast({
        type: "instruction_processed",
        noteId,
        lineIndex,
        processedText,
        completedInstructions,
        totalInstructions,
        progress: `${completedInstructions}/${totalInstructions}`,
        isComplete: completedInstructions >= totalInstructions,
        timestamp: new Date().toISOString(),
      });
    }

    return {
      id: updatedInstructionLine.id,
      lineIndex: updatedInstructionLine.lineIndex,
      originalText: updatedInstructionLine.originalText,
      normalizedText: updatedInstructionLine.normalizedText || "",
      parseStatus: updatedInstructionLine.parseStatus,
    };
  } catch (error) {
    console.error("Failed to update instruction line:", error);
    throw error;
  }
}

/**
 * Get instruction completion status for a note
 */
export async function getInstructionCompletionStatus(noteId: string): Promise<{
  completedInstructions: number;
  totalInstructions: number;
  progress: string;
  isComplete: boolean;
}> {
  try {
    const note = await prisma.note.findUnique({
      where: { id: noteId },
      select: {
        totalInstructionLines: true,
        parsedInstructionLines: {
          where: {
            parseStatus: "CORRECT",
          },
          select: {
            id: true,
          },
        },
      },
    });

    if (!note) {
      throw new Error(`Note not found: ${noteId}`);
    }

    const completedInstructions = note.parsedInstructionLines.length;
    const totalInstructions = note.totalInstructionLines;

    return {
      completedInstructions,
      totalInstructions,
      progress: `${completedInstructions}/${totalInstructions}`,
      isComplete: completedInstructions >= totalInstructions,
    };
  } catch (error) {
    console.error("Failed to get instruction completion status:", error);
    throw error;
  }
}

/**
 * Delete an instruction line by noteId and lineIndex
 */
export async function deleteInstructionLine(
  noteId: string,
  lineIndex: number
): Promise<{
  id: string;
  lineIndex: number;
  originalText: string;
}> {
  try {
    // Find the instruction line by noteId and lineIndex
    const instructionLine = await prisma.parsedInstructionLine.findFirst({
      where: {
        noteId,
        lineIndex,
      },
    });

    if (!instructionLine) {
      throw new Error(
        `Instruction line not found for note ${noteId} at line ${lineIndex}`
      );
    }

    // Delete the instruction line
    const deletedInstructionLine = await prisma.parsedInstructionLine.delete({
      where: {
        id: instructionLine.id,
      },
    });

    return {
      id: deletedInstructionLine.id,
      lineIndex: deletedInstructionLine.lineIndex,
      originalText: deletedInstructionLine.originalText,
    };
  } catch (error) {
    console.error("Failed to delete instruction line:", error);
    throw error;
  }
}

/**
 * Reindex instruction lines for a note after deletions
 */
export async function reindexInstructionLines(noteId: string): Promise<{
  reindexedCount: number;
  updatedLines: Array<{
    id: string;
    oldLineIndex: number;
    newLineIndex: number;
  }>;
}> {
  try {
    // Get all instruction lines for the note, ordered by current lineIndex
    const instructionLines = await prisma.parsedInstructionLine.findMany({
      where: { noteId },
      orderBy: { lineIndex: "asc" },
      select: {
        id: true,
        lineIndex: true,
      },
    });

    const updatedLines: Array<{
      id: string;
      oldLineIndex: number;
      newLineIndex: number;
    }> = [];

    // Update lineIndex for each instruction line to be sequential starting from 0
    for (let i = 0; i < instructionLines.length; i++) {
      const instructionLine = instructionLines[i];
      if (!instructionLine) continue;

      const newLineIndex = i;

      if (instructionLine.lineIndex !== newLineIndex) {
        await prisma.parsedInstructionLine.update({
          where: { id: instructionLine.id },
          data: { lineIndex: newLineIndex },
        });

        updatedLines.push({
          id: instructionLine.id,
          oldLineIndex: instructionLine.lineIndex,
          newLineIndex,
        });
      }
    }

    // Update the note's total instruction count
    await prisma.note.update({
      where: { id: noteId },
      data: { totalInstructionLines: instructionLines.length },
    });

    return {
      reindexedCount: instructionLines.length,
      updatedLines,
    };
  } catch (error) {
    console.error("Failed to reindex instruction lines:", error);
    throw error;
  }
}

/**
 * Get all instruction lines for a note
 */
export async function getInstructionLines(noteId: string): Promise<
  {
    id: string;
    lineIndex: number;
    originalText: string;
    normalizedText: string | null;
    parseStatus: string;
  }[]
> {
  try {
    const instructionLines = await prisma.parsedInstructionLine.findMany({
      where: { noteId },
      orderBy: { lineIndex: "asc" },
      select: {
        id: true,
        lineIndex: true,
        originalText: true,
        normalizedText: true,
        parseStatus: true,
      },
    });

    return instructionLines;
  } catch (error) {
    console.error("Failed to get instruction lines:", error);
    throw error;
  }
}
