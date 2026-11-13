import {
  type DiscoveryCandidate,
  refreshDiscoveryCounts,
  upsertDiscoveries,
} from "./discoveries.js";
import type { DbClient } from "./helpers.js";
import { type MentionInput, upsertMentionsForLine } from "./mentions.js";

import {
  type IngredientLineResult,
  type ParseMode,
  type ResolverContext,
  discover,
  processIngredientLine,
} from "@peas/parser/v2";
import type { ParseStatus, ResolutionStatus } from "@prisma/client";

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
 * Mention rows for one processed line: one per segment, or one per part when "and" split a segment into several foods ("salt and pepper" gives salt as part 0 and pepper as part 1).
 *
 * @example
 * mentionInputsFor(processIngredientLine("Salt and pepper, to taste", context))
 * // [{ segmentIndex: 0, partIndex: 0, span: { text: "Salt" }, ... }, { segmentIndex: 0, partIndex: 1, span: { text: "pepper, to taste" }, ... }]
 */
export function mentionInputsFor(result: IngredientLineResult): MentionInput[] {
  return result.mentions.map((mention) => ({
    line: result.line,
    segmentIndex: mention.segmentIndex,
    partIndex: mention.partIndex,
    span: mention.span,
    resolution: mention.resolution,
    resolutionStatus: mention.status,
  }));
}

/** A stored line with the result of processing its text. */
export interface ProcessedLine {
  line: LineToProcess;
  result: IngredientLineResult;
}

/**
 * Writes already-processed lines in the caller's transaction: their mentions (verified mentions are protected) and the discoveries they suggest, grouped by type and key so each discovery is upserted once per call. The import save step uses this with the result its parse step produced; `processLines` processes the text first.
 *
 * @example
 * await prisma.$transaction((tx) => writeProcessedLines(tx, [{ line, result }], context))
 */
