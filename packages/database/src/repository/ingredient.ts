import type { ParseStatus } from "@prisma/client";

import { prisma } from "../client.js";

// Define the ParsedSegment type locally to avoid circular dependencies
interface ParsedSegment {
  index: number;
  rule: string;
  type: string;
  value: string;
  processingTime?: number;
}

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

/**
 * Save a parsed ingredient line with its segments
 */
export async function saveParsedIngredientLine(
  noteId: string,
  lineIndex: number,
  reference: string,
  parseStatus: ParseStatus,
  rule: string | undefined,
  blockIndex: number,
  isActive: boolean,
  parsedSegments: ParsedSegment[]
): Promise<{ id: string }> {
  // Find existing line or create new one
  const existingLine = await prisma.parsedIngredientLine.findFirst({
    where: {
      noteId,
      lineIndex,
    },
  });

  const lineRecord = existingLine
    ? await prisma.parsedIngredientLine.update({
        where: { id: existingLine.id },
        data: {
          reference,
          parseStatus,
          rule,
          parsedAt: new Date(),
          isActive,
        },
      })
    : await prisma.parsedIngredientLine.create({
        data: {
          noteId,
          blockIndex,
          lineIndex,
          reference,
          rule,
          parseStatus,
          parsedAt: new Date(),
          isActive,
        },
      });

  // Replace segments (delete old, insert new)
  await prisma.parsedSegment.deleteMany({
    where: { ingredientLineId: lineRecord.id },
  });

  if (parsedSegments.length > 0) {
    await prisma.parsedSegment.createMany({
      data: parsedSegments.map((seg) => ({
        ingredientLineId: lineRecord.id,
        index: seg.index,
        rule: seg.rule,
        type: seg.type,
        value: seg.value,
        processingTime: seg.processingTime,
      })),
    });
  }

  return { id: lineRecord.id };
}

/**
 * Update a parsed ingredient line by its ID
 */
export async function updateParsedIngredientLineById(
  lineId: string,
  reference: string,
  parseStatus: ParseStatus,
  rule: string | undefined,
  isActive: boolean
): Promise<{ id: string }> {
  const lineRecord = await prisma.parsedIngredientLine.update({
    where: { id: lineId },
    data: {
      reference,
      parseStatus,
      rule,
      parsedAt: new Date(),
      isActive,
    },
  });

  return { id: lineRecord.id };
}

/**
 * Upsert a parsed ingredient line (create or update)
 */
export async function upsertParsedIngredientLine(
  noteId: string,
  lineIndex: number,
  reference: string,
  parseStatus: ParseStatus,
  rule: string | undefined,
  blockIndex: number,
  isActive: boolean
): Promise<{ id: string }> {
  const existingLine = await prisma.parsedIngredientLine.findFirst({
    where: {
      noteId,
      lineIndex,
      reference, // Include reference in the lookup to prevent duplicates
    },
  });

  const lineRecord = existingLine
    ? await prisma.parsedIngredientLine.update({
        where: { id: existingLine.id },
        data: {
          parseStatus,
          rule,
          parsedAt: new Date(),
          isActive,
        },
      })
    : await prisma.parsedIngredientLine.create({
        data: {
          noteId,
          blockIndex,
          lineIndex,
          reference,
          rule,
          parseStatus,
          parsedAt: new Date(),
          isActive,
        },
      });

  return { id: lineRecord.id };
}

/**
 * Replace segments for an ingredient line
 */
export async function replaceParsedSegments(
  ingredientLineId: string,
  parsedSegments: ParsedSegment[]
): Promise<void> {
  // Remove existing segments
  await prisma.parsedSegment.deleteMany({
    where: { ingredientLineId },
  });

  // Insert new segments
  if (parsedSegments.length > 0) {
    await prisma.parsedSegment.createMany({
      data: parsedSegments.map((seg) => ({
        ingredientLineId,
        index: seg.index,
        rule: seg.rule,
        type: seg.type,
        value: seg.value,
        processingTime: seg.processingTime,
      })),
    });
  }
}

/**
 * Find or create ingredient with pluralization support
 */
