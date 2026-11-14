import { processLines } from "./backfill.js";
import { type DbClient, OntologyError, toJson } from "./helpers.js";
import { type DecisionScope, findAffectedMentions } from "./preview.js";

import { PARSER_VERSION, type ResolverContext } from "@peas/parser/v2";
import type { QueueJobStatus, ReinterpretKind } from "@prisma/client";

import { prisma } from "../../client.js";

export const REINTERPRET_BATCH_SIZE = 200;

export interface ReinterpretRunRecord {
  jobId: string;
  kind: ReinterpretKind;
  revision: number | null;
  parserVersion: string | null;
  status: QueueJobStatus;
  totalLines: number;
  processedLines: number;
  batchCount: number;
  completedBatches: number;
  failedBatches: number;
  errorMessage: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
}

const RUN_SELECT = {
  jobId: true,
  kind: true,
  revision: true,
  parserVersion: true,
  status: true,
  totalLines: true,
  processedLines: true,
  batchCount: true,
  completedBatches: true,
  failedBatches: true,
  errorMessage: true,
  startedAt: true,
  completedAt: true,
  createdAt: true,
} as const;

/**
 * The BullMQ job id of a run: one run per lexicon revision or parser version, so requesting the same run twice is a no-op.
 *
 * @example
 * reinterpretJobId({ kind: "REINTERPRET_BY_REVISION", revision: 15 }) // "reinterpret-15"
 */
export function reinterpretJobId(
  run:
    | { kind: "REINTERPRET_BY_REVISION"; revision: number }
    | { kind: "REPARSE_BY_VERSION"; parserVersion: string }
): string {
  return run.kind === "REINTERPRET_BY_REVISION"
    ? `reinterpret-${run.revision}`
    : `reparse-${run.parserVersion.replace(/[^\w.-]/g, "_")}`;
}

/**
 * Records a requested run, or returns the existing one with the same job id.
 *
 * @example
 * await requestReinterpretRun({ kind: "REINTERPRET_BY_REVISION", revision: 15, scope: { phrases: ["icing sugar"], conceptIds: [] } })
 */
export async function requestReinterpretRun(
  input:
    | {
        kind: "REINTERPRET_BY_REVISION";
        revision: number;
        scope: Omit<DecisionScope, "mentionIds">;
      }
    | { kind: "REPARSE_BY_VERSION"; parserVersion: string },
  db: DbClient = prisma
): Promise<ReinterpretRunRecord> {
  const jobId = reinterpretJobId(input);
  return db.reinterpretRun.upsert({
    where: { jobId },
    create: {
      jobId,
      kind: input.kind,
      revision:
        input.kind === "REINTERPRET_BY_REVISION" ? input.revision : null,
      parserVersion:
        input.kind === "REPARSE_BY_VERSION" ? input.parserVersion : null,
      scope:
        input.kind === "REINTERPRET_BY_REVISION"
          ? toJson(input.scope)
          : undefined,
    },
    update: {},
    select: RUN_SELECT,
  });
}

export async function getReinterpretRun(
  jobId: string,
  db: DbClient = prisma
): Promise<ReinterpretRunRecord | null> {
  return db.reinterpretRun.findUnique({ where: { jobId }, select: RUN_SELECT });
}

/** The run's scope as stored, for the fan-out job. */
export async function getReinterpretRunScope(
  jobId: string,
  db: DbClient = prisma
): Promise<Omit<DecisionScope, "mentionIds">> {
  const run = await db.reinterpretRun.findUnique({
    where: { jobId },
    select: { scope: true },
  });
  if (!run) throw new OntologyError(`Reinterpret run ${jobId} does not exist`);
  const scope = (run.scope ?? {}) as {
    phrases?: unknown;
    conceptIds?: unknown;
  };
  const strings = (value: unknown) =>
    Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];
  return {
    phrases: strings(scope.phrases),
    conceptIds: strings(scope.conceptIds),
  };
}