export async function writeProcessedLines(
  tx: DbClient,
  processed: readonly ProcessedLine[],
  context: ResolverContext
): Promise<ProcessLinesResult> {
  const result: ProcessLinesResult = {
    lines: processed.length,
    mentionsWritten: 0,
    protectedMentions: 0,
    discoveriesTouched: 0,
    mentionsChanged: 0,
  };
  const grouped = new Map<string, DiscoveryCandidate>();
  const keyOf = (lineId: string, segmentIndex: number, partIndex: number) =>
    `${lineId}:${segmentIndex}:${partIndex}`;

  const before = await tx.ingredientMention.findMany({
    where: { parsedLineId: { in: processed.map(({ line }) => line.id) } },
    select: {
      parsedLineId: true,
      segmentIndex: true,
      partIndex: true,
      resolutionStatus: true,
      conceptId: true,
    },
  });
  const previous = new Map(
    before.map((row) => [
      keyOf(row.parsedLineId, row.segmentIndex, row.partIndex),
      row,
    ])
  );

  for (const { line, result: lineResult } of processed) {
    const written = await upsertMentionsForLine(
      tx,
      line.id,
      mentionInputsFor(lineResult)
    );
    result.mentionsWritten += written.mentionIds.length;
    result.protectedMentions += written.protectedIds.length;

    const stored = await tx.ingredientMention.findMany({
      where: { parsedLineId: line.id },
      orderBy: [{ segmentIndex: "asc" }, { partIndex: "asc" }],
      select: {
        id: true,
        segmentIndex: true,
        partIndex: true,
        spanStart: true,
        spanEnd: true,
        verifiedAt: true,
        resolutionStatus: true,
        conceptId: true,
      },
    });
    for (const mention of stored) {
      const old = previous.get(
        keyOf(line.id, mention.segmentIndex, mention.partIndex)
      );
      if (
        !old ||
        old.resolutionStatus !== mention.resolutionStatus ||
        old.conceptId !== mention.conceptId
      )
        result.mentionsChanged += 1;
    }

    for (const discovery of discover(lineResult, context)) {
      const inSegment = stored.filter(
        (mention) => mention.segmentIndex === discovery.segmentIndex
      );
      const mention =
        inSegment.find(
          (candidate) =>
            discovery.span.start >= candidate.spanStart &&
            discovery.span.end <= candidate.spanEnd
        ) ?? inSegment[0];
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
  await dropStaleStructuralEvidence(
    tx,
    processed.map(({ line }) => line.id),
    [...grouped.values()]
  );
  return result;
}

/**
 * After lines are reparsed, removes STRUCTURAL_PATTERN evidence they no longer produce (the grammar learned the structure) and resolves structural discoveries left with no evidence, so a grammar fix shows up in the review queue and the health page.
 */
async function dropStaleStructuralEvidence(
  tx: DbClient,
  lineIds: readonly string[],
  emitted: readonly DiscoveryCandidate[]
): Promise<void> {
  const current = new Set(
    emitted
      .filter((candidate) => candidate.payload.type === "STRUCTURAL_PATTERN")
      .flatMap((candidate) =>
        candidate.evidence.map(
          (evidence) => `${candidate.key}|${evidence.mentionId}`
        )
      )
  );
  const existing = await tx.discoveryEvidence.findMany({
    where: {
      mention: { parsedLineId: { in: [...lineIds] } },
      discovery: { type: "STRUCTURAL_PATTERN" },
    },
    select: {
      discoveryId: true,
      mentionId: true,
      discovery: { select: { key: true, status: true } },
    },
  });
  const stale = existing.filter(
    (row) => !current.has(`${row.discovery.key}|${row.mentionId}`)
  );
  if (stale.length === 0) return;
  for (const row of stale)
    await tx.discoveryEvidence.delete({
      where: {
        discoveryId_mentionId: {
          discoveryId: row.discoveryId,
          mentionId: row.mentionId,
        },
      },
    });
  const affected = new Map(
    stale.map((row) => [row.discoveryId, row.discovery.status])
  );
  for (const [discoveryId, status] of affected) {
    const remaining = await refreshDiscoveryCounts(
      tx,
      discoveryId,
      "STRUCTURAL_PATTERN"
    );
    if (remaining === 0 && (status === "OPEN" || status === "DEFERRED"))
      await tx.discovery.update({
        where: { id: discoveryId },
        data: { status: "RESOLVED" },
      });
  }
}

/**
 * Processes lines with one resolver context in the caller's transaction and writes them with `writeProcessedLines`. Idempotent: re-running with the same context changes nothing.
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
  return writeProcessedLines(
    tx,
    lines.map((line) => ({
      line,
      result: processIngredientLine(line.reference, context, { mode }),
    })),
    context
  );
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

/**
 * One imported line as the v2 import pipeline saves it (Phase 5d).
 *
 * @example
 * { noteId, blockIndex: 0, lineIndex: 2, reference: "2 cups flour", parseStatus: "COMPLETED_SUCCESSFULLY", isActive: true, parserVersion: "v2:2.0.0", result }
 */
export interface ImportedLineInput {
  noteId: string;
  blockIndex: number;
  lineIndex: number;
  reference: string;
  parseStatus: ParseStatus;
  isActive: boolean;
  parserVersion: string;
  result: IngredientLineResult;
}

/**
 * Saves an imported line in one transaction: the line row (keyed by note, block, and line index, so retries never duplicate it), its mentions (verified ones protected, with VERIFIED_DRIFT recorded when the new reading differs), and its discoveries. Nothing is written to the legacy segment, reference, or ingredient tables.
 *
 * @example
 * const { lineId } = await saveImportedLine(input, context);
 */
export async function saveImportedLine(
  input: ImportedLineInput,
  context: ResolverContext
): Promise<ProcessLinesResult & { lineId: string }> {
  return prisma.$transaction(
    async (tx) => {
      const line = await tx.parsedIngredientLine.upsert({
        where: {
          noteId_blockIndex_lineIndex: {
            noteId: input.noteId,
            blockIndex: input.blockIndex,
            lineIndex: input.lineIndex,
          },
        },
        update: {
          reference: input.reference,
          parseStatus: input.parseStatus,
          parsedAt: new Date(),
          isActive: input.isActive,
          parserVersion: input.parserVersion,
        },
        create: {
          noteId: input.noteId,
          blockIndex: input.blockIndex,
          lineIndex: input.lineIndex,
          reference: input.reference,
          parseStatus: input.parseStatus,
          parsedAt: new Date(),
          isActive: input.isActive,
          parserVersion: input.parserVersion,
        },
        select: { id: true },
      });
      const written = await writeProcessedLines(
        tx,
        [
          {
            line: {
              id: line.id,
              reference: input.reference,
              noteId: input.noteId,
            },
            result: input.result,
          },
        ],
        context
      );
      return { ...written, lineId: line.id };
    },
    { timeout: 30_000, maxWait: 10_000 }
  );
}