export async function findOrCreateIngredient(
  ingredientName: string
): Promise<{ id: string; name: string; isNew: boolean }> {
  const { default: pluralize } = await import("pluralize");
  const singular = pluralize.singular(ingredientName);
  const plural = pluralize.plural(ingredientName);

  // Try to find existing ingredient using pluralize for lookup only
  let ingredient = await prisma.ingredient.findFirst({
    where: {
      OR: [
        { name: singular },
        { name: plural },
        { name: ingredientName },
        {
          aliases: {
            some: { name: { in: [singular, plural, ingredientName] } },
          },
        },
      ],
    },
  });

  if (!ingredient) {
    // Check if the original name is plural (by comparing with singularized version)
    const isPlural = ingredientName !== singular;

    // Create new ingredient
    // If original is plural, save singular as name and original as plural
    // If original is singular, save singular as name and leave plural as null
    const createData = isPlural
      ? {
          name: singular,
          plural: ingredientName, // Use original plural
        }
      : {
          name: ingredientName, // Use original singular
          plural: null, // Leave as null for singular inputs
        };

    ingredient = await prisma.ingredient.create({
      data: createData,
    });
    return { id: ingredient.id, name: ingredient.name, isNew: true };
  }

  // If ingredient exists but doesn't have the plural form we found, update it
  if (ingredientName !== singular && ingredient.plural !== ingredientName) {
    await prisma.ingredient.update({
      where: { id: ingredient.id },
      data: { plural: ingredientName },
    });
  }

  return { id: ingredient.id, name: ingredient.name, isNew: false };
}

/**
 * Create ingredient reference linking ingredient to parsed line
 */
export async function createIngredientReference(
  ingredientId: string,
  parsedLineId: string,
  segmentIndex: number,
  reference: string,
  noteId?: string,
  context?: string
): Promise<void> {
  try {
    await prisma.ingredientReference.create({
      data: {
        ingredientId,
        parsedLineId,
        segmentIndex,
        reference,
        noteId,
        context: context || "main_ingredient",
      },
    });
  } catch (error) {
    // Handle unique constraint violations gracefully
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      // Reference already exists, which is fine
      return;
    }
    throw error;
  }
}

/**
 * Clean up all data from the database (DANGEROUS - deletes everything)
 */
export async function cleanupAllData(): Promise<{
  deletedCounts: {
    notes: number;
    ingredients: number;
    parsedSegments: number;
    uniqueLinePatterns: number;
    evernoteMetadata: number;
    sources: number;
    websites: number;
    books: number;
    queueJobs: number;
    statusEvents: number;
    urls: number;
  };
}> {
  try {
    // Delete in order to respect foreign key constraints
    const deletedCounts = {
      notes: 0,
      ingredients: 0,
      parsedSegments: 0,
      uniqueLinePatterns: 0,
      evernoteMetadata: 0,
      sources: 0,
      websites: 0,
      books: 0,
      queueJobs: 0,
      statusEvents: 0,
      urls: 0,
    };

    // Delete queue jobs first (they reference notes)
    const queueJobsResult = await prisma.queueJob.deleteMany({});
    deletedCounts.queueJobs = queueJobsResult.count;

    // Delete status events (they reference notes)
    const statusEventsResult = await prisma.noteStatusEvent.deleteMany({});
    deletedCounts.statusEvents = statusEventsResult.count;

    // Delete parsed segments (they reference ingredient lines)
    const parsedSegmentsResult = await prisma.parsedSegment.deleteMany({});
    deletedCounts.parsedSegments = parsedSegmentsResult.count;

    // Delete ingredient references (they reference ingredients and parsed lines)
    await prisma.ingredientReference.deleteMany({});

    // Delete parsed ingredient lines (they reference notes)
    await prisma.parsedIngredientLine.deleteMany({});

    // Delete parsed instruction lines (they reference notes)
    await prisma.parsedInstructionLine.deleteMany({});

    // Delete notes (this will cascade to related data)
    const notesResult = await prisma.note.deleteMany({});
    deletedCounts.notes = notesResult.count;

    // Delete ingredients
    const ingredientsResult = await prisma.ingredient.deleteMany({});
    deletedCounts.ingredients = ingredientsResult.count;

    // Delete unique line patterns
    const uniqueLinePatternsResult = await prisma.uniqueLinePattern.deleteMany(
      {}
    );
    deletedCounts.uniqueLinePatterns = uniqueLinePatternsResult.count;

    // Delete Evernote metadata
    const evernoteMetadataResult = await prisma.evernoteMetadata.deleteMany({});
    deletedCounts.evernoteMetadata = evernoteMetadataResult.count;

    // Delete URLs first (they reference sources and websites)
    const urlsResult = await prisma.uRL.deleteMany({});
    deletedCounts.urls = urlsResult.count;

    // Delete websites (after URLs are deleted)
    const websitesResult = await prisma.website.deleteMany({});
    deletedCounts.websites = websitesResult.count;

    // Delete books
    const booksResult = await prisma.book.deleteMany({});
    deletedCounts.books = booksResult.count;

    // Delete sources (after URLs are deleted)
    const sourcesResult = await prisma.source.deleteMany({});
    deletedCounts.sources = sourcesResult.count;

    return { deletedCounts };
  } catch (error) {
    console.error("Failed to cleanup all data:", error);
    throw error;
  }
}