/**
 * The active lines a run touches, in id order: for a revision, lines the scope can affect (decision D20 prefilter) that still have mentions older than the revision; for a parser version, lines parsed by another version or never parsed.
 *
 * @example
 * await selectReinterpretLines({ kind: "REINTERPRET_BY_REVISION", revision: 15, scope }, context) // ["cm3l...", ...]
 */
export async function selectReinterpretLines(
  input:
    | {
        kind: "REINTERPRET_BY_REVISION";
        revision: number;
        scope: Omit<DecisionScope, "mentionIds">;
      }
    | { kind: "REPARSE_BY_VERSION"; parserVersion?: string },
  context: ResolverContext,
  db: DbClient = prisma
): Promise<string[]> {
  if (input.kind === "REINTERPRET_BY_REVISION") {
    const affected = await findAffectedMentions(
      { ...input.scope, mentionIds: [] },
      context,
      { limit: 1_000_000 },
      db
    );
    const lineIds = [
      ...new Set(affected.map((mention) => mention.parsedLineId)),
    ];
    if (lineIds.length === 0) return [];
    const stale = await db.parsedIngredientLine.findMany({
      where: {
        id: { in: lineIds },
        isActive: true,
        mentions: {
          some: { lexiconRevision: { lt: input.revision }, verifiedAt: null },
        },
      },
      select: { id: true },
      orderBy: { id: "asc" },
    });
    return stale.map((line) => line.id);
  }

  const version = input.parserVersion ?? PARSER_VERSION;
  const lines = await db.parsedIngredientLine.findMany({
    where: {
      isActive: true,
      OR: [
        { mentions: { none: {} } },
        {
          mentions: {
            some: { parserVersion: { not: version }, verifiedAt: null },
          },
        },
      ],
    },
    select: { id: true },
    orderBy: { id: "asc" },
  });
  return lines.map((line) => line.id);
}

/** Splits line ids into batches with deterministic job ids ("reinterpret-15-1", "reinterpret-15-2", ...). */
export function planReinterpretBatches(
  jobId: string,
  lineIds: readonly string[],
  size = REINTERPRET_BATCH_SIZE
): { jobId: string; lineIds: string[] }[] {
  const batches: { jobId: string; lineIds: string[] }[] = [];
  for (let start = 0; start < lineIds.length; start += size) {
    batches.push({
      jobId: `${jobId}-${batches.length + 1}`,
      lineIds: lineIds.slice(start, start + size),
    });
  }
  return batches;
}

/** Marks a run as fanned out: running, with its totals. A run with nothing to do completes immediately. */
export async function startReinterpretRun(
  jobId: string,
  { totalLines, batchCount }: { totalLines: number; batchCount: number },
  db: DbClient = prisma
): Promise<ReinterpretRunRecord> {
  const now = new Date();
  return db.reinterpretRun.update({
    where: { jobId },
    data: {
      totalLines,
      batchCount,
      status: batchCount === 0 ? "COMPLETED" : "PROCESSING",
      startedAt: now,
      completedAt: batchCount === 0 ? now : null,
    },
    select: RUN_SELECT,
  });
}

/**
 * Counts one finished batch (or a batch that failed for good) with a single atomic UPDATE, and closes the run when every batch is accounted for: COMPLETED, or FAILED if any batch failed.
 *
 * @example
 * await recordReinterpretBatch("reinterpret-15", { lines: 200 })
 */
