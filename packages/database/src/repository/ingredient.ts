import { prisma } from "../client.js";

/**
 * Get ingredient completion status for a note
 */
export async function getIngredientCompletionStatus(noteId: string): Promise<{
  completedIngredients: number;
  totalIngredients: number;
  progress: string;
  isComplete: boolean;
}> {
  try {
    const note = await prisma.note.findUnique({
      where: { id: noteId },
      select: {
        totalIngredientLines: true,
        parsedIngredientLines: {
          where: {
            OR: [
              {
                parseStatus: {
                  in: ["CORRECT", "ERROR"],
                },
              },
              {
                reference: {
                  not: "",
                },
              },
            ],
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

    const completedIngredients = note.parsedIngredientLines.length;
    const totalIngredients = note.totalIngredientLines;

    return {
      completedIngredients,
      totalIngredients,
      progress: `${completedIngredients}/${totalIngredients}`,
      isComplete: completedIngredients >= totalIngredients,
    };
  } catch (error) {
    console.error("Failed to get ingredient completion status:", error);
    throw error;
  }
}
