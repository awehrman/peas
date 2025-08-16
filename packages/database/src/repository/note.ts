import type { Prisma } from "@prisma/client";

import { prisma } from "../client.js";
import type {
  ParsedHTMLFile,
  ParsedIngredientLine,
  ParsedInstructionLine,
} from "../models/parsed-html-file.js";

export type NoteWithParsedLines = {
  id: string;
  title: string | null;
  images?: {
    id: string;
    originalImageUrl: string;
    thumbnailImageUrl?: string | null;
    crop3x2ImageUrl?: string | null;
    crop4x3ImageUrl?: string | null;
    crop16x9ImageUrl?: string | null;
    originalWidth?: number | null;
    originalHeight?: number | null;
    originalSize?: number | null;
    originalFormat?: string | null;
    processingStatus: string;
  }[];
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
export async function getNoteWithIngredients(noteId: string) {
  try {
    const note = await prisma.note.findUnique({
      where: { id: noteId },
      include: {
        parsedIngredientLines: {
          include: {
            ingredientReferences: {
              include: {
                ingredient: true, // Include the actual ingredients
              },
            },
          },
        },
        parsedInstructionLines: true,
      },
    });
    return note;
  } catch (error) {
    console.log({ error });
    throw error;
  }
}

/**
 * Mark a note as duplicate with error details and confidence level
 */
export async function markNoteAsDuplicate(
  noteId: string,
  duplicateInfo?: {
    existingNotes: Array<{ id: string; title: string | null }>;
    duplicateReason?: string;
    confidence?: number;
  }
): Promise<void> {
  const errorDetails = duplicateInfo?.existingNotes.length
    ? {
        duplicateNoteIds: duplicateInfo.existingNotes.map((n) => n.id),
        duplicateNoteTitles: duplicateInfo.existingNotes
          .map((n) => n.title)
          .filter(Boolean),
        message:
          duplicateInfo.duplicateReason ||
          `This recipe is already in your collection`,
      }
    : {
        message: duplicateInfo?.duplicateReason || "This recipe is a duplicate",
      };

  await prisma.note.update({
    where: { id: noteId },
    data: {
      status: "DUPLICATE",
      errorMessage:
        duplicateInfo?.duplicateReason || `Duplicate recipe detected.`,
      errorDetails,
      duplicateConfidence: duplicateInfo?.confidence || null,
    },
  });
}

/**
 * Update the SimHash for a note's title
 */
export async function updateNoteTitleSimHash(
  noteId: string,
  titleSimHash: string
): Promise<void> {
  await prisma.note.update({
    where: { id: noteId },
    data: {
      titleSimHash,
    },
  });
}

/**
 * Find notes with similar titles using SimHash
 * @param titleSimHash The SimHash of the title to search for
 * @param maxHammingDistance Maximum Hamming distance to consider similar
 * @param excludeNoteId Optional note ID to exclude from results
 * @returns Array of notes with similar titles
 */
export async function findNotesWithSimilarTitles(
  titleSimHash: string,
  maxHammingDistance: number = 3,
  excludeNoteId?: string
) {
  if (!titleSimHash) {
    return [];
  }

  try {
    // Get all notes with non-empty SimHashes
    const allNotes = await prisma.note.findMany({
      where: {
        titleSimHash: {
          not: null,
        },
        ...(excludeNoteId && { id: { not: excludeNoteId } }),
      },
      select: {
        id: true,
        title: true,
        titleSimHash: true,
        status: true,
      },
    });

    // Filter notes based on Hamming distance
    const similarNotes = allNotes.filter((note) => {
      if (!note.titleSimHash) return false;

      const distance = calculateHammingDistance(
        titleSimHash,
        note.titleSimHash
      );
      return distance <= maxHammingDistance;
    });

    return similarNotes;
  } catch (error) {
    console.error("Error finding notes with similar titles:", error);
    return [];
  }
}

/**
 * Calculate Hamming distance between two SimHashes
 * This is a simple implementation - in production, you might want to use a more optimized version
 */
function calculateHammingDistance(hash1: string, hash2: string): number {
  if (!hash1 || !hash2 || hash1.length !== hash2.length) {
    return Number.MAX_SAFE_INTEGER;
  }

  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) {
      distance++;
    }
  }
  return distance;
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
        images: {
          select: {
            id: true,
            originalImageUrl: true,
            thumbnailImageUrl: true,
            crop3x2ImageUrl: true,
            crop4x3ImageUrl: true,
            crop16x9ImageUrl: true,
            originalWidth: true,
            originalHeight: true,
            originalSize: true,
            originalFormat: true,
            processingStatus: true,
          },
        },
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
  file: ParsedHTMLFile,
  importId?: string
): Promise<NoteWithParsedLines & { evernoteMetadataId: string | null }> {
  console.log(
    `[CREATE_NOTE_DEBUG] Function called with importId: "${importId}"`
  );
  console.log(`[CREATE_NOTE_DEBUG] File title: "${file.title}"`);
  console.log(
    `[CREATE_NOTE_DEBUG] Number of ingredients: ${file.ingredients.length}`
  );
  console.log(
    `[CREATE_NOTE_DEBUG] Number of instructions: ${file.instructions.length}`
  );

  try {
    // Extract Evernote metadata from the file
    const source = file.evernoteMetadata?.source;
    const tags = file.evernoteMetadata?.tags || [];
    const originalCreatedAt = file.evernoteMetadata?.originalCreatedAt;

    console.log(
      `[CREATE_NOTE] Starting with importId: ${importId || "undefined"}`
    );

    // If we have an importId, check if a note with this importId already exists
    if (importId) {
      console.log(
        `[CREATE_NOTE] Checking for existing note with importId: ${importId}`
      );

      const existingNote = await prisma.note.findFirst({
        where: { importId },
        include: {
          parsedIngredientLines: true,
          parsedInstructionLines: true,
          evernoteMetadata: true,
        },
      });

      console.log(
        `[CREATE_NOTE] Existing note found: ${existingNote ? "YES" : "NO"}`
      );

      if (existingNote) {
        console.log(
          `Note with importId ${importId} already exists, updating instead of creating`
        );

        // Update the existing note
        const response = await prisma.note.update({
          where: { id: existingNote.id },
          data: {
            title: file.title,
            html: file.contents,
            // Counters
            totalIngredientLines: file.ingredients.length,
            totalInstructionLines: file.instructions.length,
            parsingErrorCount: 0,
            // Delete existing parsed lines and create new ones
            parsedIngredientLines: {
              deleteMany: {},
              create: file.ingredients.map(
                (ingredient: ParsedIngredientLine) => ({
                  reference: ingredient.reference,
                  blockIndex: ingredient.blockIndex,
                  lineIndex: ingredient.lineIndex,
                  parseStatus: ingredient.parseStatus,
                })
              ),
            },
            parsedInstructionLines: {
              deleteMany: {},
              create: file.instructions.map(
                (instruction: ParsedInstructionLine) => ({
                  originalText: instruction.reference,
                  lineIndex: instruction.lineIndex,
                  parseStatus: instruction.parseStatus,
                })
              ),
            },
            // Update EvernoteMetadata if we have metadata
            ...(source || tags.length > 0 || originalCreatedAt
              ? {
                  evernoteMetadata: {
                    upsert: {
                      create: {
                        source: source || null,
                        notebook: null,
                        tags,
                        originalCreatedAt: originalCreatedAt || null,
                      },
                      update: {
                        source: source || null,
                        notebook: null,
                        tags,
                        originalCreatedAt: originalCreatedAt || null,
                      },
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
          `Successfully updated note ${response.id} with EvernoteMetadata`
        );
        return response;
      }
    }

    console.log(
      `[CREATE_NOTE] No existing note found, creating new note with importId: ${importId || "null"}`
    );

    // Use a transaction to handle potential race conditions
    return await prisma.$transaction(async (tx) => {
      console.log(
        `[CREATE_NOTE_DEBUG] Inside transaction, checking for existing note again`
      );

      // Double-check for existing note within the transaction
      if (importId) {
        const existingNoteInTx = await tx.note.findFirst({
          where: { importId },
        });

        console.log(
          `[CREATE_NOTE_DEBUG] Existing note in transaction: ${existingNoteInTx ? "YES" : "NO"}`
        );

        if (existingNoteInTx) {
          console.log(
            `[CREATE_NOTE] Found existing note in transaction, updating instead`
          );
          // Update the existing note
          return await tx.note.update({
            where: { id: existingNoteInTx.id },
            data: {
              title: file.title,
              html: file.contents,
              // Counters
              totalIngredientLines: file.ingredients.length,
              totalInstructionLines: file.instructions.length,
              parsingErrorCount: 0,
              // Delete existing parsed lines and create new ones
              parsedIngredientLines: {
                deleteMany: {},
                create: file.ingredients.map(
                  (ingredient: ParsedIngredientLine) => ({
                    reference: ingredient.reference,
                    blockIndex: ingredient.blockIndex,
                    lineIndex: ingredient.lineIndex,
                    parseStatus: ingredient.parseStatus,
                  })
                ),
              },
              parsedInstructionLines: {
                deleteMany: {},
                create: file.instructions.map(
                  (instruction: ParsedInstructionLine) => ({
                    originalText: instruction.reference,
                    lineIndex: instruction.lineIndex,
                    parseStatus: instruction.parseStatus,
                  })
                ),
              },
              // Update EvernoteMetadata if we have metadata
              ...(source || tags.length > 0 || originalCreatedAt
                ? {
                    evernoteMetadata: {
                      upsert: {
                        create: {
                          source: source || null,
                          notebook: null,
                          tags,
                          originalCreatedAt: originalCreatedAt || null,
                        },
                        update: {
                          source: source || null,
                          notebook: null,
                          tags,
                          originalCreatedAt: originalCreatedAt || null,
                        },
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
        }
      }

      console.log(
        `[CREATE_NOTE_DEBUG] About to create new note in transaction`
      );

      // If no existing note found, create a new one
      const response = await tx.note.create({
        data: {
          title: file.title,
          html: file.contents,
          importId: importId || null, // Add importId to the note
          // Counters
          totalIngredientLines: file.ingredients.length,
          totalInstructionLines: file.instructions.length,
          parsingErrorCount: 0,
          // Relations
          parsedIngredientLines: {
            create: file.ingredients.map(
              (ingredient: ParsedIngredientLine) => ({
                reference: ingredient.reference,
                blockIndex: ingredient.blockIndex,
                lineIndex: ingredient.lineIndex,
                parseStatus: ingredient.parseStatus,
              })
            ),
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
    });
  } catch (error) {
    console.log(`[CREATE_NOTE_DEBUG] Error occurred:`, error);
    throw error;
  }
}

export async function updateNote(
  noteId: string,
  data: {
    title?: string;
    html?: string;
    originalImageUrl?: string;
    croppedImageUrl?: string;
    thumbnailImageUrl?: string;
    status?: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "DUPLICATE";
    totalIngredientLines?: number;
    totalInstructionLines?: number;
    parsingErrorCount?: number;
    errorMessage?: string;
    errorCode?:
      | "HTML_PARSE_ERROR"
      | "INGREDIENT_PARSE_ERROR"
      | "INSTRUCTION_PARSE_ERROR"
      | "QUEUE_JOB_FAILED"
      | "IMAGE_UPLOAD_FAILED"
      | "UNKNOWN_ERROR";
    errorDetails?: Prisma.InputJsonValue;
    duplicateConfidence?: number;
    titleSimHash?: string;
  }
): Promise<void> {
  try {
    await prisma.note.update({
      where: { id: noteId },
      data,
    });
  } catch (error) {
    console.error(`Failed to update note ${noteId}:`, error);
    throw error;
  }
}

/**
 * Count parsing errors and update the parsing error count for a note
 */
export async function updateParsingErrorCount(noteId: string): Promise<void> {
  try {
    // Count ingredient lines with COMPLETED_WITH_ERROR status
    const ingredientErrorCount = await prisma.parsedIngredientLine.count({
      where: {
        noteId,
        parseStatus: "COMPLETED_WITH_ERROR",
      },
    });

    // Update the note with the total error count
    await prisma.note.update({
      where: { id: noteId },
      data: {
        parsingErrorCount: ingredientErrorCount,
      },
    });
  } catch (error) {
    console.error(
      `Failed to update parsing error count for note ${noteId}:`,
      error
    );
    throw error;
  }
}

/**
 * Save a category to a note
 * @param noteId The ID of the note to save the category to
 * @param categoryName The name of the category to save
 * @returns The saved category
 */
export async function saveCategoryToNote(
  noteId: string,
  categoryName: string
): Promise<{ id: string; name: string }> {
  try {
    // Use a transaction to ensure data consistency
    return await prisma.$transaction(async (tx) => {
      // First, try to find the category
      let category = await tx.category.findFirst({
        where: { name: categoryName },
      });

      // If not found, create it
      if (!category) {
        category = await tx.category.create({
          data: { name: categoryName },
        });
      }

      // Then connect the category to the note
      await tx.note.update({
        where: { id: noteId },
        data: {
          categories: {
            connect: { id: category.id },
          },
        },
      });

      console.log(
        `Successfully saved category "${categoryName}" to note ${noteId}`
      );
      return category;
    });
  } catch (error) {
    console.error(
      `Error saving category "${categoryName}" to note ${noteId}:`,
      error
    );
    throw error;
  }
}

/**
 * Save multiple tags to a note
 * @param noteId The ID of the note to save the tags to
 * @param tagNames Array of tag names to save
 * @returns Array of saved tags
 */
export async function saveTagsToNote(
  noteId: string,
  tagNames: string[]
): Promise<Array<{ id: string; name: string }>> {
  try {
    if (!tagNames || tagNames.length === 0) {
      console.log(`No tags to save for note ${noteId}`);
      return [];
    }

    // Use a transaction to ensure data consistency
    return await prisma.$transaction(async (tx) => {
      const savedTags: Array<{ id: string; name: string }> = [];

      // Process each tag
      for (const tagName of tagNames) {
        // Try to find the tag
        let tag = await tx.tag.findFirst({
          where: { name: tagName },
        });

        // If not found, create it
        if (!tag) {
          tag = await tx.tag.create({
            data: { name: tagName },
          });
        }

        savedTags.push(tag);
      }

      // Connect all tags to the note in a single operation
      await tx.note.update({
        where: { id: noteId },
        data: {
          tags: {
            connect: savedTags.map((tag) => ({ id: tag.id })),
          },
        },
      });

      console.log(
        `Successfully saved ${savedTags.length} tags to note ${noteId}:`,
        tagNames
      );
      return savedTags;
    });
  } catch (error) {
    console.error(`Error saving tags to note ${noteId}:`, error);
    throw error;
  }
}

/**
 * Get categories for a note
 * @param noteId The ID of the note
 * @returns Array of categories
 */
export async function getNoteCategories(
  noteId: string
): Promise<Array<{ id: string; name: string }>> {
  try {
    const note = await prisma.note.findUnique({
      where: { id: noteId },
      include: {
        categories: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return note?.categories || [];
  } catch (error) {
    console.error(`Error getting categories for note ${noteId}:`, error);
    throw error;
  }
}

/**
 * Get tags for a note
 * @param noteId The ID of the note
 * @returns Array of tags
 */
export async function getNoteTags(
  noteId: string
): Promise<Array<{ id: string; name: string }>> {
  try {
    const note = await prisma.note.findUnique({
      where: { id: noteId },
      include: {
        tags: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return note?.tags || [];
  } catch (error) {
    console.error(`Error getting tags for note ${noteId}:`, error);
    throw error;
  }
}
