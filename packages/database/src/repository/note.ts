import type { Prisma } from "@prisma/client";

import { prisma } from "../client.js";
import {
  computeContentHash,
  computeRawHtmlHash,
} from "../import-integrity/content-hash.js";
import {
  padSimHash,
  simHashBands,
  simHashDistance,
} from "../import-integrity/simhash.js";
import type {
  ParsedHTMLFile,
  ParsedIngredientLine,
  ParsedInstructionLine,
} from "../models/parsed-html-file.js";
import {
  type NoteCategoryRecord,
  getNoteCategoryMemberships,
  saveImportedCategory,
} from "./categories.js";
import { type NoteSourceRecord, getNoteSources } from "./source.js";

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
        parsedIngredientLines: true,
        parsedInstructionLines: true,
      },
    });
    return note;
  } catch (error) {
    console.error({ error });
    throw error;
  }
}

/**
 * Marks a note COMPLETED once its workers finish, unless it is waiting for a duplicate decision.
 *
 * @example
 * await markNoteCompleted(noteId) // { updated: false } when the note is DUPLICATE
 */
export async function markNoteCompleted(
  noteId: string
): Promise<{ updated: boolean }> {
  const result = await prisma.note.updateMany({
    where: { id: noteId, status: { not: "DUPLICATE" } },
    data: { status: "COMPLETED" },
  });
  return { updated: result.count > 0 };
}

/** Hashes stored with a note so re-imports and identical copies are found without comparing text. */
function noteContentHashes(file: ParsedHTMLFile): {
  rawHtmlHash: string;
  contentHash: string | null;
} {
  return {
    rawHtmlHash: computeRawHtmlHash(file.contents),
    contentHash: computeContentHash({
      title: file.title,
      ingredientLines: file.ingredients.map((line) => line.reference),
      instructionLines: file.instructions.map((line) => line.reference),
    }),
  };
}

/**
 * Update the SimHash for a note's title, with the bands that index it.
 */
export async function updateNoteTitleSimHash(
  noteId: string,
  titleSimHash: string
): Promise<void> {
  const padded = titleSimHash ? padSimHash(titleSimHash) : titleSimHash;
  await prisma.note.update({
    where: { id: noteId },
    data: {
      titleSimHash: padded,
      titleSimHashBands: simHashBands(padded),
    },
  });
}

/**
 * Notes whose title SimHash is within `maxHammingDistance` (at most 3) of the given one. Candidates come from the GIN-indexed bands (two hashes within distance 3 share a band), so the query never scans every note; archived notes are skipped.
 *
 * @example
 * await findNotesWithSimilarTitles(hash, 3, noteId) // [{ id, title, titleSimHash, status }]
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
    const bands = simHashBands(titleSimHash);
    const candidates = await prisma.note.findMany({
      where: {
        titleSimHashBands: { hasSome: bands },
        archivedAt: null,
        ...(excludeNoteId && { id: { not: excludeNoteId } }),
      },
      select: {
        id: true,
        title: true,
        titleSimHash: true,
        status: true,
      },
    });

    return candidates.filter(
      (note) =>
        note.titleSimHash !== null &&
        simHashDistance(titleSimHash, note.titleSimHash) <= maxHammingDistance
    );
  } catch (error) {
    console.error("Error finding notes with similar titles:", error);
    return [];
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
        ...noteContentHashes(file),
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
    return response;
  } catch (error) {
    console.error({ error });
    throw error;
  }
}

export async function createNoteWithEvernoteMetadata(
  file: ParsedHTMLFile,
  importId?: string
): Promise<NoteWithParsedLines & { evernoteMetadataId: string | null }> {
  try {
    // Extract Evernote metadata from the file
    const source = file.evernoteMetadata?.source;
    const tags = file.evernoteMetadata?.tags || [];
    const originalCreatedAt = file.evernoteMetadata?.originalCreatedAt;

    // If we have an importId, check if a note with this importId already exists
    if (importId) {
      const existingNote = await prisma.note.findFirst({
        where: { importId },
        include: {
          parsedIngredientLines: true,
          parsedInstructionLines: true,
          evernoteMetadata: true,
        },
      });

      if (existingNote) {
        // Update the existing note with extended transaction timeout
        const response = await prisma.$transaction(
          async (tx) => {
            return await tx.note.update({
              where: { id: existingNote.id },
              data: {
                title: file.title,
                html: file.contents,
                // Counters
                totalIngredientLines: file.ingredients.length,
                totalInstructionLines: file.instructions.length,
                parsingErrorCount: 0,
                ...noteContentHashes(file),
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
          },
          { timeout: 30000 }
        ); // 30 second timeout

        return response;
      }
    }

    // Use a transaction to handle potential race conditions with extended timeout
    return await prisma.$transaction(
      async (tx) => {
        // Double-check for existing note within the transaction
        if (importId) {
          const existingNoteInTx = await tx.note.findFirst({
            where: { importId },
          });

          if (existingNoteInTx) {
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
                ...noteContentHashes(file),
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
            ...noteContentHashes(file),
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
        return response;
      },
      { timeout: 30000 }
    ); // 30 second timeout
  } catch (error) {
    console.error(`[CREATE_NOTE_DEBUG] Error occurred:`, error);
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
    return await saveImportedCategory(noteId, categoryName);
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
    const memberships = await prisma.noteCategory.findMany({
      where: { noteId, state: { in: ["APPROVED", "INFERRED"] } },
      select: { category: { select: { id: true, name: true } } },
      orderBy: { category: { name: "asc" } },
    });
    return memberships.map((membership) => membership.category);
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

/**
 * Get import statistics for the dashboard
 */
