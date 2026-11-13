import { prisma } from "../client.js";

const TOP_LIST_LIMIT = 8;

export interface LabelCountRecord {
  label: string;
  count: number;
}

export interface TopConceptRecord {
  conceptId: string;
  name: string;
  /** Active ingredient lines that mention the concept. */
  lineCount: number;
}

export interface DashboardStatsRecord {
  noteCount: number;
  recipeCount: number;
  notesReadyToPromote: number;
  /** Concepts that are not merged away (DEPRECATED). */
  conceptCount: number;
  verifiedConceptCount: number;
  instructionLineCount: number;
  notesByStatus: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    duplicate: number;
  };
  ingredientLines: {
    total: number;
    parsedSuccessfully: number;
    parsedWithErrors: number;
    awaitingParsing: number;
    markedCorrect: number;
    markedIncorrect: number;
  };
  topConcepts: TopConceptRecord[];
  topSources: LabelCountRecord[];
  topCategories: LabelCountRecord[];
  topTags: LabelCountRecord[];
  /** Ascending by year; years with no notes are omitted. */
  notesBySavedYear: { year: number; count: number }[];
}

/**
 * Corpus-wide numbers for the dashboard. Only active ingredient lines are
 * counted, matching what note pages show.
 */
export async function getDashboardStats(): Promise<DashboardStatsRecord> {
  const activeLines = { isActive: true };

  const [
    noteCount,
    recipeCount,
    notesReadyToPromote,
    conceptCount,
    verifiedConceptCount,
    instructionLineCount,
    notesByStatus,
    linesByParseStatus,
    linesByReviewStatus,
    topConcepts,
    topSources,
    topCategories,
    topTags,
    notesBySavedYear,
  ] = await Promise.all([
    prisma.note.count(),
    prisma.recipe.count(),
    prisma.note.count({ where: { status: "COMPLETED", recipe: null } }),
    prisma.foodConcept.count({ where: { status: { not: "DEPRECATED" } } }),
    prisma.foodConcept.count({ where: { status: "VERIFIED" } }),
    prisma.parsedInstructionLine.count({ where: { isActive: true } }),
    prisma.note.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.parsedIngredientLine.groupBy({
      by: ["parseStatus"],
      where: activeLines,
      _count: { _all: true },
    }),
    prisma.parsedIngredientLine.groupBy({
      by: ["reviewStatus"],
      where: activeLines,
      _count: { _all: true },
    }),
    getTopConcepts(),
    getTopSources(),
    getTopTaxonomy("category"),
    getTopTaxonomy("tag"),
    getNotesBySavedYear(),
  ]);

  const countNotes = (status: string) =>
    notesByStatus.find((group) => group.status === status)?._count._all ?? 0;
  const countParsed = (status: string) =>
    linesByParseStatus.find((group) => group.parseStatus === status)?._count
      ._all ?? 0;
  const countReviewed = (status: string) =>
    linesByReviewStatus.find((group) => group.reviewStatus === status)?._count
      ._all ?? 0;

  return {
    noteCount,
    recipeCount,
    notesReadyToPromote,
    conceptCount,
    verifiedConceptCount,
    instructionLineCount,
    notesByStatus: {
      pending: countNotes("PENDING"),
      processing: countNotes("PROCESSING"),
      completed: countNotes("COMPLETED"),
      failed: countNotes("FAILED"),
      duplicate: countNotes("DUPLICATE"),
    },
    ingredientLines: {
      total: linesByParseStatus.reduce(
        (sum, group) => sum + group._count._all,
        0
      ),
      parsedSuccessfully: countParsed("COMPLETED_SUCCESSFULLY"),
      parsedWithErrors: countParsed("COMPLETED_WITH_ERROR"),
      awaitingParsing: countParsed("AWAITING_PARSING"),
      markedCorrect: countReviewed("CORRECT"),
      markedIncorrect: countReviewed("INCORRECT"),
    },
    topConcepts,
    topSources,
    topCategories,
    topTags,
    notesBySavedYear,
  };
}

/** Concepts mentioned by the most active ingredient lines. */
async function getTopConcepts(): Promise<TopConceptRecord[]> {
  const rows = await prisma.$queryRaw<
    { conceptId: string; name: string; lineCount: bigint }[]
  >`
    SELECT c.id::text AS "conceptId", c."canonicalName" AS name,
           COUNT(DISTINCT m."parsedLineId") AS "lineCount"
    FROM "IngredientMention" m
    JOIN "FoodConcept" c ON c.id = m."conceptId"
    JOIN "ParsedIngredientLine" l ON l.id = m."parsedLineId"
    WHERE l."isActive" = true
    GROUP BY c.id, c."canonicalName"
    ORDER BY "lineCount" DESC, c."canonicalName" ASC
    LIMIT ${TOP_LIST_LIMIT}
  `;
  return rows.map((row) => ({
    conceptId: row.conceptId,
    name: row.name,
    lineCount: Number(row.lineCount),
  }));
}

/** Websites with the most saved recipe URLs. */
async function getTopSources(): Promise<LabelCountRecord[]> {
  const websites = await prisma.website.findMany({
    where: { urls: { some: {} } },
    orderBy: { urls: { _count: "desc" } },
    take: TOP_LIST_LIMIT,
    select: {
      siteName: true,
      domainName: true,
      _count: { select: { urls: true } },
    },
  });

  return websites.map((website) => ({
    label: website.siteName ?? website.domainName ?? "Unknown site",
    count: website._count.urls,
  }));
}

/**
 * Most-used category or tag names by note count. Names can repeat across
 * rows, so counts are merged by name.
 */
async function getTopTaxonomy(
  kind: "category" | "tag"
): Promise<LabelCountRecord[]> {
  const query = {
    where: { notes: { some: {} } },
    select: { name: true, _count: { select: { notes: true } } },
  };
  const rows =
    kind === "category"
      ? await prisma.category.findMany(query)
      : await prisma.tag.findMany(query);

  const countByName = new Map<string, number>();
  for (const row of rows) {
    countByName.set(
      row.name,
      (countByName.get(row.name) ?? 0) + row._count.notes
    );
  }

  return [...countByName.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, TOP_LIST_LIMIT);
}

/** When recipes were first saved in Evernote, bucketed by year. */
async function getNotesBySavedYear(): Promise<
  DashboardStatsRecord["notesBySavedYear"]
> {
  const rows = await prisma.evernoteMetadata.findMany({
    where: {
      note: { isNot: null },
      OR: [
        { originalCreatedAt: { not: null } },
        { evernoteCreatedAt: { not: null } },
      ],
    },
    select: { originalCreatedAt: true, evernoteCreatedAt: true },
  });

  const countByYear = new Map<number, number>();
  for (const row of rows) {
    const savedAt = row.originalCreatedAt ?? row.evernoteCreatedAt;
    if (!savedAt) continue;
    const year = savedAt.getUTCFullYear();
    countByYear.set(year, (countByYear.get(year) ?? 0) + 1);
  }

  return [...countByYear.entries()]
    .sort(([a], [b]) => a - b)
    .map(([year, count]) => ({ year, count }));
}
