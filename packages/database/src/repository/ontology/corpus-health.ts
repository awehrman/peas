import type { DbClient } from "./helpers.js";
import { getReinterpretBacklog } from "./reinterpret-runs.js";

import type { ResolutionStatus } from "@prisma/client";

import { prisma } from "../../client.js";

const TOP_UNKNOWN_LIMIT = 8;

export interface CorpusHealthRecord {
  /** Active ingredient lines. */
  lineCount: number;
  /** Active lines with at least one stored mention. */
  linesWithMentions: number;
  /** Active lines by parse outcome. */
  parsedSuccessfully: number;
  parsedWithErrors: number;
  awaitingParsing: number;
  /** Mentions on active lines by resolution status. */
  mentions: Record<ResolutionStatus, number> & { total: number };
  openDiscoveryCount: number;
  /** Open UNKNOWN_FOOD_PHRASE discoveries with the most mentions. */
  topUnknownPhrases: {
    discoveryId: string;
    phrase: string;
    mentionCount: number;
  }[];
  reinterpretBacklog: Awaited<ReturnType<typeof getReinterpretBacklog>>;
}

/**
 * Database counts for the "Corpus health" card on /teach and the queue's GET /metrics/ingredients.
 *
 * @example
 * await getCorpusHealth()
 * // { lineCount: 5120, linesWithMentions: 5098, mentions: { total: 5402, AUTO_RESOLVED: 4100, NEEDS_REVIEW: 610, UNRESOLVED: 540, VERIFIED: 152 }, openDiscoveryCount: 87, topUnknownPhrases: [{ phrase: "gochugaru", mentionCount: 14 }], ... }
 */
export async function getCorpusHealth(
  db: DbClient = prisma
): Promise<CorpusHealthRecord> {
  const activeLine = { isActive: true };
  const [
    lineCount,
    linesWithMentions,
    linesByParseStatus,
    mentionsByStatus,
    openDiscoveryCount,
    unknownPhrases,
    reinterpretBacklog,
  ] = await Promise.all([
    db.parsedIngredientLine.count({ where: activeLine }),
    db.parsedIngredientLine.count({
      where: { ...activeLine, mentions: { some: {} } },
    }),
    db.parsedIngredientLine.groupBy({
      by: ["parseStatus"],
      where: activeLine,
      _count: { _all: true },
    }),
    db.ingredientMention.groupBy({
      by: ["resolutionStatus"],
      where: { parsedLine: activeLine },
      _count: { _all: true },
    }),
    db.discovery.count({ where: { status: "OPEN" } }),
    db.discovery.findMany({
      where: { status: "OPEN", type: "UNKNOWN_FOOD_PHRASE" },
      orderBy: [{ mentionCount: "desc" }, { key: "asc" }],
      take: TOP_UNKNOWN_LIMIT,
      select: { id: true, key: true, mentionCount: true },
    }),
    getReinterpretBacklog(db),
  ]);

  const parsed = (status: string) =>
    linesByParseStatus.find((row) => row.parseStatus === status)?._count._all ??
    0;
  const mentioned = (status: ResolutionStatus) =>
    mentionsByStatus.find((row) => row.resolutionStatus === status)?._count
      ._all ?? 0;

  return {
    lineCount,
    linesWithMentions,
    parsedSuccessfully: parsed("COMPLETED_SUCCESSFULLY"),
    parsedWithErrors: parsed("COMPLETED_WITH_ERROR"),
    awaitingParsing: parsed("AWAITING_PARSING"),
    mentions: {
      total: mentionsByStatus.reduce((sum, row) => sum + row._count._all, 0),
      AUTO_RESOLVED: mentioned("AUTO_RESOLVED"),
      NEEDS_REVIEW: mentioned("NEEDS_REVIEW"),
      UNRESOLVED: mentioned("UNRESOLVED"),
      VERIFIED: mentioned("VERIFIED"),
    },
    openDiscoveryCount,
    topUnknownPhrases: unknownPhrases.map((row) => ({
      discoveryId: row.id,
      phrase: row.key,
      mentionCount: row.mentionCount,
    })),
    reinterpretBacklog,
  };
}
