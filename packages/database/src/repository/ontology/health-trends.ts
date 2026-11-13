import { getCorpusHealth } from "./corpus-health.js";
import { type DbClient, toJson } from "./helpers.js";
import { getCurrentRevision } from "./revision.js";

import { PARSER_VERSION } from "@peas/parser/v2";
import type { DiscoveryType } from "@prisma/client";

import { prisma } from "../../client.js";

export const SNAPSHOT_TRIGGERS = [
  "SCHEDULED",
  "REINTERPRET",
  "REPARSE",
  "MANUAL",
] as const;
export type SnapshotTrigger = (typeof SNAPSHOT_TRIGGERS)[number];

const TOP_LIMIT = 8;

export interface ParserVersionCounts {
  total: number;
  unresolved: number;
}

export interface CorpusHealthSnapshotRecord {
  id: string;
  takenAt: string;
  trigger: string;
  parserVersion: string;
  lexiconRevision: number;
  totalLines: number;
  totalMentions: number;
  byResolutionStatus: Record<string, number>;
  byParseStatus: Record<string, number>;
  byParserVersion: Record<string, ParserVersionCounts>;
  openDiscoveriesByType: Record<string, number>;
  verifiedCount: number;
  avgCandidates: number;
}

async function countsByParserVersion(
  db: DbClient
): Promise<Record<string, ParserVersionCounts>> {
  const rows = await db.$queryRaw<
    { parserVersion: string; total: bigint; unresolved: bigint }[]
  >`
    SELECT m."parserVersion" AS "parserVersion",
           COUNT(*) AS total,
           COUNT(*) FILTER (WHERE m."resolutionStatus" = 'UNRESOLVED') AS unresolved
    FROM "IngredientMention" m
    JOIN "ParsedIngredientLine" l ON l.id = m."parsedLineId" AND l."isActive" = true
    GROUP BY m."parserVersion"
    ORDER BY m."parserVersion"
  `;
  return Object.fromEntries(
    rows.map((row) => [
      row.parserVersion,
      { total: Number(row.total), unresolved: Number(row.unresolved) },
    ])
  );
}

async function averageCandidates(db: DbClient): Promise<number> {
  const [row] = await db.$queryRaw<{ average: number | null }[]>`
    SELECT AVG(jsonb_array_length(m.resolution -> 'candidates'))::float AS average
    FROM "IngredientMention" m
    JOIN "ParsedIngredientLine" l ON l.id = m."parsedLineId" AND l."isActive" = true
  `;
  return row?.average ?? 0;
}

function toRecord(row: {
  id: string;
  takenAt: Date;
  trigger: string;
  parserVersion: string;
  lexiconRevision: number;
  totalLines: number;
  totalMentions: number;
  byResolutionStatus: unknown;
  byParseStatus: unknown;
  byParserVersion: unknown;
  openDiscoveriesByType: unknown;
  verifiedCount: number;
  avgCandidates: number;
}): CorpusHealthSnapshotRecord {
  return {
    ...row,
    takenAt: row.takenAt.toISOString(),
    byResolutionStatus: row.byResolutionStatus as Record<string, number>,
    byParseStatus: row.byParseStatus as Record<string, number>,
    byParserVersion: row.byParserVersion as Record<string, ParserVersionCounts>,
    openDiscoveriesByType: row.openDiscoveriesByType as Record<string, number>,
  };
}

/**
 * Stores today's corpus health numbers as one `CorpusHealthSnapshot` row (aggregate SQL only), for the trends on /teach/health. The queue takes one daily and after every reinterpretation or reparse run.
 *
 * @example
 * await takeCorpusHealthSnapshot("SCHEDULED") // { totalMentions: 5402, byResolutionStatus: { AUTO_RESOLVED: 4100, ... }, byParserVersion: { "2.1.0": { total: 5402, unresolved: 540 } }, ... }
 */
export async function takeCorpusHealthSnapshot(
  trigger: SnapshotTrigger,
  db: DbClient = prisma
): Promise<CorpusHealthSnapshotRecord> {
  const [health, lexiconRevision, byParserVersion, avgCandidates, discoveries] =
    await Promise.all([
      getCorpusHealth(db),
      getCurrentRevision(db),
      countsByParserVersion(db),
      averageCandidates(db),
      db.discovery.groupBy({
        by: ["type"],
        where: { status: "OPEN" },
        _count: { _all: true },
      }),
    ]);
  const { total, ...byResolutionStatus } = health.mentions;
  const row = await db.corpusHealthSnapshot.create({
    data: {
      trigger,
      parserVersion: PARSER_VERSION,
      lexiconRevision,
      totalLines: health.lineCount,
      totalMentions: total,
      byResolutionStatus: toJson(byResolutionStatus),
      byParseStatus: toJson({
        COMPLETED_SUCCESSFULLY: health.parsedSuccessfully,
        COMPLETED_WITH_ERROR: health.parsedWithErrors,
        AWAITING_PARSING: health.awaitingParsing,
      }),
      byParserVersion: toJson(byParserVersion),
      openDiscoveriesByType: toJson(
        Object.fromEntries(discoveries.map((row) => [row.type, row._count._all]))
      ),
      verifiedCount: byResolutionStatus.VERIFIED,
      avgCandidates,
    },
  });
  return toRecord(row);
}

