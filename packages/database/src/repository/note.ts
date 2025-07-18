import { prisma } from "../client.js";
import type {
  ParsedHTMLFile,
  ParsedIngredientLine,
  ParsedInstructionLine,
} from "../models/parsed-html-file.js";

export type NoteWithParsedLines = {
  id: string;
  title: string | null;
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
        // Counters
        totalIngredientLines: file.ingredients.length,
        totalInstructionLines: file.instructions.length,
        parsingErrorCount: 0,
        // Relations
        parsedIngredientLines: {
          create: file.ingredients.map((ingredient: ParsedIngredientLine) => ({
            reference: ingredient.reference,
            blockIndex: ingredient.blockIndex,
            lineIndex: ingredient.lineIndex,
            parseStatus: ingredient.parseStatus,
          })),
        },
        parsedInstructionLines: {
          create: file.instructions.map(
            (instruction: ParsedInstructionLine) => ({
              originalText: instruction.reference,
              lineIndex: instruction.lineIndex,
              parseStatus: instruction.parseStatus,
            })
          ),
        },
      },
      select: {
        id: true,
        title: true,
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