export async function recordReinterpretBatch(
  jobId: string,
  {
    lines,
    failed = false,
    errorMessage,
  }: { lines: number; failed?: boolean; errorMessage?: string },
  db: DbClient = prisma
): Promise<ReinterpretRunRecord | null> {
  await db.$executeRaw`
    UPDATE "ReinterpretRun"
    SET "processedLines" = "processedLines" + ${failed ? 0 : lines},
        "completedBatches" = "completedBatches" + ${failed ? 0 : 1},
        "failedBatches" = "failedBatches" + ${failed ? 1 : 0},
        "errorMessage" = COALESCE(${errorMessage ?? null}, "errorMessage"),
        "updatedAt" = NOW()
    WHERE "jobId" = ${jobId}
  `;
  await db.$executeRaw`
    UPDATE "ReinterpretRun"
    SET "status" = (CASE WHEN "failedBatches" > 0 THEN 'FAILED' ELSE 'COMPLETED' END)::"QueueJobStatus",
        "completedAt" = NOW()
    WHERE "jobId" = ${jobId}
      AND "status" = 'PROCESSING'
      AND "completedBatches" + "failedBatches" >= "batchCount"
  `;
  return getReinterpretRun(jobId, db);
}

export async function failReinterpretRun(
  jobId: string,
  errorMessage: string,
  db: DbClient = prisma
): Promise<void> {
  await db.reinterpretRun.updateMany({
    where: { jobId },
    data: { status: "FAILED", errorMessage, completedAt: new Date() },
  });
}

/** Run counts by status, for metrics. */
export async function getReinterpretBacklog(db: DbClient = prisma): Promise<{
  pending: number;
  processing: number;
  failed: number;
  failedBatches: number;
}> {
  const [rows, failedBatches] = await Promise.all([
    db.reinterpretRun.groupBy({ by: ["status"], _count: { _all: true } }),
    db.reinterpretRun.aggregate({ _sum: { failedBatches: true } }),
  ]);
  const count = (status: QueueJobStatus) =>
    rows.find((row) => row.status === status)?._count._all ?? 0;
  return {
    pending: count("PENDING"),
    processing: count("PROCESSING"),
    failed: count("FAILED"),
    failedBatches: failedBatches._sum.failedBatches ?? 0,
  };
}

/**
 * Re-resolves one batch of lines with the current context. Lines that are already fresh are skipped (for a revision run: no unverified mention older than the revision; for a reparse: every mention already at the parser version), so a retried or overlapping batch is a no-op.
 *
 * @example
 * await reinterpretBatch(batch.lineIds, context, { kind: "REINTERPRET_BY_REVISION", revision: 15 }) // { processed: 180, skipped: 20 }
 */
export async function reinterpretBatch(
  lineIds: readonly string[],
  context: ResolverContext,
  run: {
    kind: ReinterpretKind;
    revision?: number | null;
    parserVersion?: string | null;
  },
  db: DbClient = prisma
): Promise<{ processed: number; skipped: number; mentionsChanged: number }> {
  const lines = await db.parsedIngredientLine.findMany({
    where: { id: { in: [...lineIds] }, isActive: true },
    select: {
      id: true,
      reference: true,
      noteId: true,
      mentions: {
        select: {
          lexiconRevision: true,
          parserVersion: true,
          verifiedAt: true,
        },
      },
    },
  });
  const version = run.parserVersion ?? PARSER_VERSION;
  const stale = lines.filter((line) => {
    const unverified = line.mentions.filter(
      (mention) => mention.verifiedAt === null
    );
    if (run.kind === "REINTERPRET_BY_REVISION")
      return unverified.some(
        (mention) =>
          mention.lexiconRevision < (run.revision ?? Number.MAX_SAFE_INTEGER)
      );
    return (
      line.mentions.length === 0 ||
      unverified.some((mention) => mention.parserVersion !== version)
    );
  });
  if (stale.length === 0)
    return { processed: 0, skipped: lines.length, mentionsChanged: 0 };

  const result = await (db === prisma
    ? prisma.$transaction((tx) => processLines(tx, stale, context), {
        timeout: 120_000,
        maxWait: 10_000,
      })
    : processLines(db, stale, context));
  return {
    processed: stale.length,
    skipped: lines.length - stale.length,
    mentionsChanged: result.mentionsChanged,
  };
}