export interface WeeklyReviewRecord {
  /** Monday of the week, as an ISO date ("2026-11-09"). */
  weekStart: string;
  decisions: number;
  mentionsChanged: number;
}

export interface PhraseLinkRecord {
  discoveryId: string;
  type: DiscoveryType;
  phrase: string;
  mentionCount: number;
}

export interface HealthTrendsRecord {
  /** Oldest first. */
  snapshots: CorpusHealthSnapshotRecord[];
  /** Live counts on active lines, keyed by the parser version that wrote each mention. */
  byParserVersion: Record<string, ParserVersionCounts>;
  /** Oldest first; weeks without decisions are omitted. */
  reviewByWeek: WeeklyReviewRecord[];
  topUnknownPhrases: PhraseLinkRecord[];
  mostAmbiguousPhrases: PhraseLinkRecord[];
}

/**
 * Everything the health page charts: stored snapshots, unresolved share by parser version, review throughput and "taught to fixed" per week (decisions and the mentions they changed, reverts excluded), and the top unknown and ambiguous phrases linked to their discoveries.
 *
 * @example
 * const trends = await getHealthTrends({ snapshotLimit: 90, weeks: 12 });
 * trends.reviewByWeek // [{ weekStart: "2026-11-09", decisions: 14, mentionsChanged: 212 }]
 */
export async function getHealthTrends(
  { snapshotLimit = 90, weeks = 12 }: { snapshotLimit?: number; weeks?: number } = {},
  db: DbClient = prisma
): Promise<HealthTrendsRecord> {
  const since = new Date(Date.now() - weeks * 7 * 24 * 60 * 60 * 1000);
  const [snapshots, byParserVersion, weekly, unknown, ambiguous] =
    await Promise.all([
      db.corpusHealthSnapshot.findMany({
        orderBy: { takenAt: "desc" },
        take: snapshotLimit,
      }),
      countsByParserVersion(db),
      db.$queryRaw<
        { weekStart: Date; decisions: bigint; mentionsChanged: bigint }[]
      >`
        SELECT date_trunc('week', d."createdAt") AS "weekStart",
               COUNT(*) AS decisions,
               COALESCE(SUM(d."mentionsChanged"), 0) AS "mentionsChanged"
        FROM "LexiconDecision" d
        WHERE d.type <> 'REVERT' AND d."createdAt" >= ${since}
        GROUP BY 1
        ORDER BY 1
      `,
      db.discovery.findMany({
        where: { status: "OPEN", type: "UNKNOWN_FOOD_PHRASE" },
        orderBy: [{ mentionCount: "desc" }, { key: "asc" }],
        take: TOP_LIMIT,
        select: { id: true, type: true, key: true, mentionCount: true },
      }),
      db.discovery.findMany({
        where: {
          status: "OPEN",
          type: { in: ["AMBIGUOUS_MATCH", "ATTRIBUTE_INTERPRETATION"] },
        },
        orderBy: [{ mentionCount: "desc" }, { key: "asc" }],
        take: TOP_LIMIT,
        select: { id: true, type: true, key: true, mentionCount: true },
      }),
    ]);
  const link = (row: (typeof unknown)[number]): PhraseLinkRecord => ({
    discoveryId: row.id,
    type: row.type,
    phrase: row.key,
    mentionCount: row.mentionCount,
  });
  return {
    snapshots: snapshots.reverse().map(toRecord),
    byParserVersion,
    reviewByWeek: weekly.map((row) => ({
      weekStart: row.weekStart.toISOString().slice(0, 10),
      decisions: Number(row.decisions),
      mentionsChanged: Number(row.mentionsChanged),
    })),
    topUnknownPhrases: unknown.map(link),
    mostAmbiguousPhrases: ambiguous.map(link),
  };
}

/**
 * Adds reinterpreted mentions to the decision that produced a revision, so "taught to fixed" counts background batches too.
 *
 * @example
 * await addDecisionMentionsChanged({ revision: 15 }, 180)
 */
export async function addDecisionMentionsChanged(
  where: { revision: number } | { id: string },
  mentionsChanged: number,
  db: DbClient = prisma
): Promise<void> {
  if (mentionsChanged <= 0) return;
  await db.lexiconDecision.updateMany({
    where,
    data: { mentionsChanged: { increment: mentionsChanged } },
  });
}
