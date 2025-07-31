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
  createdAt: Date;
  updatedAt?: Date;
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

// TODO should we be passing the select object here?
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
        createdAt: true,
        updatedAt: true,
      },
    });
    console.log(`Successfully created note ${response.id}`);
    return response;
  } catch (error) {
    console.log({ error });
    throw error;
  }
}

export async function createNoteWithEvernoteMetadata(
  file: ParsedHTMLFile
): Promise<NoteWithParsedLines & { evernoteMetadataId: string | null }> {
  try {
    // Extract Evernote metadata from the file
    const source = file.evernoteMetadata?.source;
    const tags = file.evernoteMetadata?.tags || [];
    const originalCreatedAt = file.evernoteMetadata?.originalCreatedAt;

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
        // Create EvernoteMetadata if we have metadata
        ...(source || tags.length > 0 || originalCreatedAt
          ? {
              evernoteMetadata: {
                create: {
                  source: source || null,
                  notebook: null, // Removed notebook as requested
                  tags,
                  originalCreatedAt: originalCreatedAt || null,
                },
              },
            }
          : {}),
      },
      select: {
        id: true,
        title: true,
        evernoteMetadataId: true,
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
        createdAt: true,
        updatedAt: true,
      },
    });
    console.log(
      `Successfully created note ${response.id} with EvernoteMetadata`
    );
    return response;
  } catch (error) {
    console.log({ error });
    throw error;
  }
}
