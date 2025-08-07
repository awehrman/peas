import type { PrismaClient } from "@peas/database";

/**
 * Get patterns with their related ingredient lines
 */
export async function getPatternsWithIngredientLines(
  prisma: PrismaClient,
  options: {
    limit?: number;
    offset?: number;
    minOccurrenceCount?: number;
    noteId?: string;
  } = {}
) {
  const { limit = 50, offset = 0, minOccurrenceCount = 1, noteId } = options;

  const whereClause: any = {
    occurrenceCount: {
      gte: minOccurrenceCount,
    },
  };

  if (noteId) {
    whereClause.parsedIngredientLines = {
      some: {
        noteId,
      },
    };
  }

  return prisma.uniqueLinePattern.findMany({
    where: whereClause,
    include: {
      parsedIngredientLines: {
        select: {
          id: true,
          reference: true,
          lineIndex: true,
          noteId: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { occurrenceCount: "desc" },
    take: limit,
    skip: offset,
  });
}

/**
 * Get ingredient lines that use a specific pattern
 */
export async function getIngredientLinesByPattern(
  prisma: PrismaClient,
  patternId: string,
  options: {
    limit?: number;
    offset?: number;
    noteId?: string;
  } = {}
) {
  const { limit = 100, offset = 0, noteId } = options;

  const whereClause: any = {
    uniqueLinePatternId: patternId,
  };

  if (noteId) {
    whereClause.noteId = noteId;
  }

  return prisma.parsedIngredientLine.findMany({
    where: whereClause,
    select: {
      id: true,
      reference: true,
      lineIndex: true,
      noteId: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });
}

/**
 * Get patterns that are similar to a given pattern (same rule sequence)
 */
export async function getSimilarPatterns(
  prisma: PrismaClient,
  ruleIds: string[],
  options: {
    limit?: number;
    offset?: number;
  } = {}
) {
  const { limit = 10, offset = 0 } = options;

  return prisma.uniqueLinePattern.findMany({
    where: {
      ruleIds: {
        equals: ruleIds,
      },
    },
    include: {
      parsedIngredientLines: {
        select: {
          id: true,
          reference: true,
          lineIndex: true,
          noteId: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 5, // Limit the number of ingredient lines per pattern
      },
    },
    orderBy: { occurrenceCount: "desc" },
    take: limit,
    skip: offset,
  });
}

/**
 * Get pattern statistics
 */
export async function getPatternStatistics(prisma: PrismaClient) {
  const [
    totalPatterns,
    totalIngredientLines,
    patternsWithLines,
    averageOccurrenceCount,
  ] = await Promise.all([
    prisma.uniqueLinePattern.count(),
    prisma.parsedIngredientLine.count({
      where: {
        uniqueLinePatternId: {
          not: null,
        },
      },
    }),
    prisma.uniqueLinePattern.count({
      where: {
        parsedIngredientLines: {
          some: {},
        },
      },
    }),
    prisma.uniqueLinePattern.aggregate({
      _avg: {
        occurrenceCount: true,
      },
    }),
  ]);

  return {
    totalPatterns,
    totalIngredientLines,
    patternsWithLines,
    averageOccurrenceCount: averageOccurrenceCount._avg.occurrenceCount || 0,
    coveragePercentage:
      totalPatterns > 0 ? (patternsWithLines / totalPatterns) * 100 : 0,
  };
}

/**
 * Link a pattern to an ingredient line
 */
export async function linkPatternToIngredientLine(
  prisma: PrismaClient,
  patternId: string,
  ingredientLineId: string
) {
  return prisma.parsedIngredientLine.update({
    where: { id: ingredientLineId },
    data: { uniqueLinePatternId: patternId },
  });
}

/**
 * Get unlinked ingredient lines (those without a pattern)
 */
export async function getUnlinkedIngredientLines(
  prisma: PrismaClient,
  options: {
    limit?: number;
    offset?: number;
    noteId?: string;
  } = {}
) {
  const { limit = 100, offset = 0, noteId } = options;

  const whereClause: any = {
    uniqueLinePatternId: null,
  };

  if (noteId) {
    whereClause.noteId = noteId;
  }

  return prisma.parsedIngredientLine.findMany({
    where: whereClause,
    select: {
      id: true,
      reference: true,
      lineIndex: true,
      noteId: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });
}
