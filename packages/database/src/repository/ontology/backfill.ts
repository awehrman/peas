import { type DiscoveryCandidate, upsertDiscoveries } from "./discoveries.js";
import type { DbClient } from "./helpers.js";
import { type MentionInput, upsertMentionsForLine } from "./mentions.js";

import {
  type IngredientLineResult,
  type ParseMode,
  type ResolverContext,
  discover,
  processIngredientLine,
} from "@peas/parser/v2";
import type { ResolutionStatus } from "@prisma/client";

import { prisma } from "../../client.js";

/** A stored line to (re)process. */
export interface LineToProcess {
  id: string;
  reference: string;
  noteId: string | null;
}

export interface ProcessLinesResult {
  lines: number;
  mentionsWritten: number;
  protectedMentions: number;
  discoveriesTouched: number;
  /** Mentions whose status or concept differ from what was stored before (new mentions count too). */
  mentionsChanged: number;
}

/**
 * Mention rows for one processed line. Mentions are keyed by segment until Phase 5 adds `partIndex`, so a coordination split stores its first part, and a split that would have auto-resolved goes to review instead ("salt and pepper" should not silently become just salt).
 *
 * @example
 * mentionInputsFor(processIngredientLine("1 tbsp butter and 2 tbsp olive oil", context))
 * // [{ segmentIndex: 0, resolutionStatus: "AUTO_RESOLVED", ... }, { segmentIndex: 1, ... }]
 */
export function mentionInputsFor(result: IngredientLineResult): MentionInput[] {
  const inputs: MentionInput[] = [];
  for (const segment of result.line.segments) {
    const parts = result.mentions.filter(
      (mention) => mention.segmentIndex === segment.index
    );
    const first = parts[0];
    if (!first) continue;
    const isSplit = parts.length > 1;
    const resolution = isSplit
      ? {
          ...first.resolution,
          candidates: first.resolution.candidates.map((candidate) => ({
            ...candidate,
            reasons: [
              ...candidate.reasons,
              `parts_not_stored:${parts.length - 1}`,
            ],
          })),
        }
      : first.resolution;
    inputs.push({
      line: result.line,
      segmentIndex: segment.index,
      resolution,
      resolutionStatus:
        isSplit && first.status === "AUTO_RESOLVED"
          ? "NEEDS_REVIEW"
          : first.status,
    });
  }
  return inputs;
}

/**
 * Processes lines with one resolver context in the caller's transaction: writes their mentions (verified mentions are protected) and the discoveries they suggest, grouped by type and key so each discovery is upserted once per batch. Idempotent: re-running with the same context changes nothing.
 *
 * @example
 * await prisma.$transaction((tx) => processLines(tx, lines, context))
 */
export async function processLines(
  tx: DbClient,
  lines: readonly LineToProcess[],
  context: ResolverContext,
  { mode = "CONSERVATIVE" }: { mode?: ParseMode } = {}
): Promise<ProcessLinesResult> {
  const result: ProcessLinesResult = {
    lines: lines.length,
    mentionsWritten: 0,
    protectedMentions: 0,
    discoveriesTouched: 0,
    mentionsChanged: 0,
  };
  const grouped = new Map<string, DiscoveryCandidate>();

  const before = await tx.ingredientMention.findMany({
    where: { parsedLineId: { in: lines.map((line) => line.id) } },
    select: {
      parsedLineId: true,
      segmentIndex: true,
      resolutionStatus: true,
      conceptId: true,
    },
  });
  const previous = new Map(
    before.map((row) => [`${row.parsedLineId}:${row.segmentIndex}`, row])
  );

  for (const line of lines) {
    const processed = processIngredientLine(line.reference, context, { mode });
    const written = await upsertMentionsForLine(
      tx,
      line.id,
      mentionInputsFor(processed)
    );
    result.mentionsWritten += written.mentionIds.length;
    result.protectedMentions += written.protectedIds.length;

    const stored = await tx.ingredientMention.findMany({
      where: { parsedLineId: line.id },
      select: {
        id: true,
        segmentIndex: true,
        verifiedAt: true,
        resolutionStatus: true,
        conceptId: true,
      },
    });
    const bySegment = new Map(
      stored.map((mention) => [mention.segmentIndex, mention])
    );
    for (const mention of stored) {
      const old = previous.get(`${line.id}:${mention.segmentIndex}`);
      if (
        !old ||
        old.resolutionStatus !== mention.resolutionStatus ||
        old.conceptId !== mention.conceptId
      )
        result.mentionsChanged += 1;
    }

    for (const discovery of discover(processed, context)) {
      const mention = bySegment.get(discovery.segmentIndex);
      if (!mention || mention.verifiedAt) continue;
      const id = `${discovery.payload.type}|${discovery.key}`;
      const group = grouped.get(id) ?? {
        key: discovery.key,
        payload: discovery.payload,
        evidence: [],
      };
      group.payload = discovery.payload;
      if (
        !group.evidence.some((evidence) => evidence.mentionId === mention.id)
      ) {
        group.evidence.push({
          mentionId: mention.id,
          noteId: line.noteId,
          spanStart: discovery.span.start,
          spanEnd: discovery.span.end,
        });
      }
      grouped.set(id, group);
    }
  }

  if (grouped.size > 0) {
    await upsertDiscoveries(tx, [...grouped.values()], context.revision);
    result.discoveriesTouched = grouped.size;
  }
  return result;
}

