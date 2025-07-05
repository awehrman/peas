import { ParsedHTMLFile } from "./types.js";
import { prisma, Note } from "./client.js";

export type NoteWithParsedLines = {
  id: string;
  parsedIngredientLines: {
    id: string;
    reference: string;
    blockIndex: number;
    lineIndex: number;
  }[];
  parsedInstructionLines: {
    id: string;
    originalText: string;
    lineIndex: number;
  }[];
};

export async function getNotes() {
  console.log("getNotes");
  try {
    const notes = await prisma.note.findMany({
      include: {
        parsedIngredientLines: true,
        parsedInstructionLines: true,
      },
    });
    return { notes };
  } catch (error) {
    return { error };
  }
}

export async function createNote(
  file: ParsedHTMLFile
): Promise<NoteWithParsedLines> {
  try {
    const response = await prisma.note.create({
      data: {
        title: file.title,
        html: file.contents,
        parsedIngredientLines: {
          create: file.ingredients.map((ingredient) => ({
            reference: ingredient.reference,
            blockIndex: ingredient.blockIndex,
            lineIndex: ingredient.lineIndex,
          })),
        },
        parsedInstructionLines: {
          create: file.instructions.map((instruction) => ({
            originalText: instruction.reference,
            lineIndex: instruction.lineIndex,
          })),
        },
      },
      select: {
        id: true,
        parsedIngredientLines: {
          select: {
            id: true,
            reference: true,
            blockIndex: true,
            lineIndex: true,
          },
        },
        parsedInstructionLines: {
          select: {
            id: true,
            originalText: true,
            lineIndex: true,
          },
        },
      },
    });
    console.log(`Successfully created note ${response.id}`);
    return response;
  } catch (error) {
    console.log({ error });
    throw error;
  }
}
