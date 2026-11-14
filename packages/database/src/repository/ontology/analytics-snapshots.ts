import { type CorpusAnalyticsRecord, getCorpusAnalytics } from "./explorer.js";
import { type DbClient, parseOrThrow, toJson } from "./helpers.js";
import { getCurrentRevision } from "./revision.js";

import { z } from "zod";

import { prisma } from "../../client.js";

/** A snapshot older than this, or taken at an older lexicon revision, is refreshed in the background when read. */
export const ANALYTICS_MAX_AGE_MS = 15 * 60 * 1000;
const KEEP_SNAPSHOTS = 30;

const rankSchema = z.object({
  conceptId: z.string(),
  canonicalName: z.string(),
  status: z.enum(["PROPOSED", "VERIFIED", "DEPRECATED"]),
  directMentions: z.number().int(),
  directNotes: z.number().int(),
  expandedMentions: z.number().int(),
});

export const CorpusAnalyticsPayloadSchema = z.object({
  settledMentions: z.number().int(),
  conceptsWithMentions: z.number().int(),
  unusedVerifiedConcepts: z.number().int(),
  rareConceptCount: z.number().int(),
  topDirect: z.array(rankSchema),
  topExpanded: z.array(rankSchema),
  rare: z.array(rankSchema),
  preparations: z.array(
    z.object({
      preparationKey: z.string(),
      label: z.string(),
      mentions: z.number().int(),
      concepts: z.number().int(),
    })
  ),
  attributes: z.array(
    z.object({
      definitionKey: z.string(),
      definitionName: z.string(),
      valueKey: z.string(),
      label: z.string(),
      mentions: z.number().int(),
      asserted: z.number().int(),
    })
  ),
}) satisfies z.ZodType<CorpusAnalyticsRecord>;

/**
 * Stored corpus analytics with when they were computed.
 *
 * @example
 * { settledMentions: 812, ..., computedAt: "2026-11-14T15:00:00.000Z", lexiconRevision: 41, isStale: false }
 */
export interface CorpusAnalyticsSnapshotRecord extends CorpusAnalyticsRecord {
  computedAt: string;
  lexiconRevision: number;
  /** True when a newer computation was started because this one is out of date. */
  isStale: boolean;
}

/**
 * Computes corpus analytics and stores them, keeping the newest 30 snapshots.
 *
 * @example
 * await takeCorpusAnalyticsSnapshot("SCHEDULED")
 */
export async function takeCorpusAnalyticsSnapshot(
  trigger: string,
  db: DbClient = prisma
): Promise<CorpusAnalyticsSnapshotRecord> {
  const [analytics, lexiconRevision] = await Promise.all([
    getCorpusAnalytics({}, db),
    getCurrentRevision(db),
  ]);
  const row = await db.corpusAnalyticsSnapshot.create({
    data: {
      trigger,
      lexiconRevision,
      payload: toJson(
        parseOrThrow(
          CorpusAnalyticsPayloadSchema,
          analytics,
          "CorpusAnalyticsSnapshot.payload"
        )
      ),
    },
  });
  const old = await db.corpusAnalyticsSnapshot.findMany({
    orderBy: { takenAt: "desc" },
    skip: KEEP_SNAPSHOTS,
    select: { id: true },
  });
  if (old.length > 0)
    await db.corpusAnalyticsSnapshot.deleteMany({
      where: { id: { in: old.map((snapshot) => snapshot.id) } },
    });
  return {
    ...analytics,
    computedAt: row.takenAt.toISOString(),
    lexiconRevision,
    isStale: false,
  };
}

let refreshing: Promise<unknown> | null = null;

/**
 * The newest analytics snapshot. The first read computes one; a snapshot older than 15 minutes or taken before the current lexicon revision is returned as is (marked stale) while one refresh runs in the background, so a dashboard view never waits for a corpus-wide aggregation.
 *
 * @example
 * await getCorpusAnalyticsSnapshot() // { topExpanded: [...], computedAt: "2026-11-14T15:00:00.000Z", isStale: false }
 */
export async function getCorpusAnalyticsSnapshot(
  {
    maxAgeMs = ANALYTICS_MAX_AGE_MS,
    now = () => new Date(),
  }: { maxAgeMs?: number; now?: () => Date } = {},
  db: DbClient = prisma
): Promise<CorpusAnalyticsSnapshotRecord> {
  const [latest, revision] = await Promise.all([
    db.corpusAnalyticsSnapshot.findFirst({ orderBy: { takenAt: "desc" } }),
    getCurrentRevision(db),
  ]);
  if (!latest) return takeCorpusAnalyticsSnapshot("STALE", db);

  const isStale =
    now().getTime() - latest.takenAt.getTime() > maxAgeMs ||
    latest.lexiconRevision < revision;
  if (isStale && !refreshing) {
    refreshing = takeCorpusAnalyticsSnapshot("STALE", db)
      .catch((error: unknown) => {
        console.warn(`[CORPUS_ANALYTICS] Refresh failed: ${String(error)}`);
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return {
    ...parseOrThrow(
      CorpusAnalyticsPayloadSchema,
      latest.payload,
      "CorpusAnalyticsSnapshot.payload"
    ),
    computedAt: latest.takenAt.toISOString(),
    lexiconRevision: latest.lexiconRevision,
    isStale,
  };
}

/** Resolves once any background refresh started by getCorpusAnalyticsSnapshot has finished (for tests and scripts). */
export async function waitForCorpusAnalyticsRefresh(): Promise<void> {
  await refreshing;
}