export interface BackfillOptions {
  /** Resume after this ParsedIngredientLine id (the last logged checkpoint). */
  after?: string | null;
  batchSize?: number;
  mode?: ParseMode;
  /** Only lines whose mentions are older than this revision (reinterpretation). */
  belowRevision?: number;
  /** Only lines whose text contains one of these phrases, or whose mentions involve one of these concepts. */
  prefilter?: { phrases: readonly string[]; conceptIds: readonly string[] };
  onBatch?: (progress: {
    checkpoint: string;
    totals: ProcessLinesResult;
  }) => void;
}

/**
 * Pages through active lines by id and processes each batch in its own transaction (Phase 4a). Logs a checkpoint after every batch, so `after` resumes a crashed run. Never writes legacy tables.
 *
 * @example
 * await backfillMentions(context, { batchSize: 500, onBatch: ({ checkpoint }) => console.log(`checkpoint=${checkpoint}`) })
 */
export async function backfillMentions(
  context: ResolverContext,
  options: BackfillOptions = {}
): Promise<ProcessLinesResult> {
  const { batchSize = 500, mode = "CONSERVATIVE", onBatch } = options;
  const totals: ProcessLinesResult = {
    lines: 0,
    mentionsWritten: 0,
    protectedMentions: 0,
    discoveriesTouched: 0,
    mentionsChanged: 0,
  };
  let cursor = options.after ?? null;

  for (;;) {
    const lines = await prisma.parsedIngredientLine.findMany({
      where: {
        isActive: true,
        ...(cursor ? { id: { gt: cursor } } : {}),
        ...lineFilter(options),
      },
      orderBy: { id: "asc" },
      take: batchSize,
      select: { id: true, reference: true, noteId: true },
    });
    if (lines.length === 0) break;

    const batch = await prisma.$transaction(
      (tx) => processLines(tx, lines, context, { mode }),
      { timeout: 120_000, maxWait: 10_000 }
    );
    for (const key of Object.keys(totals) as (keyof ProcessLinesResult)[])
      totals[key] += batch[key];
    cursor = lines[lines.length - 1]?.id ?? cursor;
    if (cursor) onBatch?.({ checkpoint: cursor, totals });
  }
  return totals;
}

function lineFilter({ belowRevision, prefilter }: BackfillOptions) {
  const conditions = [];
  if (belowRevision !== undefined) {
    conditions.push({
      OR: [
        { mentions: { none: {} } },
        { mentions: { some: { lexiconRevision: { lt: belowRevision } } } },
      ],
    });
  }
  if (prefilter) {
    conditions.push({
      OR: [
        ...prefilter.phrases.map((phrase) => ({
          reference: { contains: phrase, mode: "insensitive" as const },
        })),
        ...(prefilter.conceptIds.length > 0
          ? [
              {
                mentions: {
                  some: { conceptId: { in: [...prefilter.conceptIds] } },
                },
              },
            ]
          : []),
      ],
    });
  }
  return conditions.length > 0 ? { AND: conditions } : {};
}

export interface CorpusCoverage {
  byStatus: Record<ResolutionStatus, number>;
  openDiscoveriesByType: Record<string, number>;
}

/**
 * Mention counts by status and open discoveries by type: the backfill's closing summary.
 *
 * @example
 * await getCorpusCoverage() // { byStatus: { AUTO_RESOLVED: 412, NEEDS_REVIEW: 88, UNRESOLVED: 40, VERIFIED: 3 }, openDiscoveriesByType: { UNKNOWN_FOOD_PHRASE: 31, ... } }
 */
export async function getCorpusCoverage(
  db: DbClient = prisma
): Promise<CorpusCoverage> {
  const [statuses, discoveries] = await Promise.all([
    db.ingredientMention.groupBy({
      by: ["resolutionStatus"],
      _count: { _all: true },
    }),
    db.discovery.groupBy({
      by: ["type"],
      where: { status: "OPEN" },
      _count: { _all: true },
    }),
  ]);
  const byStatus: Record<ResolutionStatus, number> = {
    UNRESOLVED: 0,
    AUTO_RESOLVED: 0,
    NEEDS_REVIEW: 0,
    VERIFIED: 0,
  };
  for (const row of statuses) byStatus[row.resolutionStatus] = row._count._all;
  return {
    byStatus,
    openDiscoveriesByType: Object.fromEntries(
      discoveries.map((row) => [row.type, row._count._all])
    ),
  };
}