export async function getImportStats(): Promise<{
  numberOfIngredients: number;
  numberOfNotes: number;
  numberOfParsingErrors: number;
}> {
  try {
    const [ingredientCount, noteCount, parsingErrorCount] = await Promise.all([
      // Distinct foods the imported lines mention
      prisma.foodConcept.count({ where: { mentions: { some: {} } } }),

      // Count total notes
      prisma.note.count(),

      // Count total parsing errors (sum of parsingErrorCount from all notes)
      prisma.note.aggregate({
        _sum: {
          parsingErrorCount: true,
        },
      }),
    ]);

    return {
      numberOfIngredients: ingredientCount,
      numberOfNotes: noteCount,
      numberOfParsingErrors: parsingErrorCount._sum.parsingErrorCount || 0,
    };
  } catch (error) {
    console.error("Failed to get import stats:", error);
    throw error;
  }
}

// ============================================================================
// NOTE VIEWER
// ============================================================================

export const NOTE_STATUSES = [
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "DUPLICATE",
] as const;

export type NoteStatusValue = (typeof NOTE_STATUSES)[number];

export interface NotesPageQuery {
  status?: NoteStatusValue;
  query?: string;
  /** Archived notes (superseded duplicates) are hidden unless asked for. */
  includeArchived?: boolean;
  page?: number;
  pageSize?: number;
}

export interface NoteListItemRecord {
  id: string;
  title: string | null;
  status: NoteStatusValue;
  duplicateConfidence: number | null;
  parsingErrorCount: number;
  ingredientLineCount: number;
  instructionLineCount: number;
  thumbnailUrl: string | null;
  notebook: string | null;
  recipeId: string | null;
  archivedAt: string | null;
  createdAt: string;
}

export interface NotesPageResult {
  items: NoteListItemRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export interface NoteIngredientLineRecord {
  id: string;
  blockIndex: number;
  lineIndex: number;
  reference: string;
  parseStatus:
    | "AWAITING_PARSING"
    | "COMPLETED_WITH_ERROR"
    | "COMPLETED_SUCCESSFULLY";
  reviewStatus: "UNREVIEWED" | "CORRECT" | "INCORRECT";
  isActive: boolean;
  parserVersion: string | null;
  /** INGREDIENT unless structure review filed the line as a heading, note, or other text, or moved it to the instructions. */
  lineKind: "INGREDIENT" | "INSTRUCTION" | "SECTION_HEADING" | "NOTE" | "OTHER";
}

export interface NoteDetailRecord {
  id: string;
  title: string | null;
  status: NoteStatusValue;
  createdAt: string;
  errorMessage: string | null;
  duplicateConfidence: number | null;
  parsingErrorCount: number;
  archivedAt: string | null;
  archivedReason: string | null;
  supersededById: string | null;
  /** Open duplicate candidates where this note is the incoming one. */
  pendingDuplicateIds: string[];
  evernote: {
    source: string | null;
    notebook: string | null;
    tags: string[];
    originalCreatedAt: string | null;
  } | null;
  images: {
    id: string;
    url: string;
    thumbnailUrl: string | null;
    processingStatus: string;
  }[];
  sources: NoteSourceRecord[];
  categories: NoteCategoryRecord[];
  tags: { id: string; name: string }[];
  ingredientBlocks: { blockIndex: number; lines: NoteIngredientLineRecord[] }[];
  instructions: {
    id: string;
    lineIndex: number;
    text: string;
    isActive: boolean;
    lineKind: NoteIngredientLineRecord["lineKind"];
  }[];
  recipeId: string | null;
}

const DEFAULT_NOTES_PAGE_SIZE = 25;

/**
 * Paginated, filterable note list for the /notes page.
 */
export async function getNotesPage({
  status,
  query,
  includeArchived = false,
  page = 1,
  pageSize = DEFAULT_NOTES_PAGE_SIZE,
}: NotesPageQuery = {}): Promise<NotesPageResult> {
  const currentPage = Math.max(1, Math.floor(page));
  const trimmedQuery = query?.trim();

  const where: Prisma.NoteWhereInput = {
    ...(status ? { status } : {}),
    ...(includeArchived ? {} : { archivedAt: null }),
    ...(trimmedQuery
      ? { title: { contains: trimmedQuery, mode: "insensitive" } }
      : {}),
  };

  const [total, notes] = await Promise.all([
    prisma.note.count({ where }),
    prisma.note.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        title: true,
        status: true,
        duplicateConfidence: true,
        parsingErrorCount: true,
        archivedAt: true,
        createdAt: true,
        evernoteMetadata: { select: { notebook: true } },
        images: {
          select: { thumbnailImageUrl: true, originalImageUrl: true },
          take: 1,
        },
        recipe: { select: { id: true } },
        _count: {
          select: { parsedIngredientLines: true, parsedInstructionLines: true },
        },
      },
    }),
  ]);

  return {
    total,
    page: currentPage,
    pageSize,
    items: notes.map((note) => {
      const image = note.images[0];
      return {
        id: note.id,
        title: note.title,
        status: note.status,
        duplicateConfidence: note.duplicateConfidence,
        parsingErrorCount: note.parsingErrorCount,
        ingredientLineCount: note._count.parsedIngredientLines,
        instructionLineCount: note._count.parsedInstructionLines,
        thumbnailUrl: image
          ? (image.thumbnailImageUrl ?? image.originalImageUrl)
          : null,
        notebook: note.evernoteMetadata?.notebook ?? null,
        recipeId: note.recipe?.id ?? null,
        archivedAt: note.archivedAt?.toISOString() ?? null,
        createdAt: note.createdAt.toISOString(),
      };
    }),
  };
}

