import type { SnapshotTrigger } from "@peas/database";

import type { IServiceContainer } from "../../services/container";
import type { BaseWorkerDependencies } from "../types";

/**
 * A job on the reinterpret queue. A run's first job has no `lineIds` and fans out; each batch job carries up to 200 line ids. Corpus health snapshots and exploratory sweeps (Phase 6) run on the same queue.
 *
 * @example
 * { jobId: "reinterpret-15", runJobId: "reinterpret-15", kind: "REINTERPRET_BY_REVISION", revision: 15 }
 * { jobId: "reinterpret-15-2", runJobId: "reinterpret-15", kind: "REINTERPRET_BY_REVISION", revision: 15, lineIds: ["cm3l...", ...] }
 * { jobId: "corpus-health-daily", runJobId: "corpus-health-daily", kind: "CORPUS_HEALTH_SNAPSHOT", trigger: "SCHEDULED" }
 */
export interface ReinterpretJobData {
  jobId: string;
  runJobId: string;
  kind:
    | "REINTERPRET_BY_REVISION"
    | "REPARSE_BY_VERSION"
    | "CORPUS_HEALTH_SNAPSHOT"
    | "EXPLORATORY_SWEEP";
  trigger?: SnapshotTrigger;
  revision?: number;
  parserVersion?: string;
  lineIds?: string[];
  noteId?: string;
  metadata?: Record<string, unknown>;
}

export interface ReinterpretWorkerDependencies extends BaseWorkerDependencies {
  services: {
    fanOut: (data: ReinterpretJobData) => Promise<ReinterpretJobData>;
    runBatch: (data: ReinterpretJobData, attemptNumber: number) => Promise<ReinterpretJobData>;
    snapshot: (data: ReinterpretJobData) => Promise<ReinterpretJobData>;
    sweep: (data: ReinterpretJobData) => Promise<ReinterpretJobData>;
  };
}

export function buildReinterpretDependencies(
  serviceContainer: IServiceContainer
): ReinterpretWorkerDependencies {
  return {
    logger: serviceContainer.logger,
    services: {
      fanOut: async (data) => {
        const { fanOutReinterpretRun, REINTERPRET_BATCH_ATTEMPTS, enqueueSnapshot, snapshotTriggerFor } =
          await import("../../services/reinterpret/service");
        const queue = serviceContainer.queues.reinterpretQueue;
        const result = await fanOutReinterpretRun(data, serviceContainer.logger, async (batch, jobId) => {
          await queue.add("reinterpret-batch", batch, {
            jobId,
            attempts: REINTERPRET_BATCH_ATTEMPTS,
            backoff: { type: "exponential", delay: 2000 },
            removeOnComplete: 100,
            removeOnFail: 50,
          });
        });
        if (result.metadata?.batchCount === 0)
          await enqueueSnapshot(queue, snapshotTriggerFor(data.kind), data.runJobId);
        return result;
      },
      runBatch: async (data, attemptNumber) => {
        const { runReinterpretBatch, enqueueSnapshot } = await import(
          "../../services/reinterpret/service"
        );
        const { enqueueCategoryRecompute } = await import("../../services/categorization/recompute");
        return runReinterpretBatch(data, serviceContainer.logger, attemptNumber, {
          onRunFinished: async (trigger, runJobId) => {
            await enqueueSnapshot(serviceContainer.queues.reinterpretQueue, trigger, runJobId);
            // Mentions now name different foods, so inferred categories may have changed
            await enqueueCategoryRecompute(serviceContainer.queues.categorizationQueue, {
              scope: "ALL",
              reason: runJobId,
            }).catch((error: unknown) =>
              serviceContainer.logger.log(`[RECOMPUTE_CATEGORIES] could not queue after ${runJobId}: ${error}`, "warn")
            );
          },
        });
      },
      snapshot: async (data) => {
        const { runCorpusHealthSnapshot } = await import("../../services/reinterpret/service");
        return runCorpusHealthSnapshot(data, serviceContainer.logger);
      },
      sweep: async (data) => {
        const { runExploratorySweep } = await import("../../services/reinterpret/service");
        return runExploratorySweep(data, serviceContainer.logger);
      },
    },
  };
}
