import {
  type SnapshotTrigger,
  addDecisionMentionsChanged,
  exploratorySweep,
  getReinterpretRunScope,
  planReinterpretBatches,
  recordReinterpretBatch,
  reinterpretBatch,
  selectReinterpretLines,
  startReinterpretRun,
  takeCorpusHealthSnapshot,
} from "@peas/database";
import type { ResolverContext } from "@peas/parser/v2";
import type { Queue } from "bullmq";

import type { StructuredLogger } from "../../types";
import type { ReinterpretJobData } from "../../workers/reinterpret/dependencies";
import { getResolverContext } from "../ingredient/lexicon-cache";

/** Attempts per batch job; a batch is recorded as failed only after the last one. */
export const REINTERPRET_BATCH_ATTEMPTS = 3;

export type EnqueueReinterpretBatch = (
  data: ReinterpretJobData,
  jobId: string
) => Promise<void>;

type ContextLoader = (logger?: StructuredLogger) => Promise<ResolverContext>;

type RunKind = "REINTERPRET_BY_REVISION" | "REPARSE_BY_VERSION";

function runKindOf(data: ReinterpretJobData): RunKind {
  if (data.kind === "REINTERPRET_BY_REVISION" || data.kind === "REPARSE_BY_VERSION")
    return data.kind;
  throw new Error(`${data.kind} is not a reinterpretation run`);
}

/** The snapshot trigger for a finished run: reparses and lexicon reinterpretations are charted separately. */
export function snapshotTriggerFor(kind: ReinterpretJobData["kind"]): SnapshotTrigger {
  return kind === "REPARSE_BY_VERSION" ? "REPARSE" : "REINTERPRET";
}

/**
 * Queues a corpus health snapshot. Pass `key` (the run id) so a run that reports its end twice still gets one snapshot.
 *
 * @example
 * await enqueueSnapshot(queues.reinterpretQueue, "REINTERPRET", "reinterpret-15")
 */
export async function enqueueSnapshot(
  queue: Pick<Queue, "add">,
  trigger: SnapshotTrigger,
  key: string = `${Date.now()}`
): Promise<void> {
  const jobId = `corpus-health-${key}`;
  const data: ReinterpretJobData = {
    jobId,
    runJobId: jobId,
    kind: "CORPUS_HEALTH_SNAPSHOT",
    trigger,
  };
  await queue.add("corpus-health-snapshot", data, {
    jobId,
    removeOnComplete: 100,
    removeOnFail: 50,
  });
}

/**
 * The first job of a run (Phase 5f): selects the lines the run touches, records the totals, and enqueues one batch job per 200 lines with deterministic ids ("reinterpret-15-1", ...), so re-running the fan-out never duplicates work.
 *
 * @example
 * await fanOutReinterpretRun({ jobId: "reinterpret-15", runJobId: "reinterpret-15", kind: "REINTERPRET_BY_REVISION", revision: 15 }, logger, enqueue)
 */
export async function fanOutReinterpretRun(
  data: ReinterpretJobData,
  logger: StructuredLogger,
  enqueue: EnqueueReinterpretBatch,
  getContext: ContextLoader = getResolverContext
): Promise<ReinterpretJobData> {
  const context = await getContext(logger);
  const kind = runKindOf(data);
  const lineIds =
    kind === "REINTERPRET_BY_REVISION"
      ? await selectReinterpretLines(
          {
            kind,
            revision: data.revision ?? context.revision,
            scope: await getReinterpretRunScope(data.runJobId),
          },
          context
        )
      : await selectReinterpretLines(
          { kind, parserVersion: data.parserVersion },
          context
        );
  const batches = planReinterpretBatches(data.runJobId, lineIds);
  await startReinterpretRun(data.runJobId, {
    totalLines: lineIds.length,
    batchCount: batches.length,
  });
  for (const batch of batches) {
    await enqueue({ ...data, jobId: batch.jobId, lineIds: batch.lineIds }, batch.jobId);
  }
  logger.log(
    `[REINTERPRET] run=${data.runJobId} lines=${lineIds.length} batches=${batches.length} revision=${context.revision}`
  );
  return { ...data, metadata: { ...data.metadata, totalLines: lineIds.length, batchCount: batches.length } };
}