/**
 * Everything the note detail page needs, shaped for display.
 */
export async function getNoteDetail(
  noteId: string
): Promise<NoteDetailRecord | null> {
  const note = await prisma.note.findUnique({
    where: { id: noteId },
    include: {
      evernoteMetadata: true,
      images: { orderBy: { createdAt: "asc" } },
      tags: { select: { id: true, name: true } },
      parsedIngredientLines: {
        orderBy: [{ blockIndex: "asc" }, { lineIndex: "asc" }],
      },
      parsedInstructionLines: { orderBy: { lineIndex: "asc" } },
      recipe: { select: { id: true } },
      duplicateCandidates: {
        where: { status: "PENDING" },
        select: { id: true },
      },
    },
  });

  if (!note) return null;

  const [sources, categories] = await Promise.all([
    getNoteSources(noteId),
    getNoteCategoryMemberships(noteId),
  ]);

  const blocks = new Map<number, NoteIngredientLineRecord[]>();
  for (const line of note.parsedIngredientLines) {
    const record: NoteIngredientLineRecord = {
      id: line.id,
      blockIndex: line.blockIndex,
      lineIndex: line.lineIndex,
      reference: line.reference,
      parseStatus: line.parseStatus,
      reviewStatus: line.reviewStatus,
      isActive: line.isActive,
      parserVersion: line.parserVersion,
      lineKind: line.lineKind,
    };
    const block = blocks.get(line.blockIndex) ?? [];
    block.push(record);
    blocks.set(line.blockIndex, block);
  }

  const metadata = note.evernoteMetadata;

  return {
    id: note.id,
    title: note.title,
    status: note.status,
    createdAt: note.createdAt.toISOString(),
    errorMessage: note.errorMessage,
    duplicateConfidence: note.duplicateConfidence,
    parsingErrorCount: note.parsingErrorCount,
    archivedAt: note.archivedAt?.toISOString() ?? null,
    archivedReason: note.archivedReason,
    supersededById: note.supersededById,
    pendingDuplicateIds: note.duplicateCandidates.map((candidate) => candidate.id),
    evernote: metadata
      ? {
          source: metadata.source,
          notebook: metadata.notebook,
          tags: metadata.tags,
          originalCreatedAt: metadata.originalCreatedAt?.toISOString() ?? null,
        }
      : null,
    images: note.images.map((image) => ({
      id: image.id,
      url: image.crop3x2ImageUrl ?? image.originalImageUrl,
      thumbnailUrl: image.thumbnailImageUrl,
      processingStatus: image.processingStatus,
    })),
    sources,
    categories,
    tags: note.tags,
    ingredientBlocks: [...blocks.entries()]
      .sort(([a], [b]) => a - b)
      .map(([blockIndex, lines]) => ({ blockIndex, lines })),
    instructions: note.parsedInstructionLines.map((line) => ({
      id: line.id,
      lineIndex: line.lineIndex,
      text: line.normalizedText ?? line.originalText,
      isActive: line.isActive,
      lineKind: line.lineKind,
    })),
    recipeId: note.recipe?.id ?? null,
  };
}

/**
 * Record whether a parsed ingredient line came out right.
 */
export async function setIngredientLineReviewStatus(
  lineId: string,
  reviewStatus: "UNREVIEWED" | "CORRECT" | "INCORRECT"
): Promise<{ id: string; noteId: string | null }> {
  return prisma.parsedIngredientLine.update({
    where: { id: lineId },
    data: { reviewStatus },
    select: { id: true, noteId: true },
  });
}