/**
 * One batch of a run: re-resolves its lines with the current context (fresh lines are skipped, so retries and overlapping runs are safe) and counts the batch on the run. A batch that fails on its last attempt is counted as failed before the error is rethrown.
 *
 * @example
 * await runReinterpretBatch({ ...data, lineIds }, logger, 1)
 */
export async function runReinterpretBatch(
  data: ReinterpretJobData,
  logger: StructuredLogger,
  attemptNumber: number,
  {
    getContext = getResolverContext,
    onRunFinished,
  }: {
    getContext?: ContextLoader;
    /** Called once the batch that closes the run has been counted (the queue then takes a health snapshot). */
    onRunFinished?: (trigger: SnapshotTrigger, runJobId: string) => Promise<void>;
  } = {}
): Promise<ReinterpretJobData> {
  const lineIds = data.lineIds ?? [];
  try {
    const context = await getContext(logger);
    const result = await reinterpretBatch(lineIds, context, {
      kind: runKindOf(data),
      revision: data.revision ?? null,
      parserVersion: data.parserVersion ?? null,
    });
    const run = await recordReinterpretBatch(data.runJobId, { lines: lineIds.length });
    if (data.kind === "REINTERPRET_BY_REVISION" && data.revision)
      await addDecisionMentionsChanged({ revision: data.revision }, result.mentionsChanged);
    if (run && run.status !== "PROCESSING")
      await onRunFinished?.(snapshotTriggerFor(data.kind), data.runJobId);
    logger.log(
      `[REINTERPRET] batch=${data.jobId} processed=${result.processed} skipped=${result.skipped} changed=${result.mentionsChanged} progress=${run?.processedLines ?? "?"}/${run?.totalLines ?? "?"}`
    );
    return { ...data, metadata: { ...data.metadata, ...result } };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.log(`[REINTERPRET] batch=${data.jobId} attempt=${attemptNumber} failed: ${message}`);
    if (attemptNumber >= REINTERPRET_BATCH_ATTEMPTS) {
      const run = await recordReinterpretBatch(data.runJobId, { lines: 0, failed: true, errorMessage: message });
      if (run && run.status !== "PROCESSING")
        await onRunFinished?.(snapshotTriggerFor(data.kind), data.runJobId);
    }
    throw error;
  }
}

/**
 * The corpus health snapshot job (Phase 6e): one `CorpusHealthSnapshot` row, from aggregate SQL only.
 *
 * @example
 * await runCorpusHealthSnapshot({ jobId, runJobId: jobId, kind: "CORPUS_HEALTH_SNAPSHOT", trigger: "SCHEDULED" }, logger)
 */
export async function runCorpusHealthSnapshot(
  data: ReinterpretJobData,
  logger: StructuredLogger
): Promise<ReinterpretJobData> {
  const snapshot = await takeCorpusHealthSnapshot(data.trigger ?? "SCHEDULED");
  logger.log(
    `[HEALTH_SNAPSHOT] trigger=${snapshot.trigger} mentions=${snapshot.totalMentions} revision=${snapshot.lexiconRevision} parser=${snapshot.parserVersion}`
  );
  return { ...data, metadata: { ...data.metadata, snapshotId: snapshot.id } };
}

/**
 * The exploratory sweep job (Phase 6f): unresolved and needs-review mentions re-read in EXPLORATORY mode; only discoveries are written.
 *
 * @example
 * await runExploratorySweep({ jobId, runJobId: jobId, kind: "EXPLORATORY_SWEEP" }, logger)
 */
export async function runExploratorySweep(
  data: ReinterpretJobData,
  logger: StructuredLogger,
  getContext: ContextLoader = getResolverContext
): Promise<ReinterpretJobData> {
  const summary = await exploratorySweep(await getContext(logger));
  logger.log(
    `[EXPLORATORY_SWEEP] lines=${summary.linesScanned} discoveries=${summary.discoveriesTouched}`
  );
  return { ...data, metadata: { ...data.metadata, ...summary } };
}
