import * as database from "@peas/database";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActionName } from "../../../types";
import type {
  ReinterpretJobData,
  ReinterpretWorkerDependencies,
} from "../../../workers/reinterpret/dependencies";
import {
  CorpusHealthSnapshotAction,
  ExploratorySweepAction,
  ReinterpretBatchAction,
  ReinterpretFanOutAction,
  registerReinterpretActions,
} from "../../reinterpret/actions";
import {
  MAINTENANCE_SCHEDULES,
  scheduleMaintenanceJobs,
} from "../../reinterpret/schedules";
import {
  REINTERPRET_BATCH_ATTEMPTS,
  enqueueSnapshot,
  fanOutReinterpretRun,
  runCorpusHealthSnapshot,
  runExploratorySweep,
  runReinterpretBatch,
  snapshotTriggerFor,
} from "../../reinterpret/service";
import { fixtureContext } from "../ingredient/v2-fixture";

vi.mock("@peas/database", () => ({
  getReinterpretRunScope: vi.fn(async () => ({
    phrases: ["butter"],
    conceptIds: [],
  })),
  selectReinterpretLines: vi.fn(async () => ["l1", "l2", "l3"]),
  planReinterpretBatches: vi.fn((jobId: string, lineIds: string[]) =>
    lineIds.length === 0
      ? []
      : [
          { jobId: `${jobId}-1`, lineIds: lineIds.slice(0, 2) },
          { jobId: `${jobId}-2`, lineIds: lineIds.slice(2) },
        ]
  ),
  startReinterpretRun: vi.fn(async () => ({})),
  reinterpretBatch: vi.fn(async () => ({
    processed: 2,
    skipped: 0,
    mentionsChanged: 2,
  })),
  recordReinterpretBatch: vi.fn(async () => ({
    processedLines: 2,
    totalLines: 3,
    status: "PROCESSING",
  })),
  addDecisionMentionsChanged: vi.fn(async () => 1),
  takeCorpusHealthSnapshot: vi.fn(async (trigger: string) => ({
    id: "snap-1",
    trigger,
    totalMentions: 12,
    lexiconRevision: 7,
    parserVersion: "2.1.0",
  })),
  exploratorySweep: vi.fn(async () => ({
    linesScanned: 4,
    discoveriesTouched: 2,
  })),
}));

vi.mock("../../ingredient/lexicon-cache", () => ({
  getResolverContext: vi.fn(async () => fixtureContext()),
}));

const logger = { log: vi.fn() };
const run: ReinterpretJobData = {
  jobId: "reinterpret-15",
  runJobId: "reinterpret-15",
  kind: "REINTERPRET_BY_REVISION",
  revision: 15,
};

describe("reinterpret services", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fans a revision run out into batches with deterministic job ids", async () => {
    const enqueue = vi.fn(async () => undefined);
    const result = await fanOutReinterpretRun(run, logger, enqueue);

    expect(database.selectReinterpretLines).toHaveBeenCalledWith(
      {
        kind: "REINTERPRET_BY_REVISION",
        revision: 15,
        scope: { phrases: ["butter"], conceptIds: [] },
      },
      expect.objectContaining({ revision: 7 })
    );
    expect(database.startReinterpretRun).toHaveBeenCalledWith(
      "reinterpret-15",
      { totalLines: 3, batchCount: 2 }
    );
    expect(enqueue.mock.calls).toEqual([
      [
        { ...run, jobId: "reinterpret-15-1", lineIds: ["l1", "l2"] },
        "reinterpret-15-1",
      ],
      [
        { ...run, jobId: "reinterpret-15-2", lineIds: ["l3"] },
        "reinterpret-15-2",
      ],
    ]);
    expect(result.metadata).toMatchObject({ totalLines: 3, batchCount: 2 });
  });

  it("selects reparse lines by parser version and enqueues nothing when no line needs work", async () => {
    vi.mocked(database.selectReinterpretLines).mockResolvedValueOnce([]);
    const enqueue = vi.fn(async () => undefined);
    await fanOutReinterpretRun(
      {
        jobId: "reparse-2",
        runJobId: "reparse-2",
        kind: "REPARSE_BY_VERSION",
        parserVersion: "2.0.0",
      },
      logger,
      enqueue
    );

    expect(database.selectReinterpretLines).toHaveBeenCalledWith(
      { kind: "REPARSE_BY_VERSION", parserVersion: "2.0.0" },
      expect.anything()
    );
    expect(database.startReinterpretRun).toHaveBeenCalledWith("reparse-2", {
      totalLines: 0,
      batchCount: 0,
    });
    expect(enqueue).not.toHaveBeenCalled();
  });

  it("processes a batch and counts it on the run", async () => {
    const result = await runReinterpretBatch(
      { ...run, jobId: "reinterpret-15-1", lineIds: ["l1", "l2"] },
      logger,
      1
    );

    expect(database.reinterpretBatch).toHaveBeenCalledWith(
      ["l1", "l2"],
      expect.anything(),
      { kind: "REINTERPRET_BY_REVISION", revision: 15, parserVersion: null }
    );
    expect(database.recordReinterpretBatch).toHaveBeenCalledWith(
      "reinterpret-15",
      { lines: 2 }
    );
    expect(result.metadata).toMatchObject({ processed: 2, mentionsChanged: 2 });
    expect(database.addDecisionMentionsChanged).toHaveBeenCalledWith(
      { revision: 15 },
      2
    );
    expect(logger.log).toHaveBeenCalledWith(
      expect.stringContaining("progress=2/3")
    );
  });

  it("reports the end of a run once its last batch is counted, and skips decision counts for reparses", async () => {
    const onRunFinished = vi.fn(async () => undefined);
    vi.mocked(database.recordReinterpretBatch).mockResolvedValueOnce({
      processedLines: 3,
      totalLines: 3,
      status: "COMPLETED",
    } as never);
    await runReinterpretBatch(
      {
        jobId: "reparse-2.1.0-1",
        runJobId: "reparse-2.1.0",
        kind: "REPARSE_BY_VERSION",
        parserVersion: "2.1.0",
        lineIds: ["l1"],
      },
      logger,
      1,
      { onRunFinished }
    );

    expect(onRunFinished).toHaveBeenCalledWith("REPARSE", "reparse-2.1.0");
    expect(database.addDecisionMentionsChanged).not.toHaveBeenCalled();
  });

  it("reports the end of a run whose last batch failed", async () => {
    const onRunFinished = vi.fn(async () => undefined);
    vi.mocked(database.reinterpretBatch).mockRejectedValueOnce(
      new Error("db down")
    );
    vi.mocked(database.recordReinterpretBatch).mockResolvedValueOnce({
      processedLines: 3,
      totalLines: 3,
      status: "FAILED",
    } as never);
    await expect(
      runReinterpretBatch(
        { ...run, lineIds: ["l1"] },
        logger,
        REINTERPRET_BATCH_ATTEMPTS,
        { onRunFinished }
      )
    ).rejects.toThrow("db down");
    expect(onRunFinished).toHaveBeenCalledWith("REINTERPRET", "reinterpret-15");
  });

  it("refuses maintenance jobs as runs", async () => {
    await expect(
      fanOutReinterpretRun(
        { jobId: "s", runJobId: "s", kind: "EXPLORATORY_SWEEP" },
        logger,
        vi.fn()
      )
    ).rejects.toThrow("EXPLORATORY_SWEEP is not a reinterpretation run");
  });

  it("records a failed batch only after its last attempt, and rethrows so BullMQ retries", async () => {
    vi.mocked(database.reinterpretBatch).mockRejectedValue(
      new Error("db down")
    );
    const batch = { ...run, jobId: "reinterpret-15-1", lineIds: ["l1"] };

    await expect(runReinterpretBatch(batch, logger, 1)).rejects.toThrow(
      "db down"
    );
    expect(database.recordReinterpretBatch).not.toHaveBeenCalled();

    await expect(
      runReinterpretBatch(batch, logger, REINTERPRET_BATCH_ATTEMPTS)
    ).rejects.toThrow("db down");
    expect(database.recordReinterpretBatch).toHaveBeenCalledWith(
      "reinterpret-15",
      { lines: 0, failed: true, errorMessage: "db down" }
    );
    vi.mocked(database.reinterpretBatch).mockReset();
  });
});

describe("reinterpret service defaults", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses the current revision when a run has none, and tolerates a missing run row", async () => {
    await fanOutReinterpretRun(
      { ...run, revision: undefined },
      logger,
      vi.fn(async () => undefined)
    );
    expect(database.selectReinterpretLines).toHaveBeenCalledWith(
      expect.objectContaining({ revision: 7 }),
      expect.anything()
    );

    vi.mocked(database.recordReinterpretBatch).mockResolvedValueOnce(null);
    await runReinterpretBatch(
      { jobId: "reparse-1", runJobId: "reparse", kind: "REPARSE_BY_VERSION" },
      logger,
      1
    );
    expect(database.reinterpretBatch).toHaveBeenCalledWith(
      [],
      expect.anything(),
      {
        kind: "REPARSE_BY_VERSION",
        revision: null,
        parserVersion: null,
      }
    );
    expect(logger.log).toHaveBeenCalledWith(
      expect.stringContaining("progress=?/?")
    );
  });

  it("records non-Error failures with their text", async () => {
    vi.mocked(database.reinterpretBatch).mockRejectedValueOnce("timeout");
    await expect(
      runReinterpretBatch(
        { ...run, lineIds: ["l1"] },
        logger,
        REINTERPRET_BATCH_ATTEMPTS
      )
    ).rejects.toBe("timeout");
    expect(database.recordReinterpretBatch).toHaveBeenCalledWith(
      "reinterpret-15",
      {
        lines: 0,
        failed: true,
        errorMessage: "timeout",
      }
    );
  });
});

describe("reinterpret actions", () => {
  it("delegate to the fan-out and batch services and register under their names", async () => {
    const deps = {
      logger,
      services: {
        fanOut: vi.fn(async (data: ReinterpretJobData) => data),
        runBatch: vi.fn(async (data: ReinterpretJobData) => data),
      },
    } as unknown as ReinterpretWorkerDependencies;
    const context = {
      jobId: "j",
      retryCount: 1,
      queueName: "reinterpret",
      operation: "reinterpret",
      startTime: 0,
      workerName: "w",
      attemptNumber: 2,
    };

    await new ReinterpretFanOutAction().execute(run, deps, context);
    expect(deps.services.fanOut).toHaveBeenCalledWith(run);
    await new ReinterpretBatchAction().execute(
      { ...run, lineIds: ["l1"] },
      deps,
      context
    );
    expect(deps.services.runBatch).toHaveBeenCalledWith(
      { ...run, lineIds: ["l1"] },
      2
    );

    const registered: string[] = [];
    registerReinterpretActions({
      register: (name: string) => registered.push(name),
    } as never);
    expect(registered).toEqual([
      ActionName.REINTERPRET_FAN_OUT,
      ActionName.REINTERPRET_BATCH,
      ActionName.CORPUS_HEALTH_SNAPSHOT,
      ActionName.EXPLORATORY_SWEEP,
    ]);
  });

  it("delegate snapshots and sweeps to their services", async () => {
    const deps = {
      logger,
      services: {
        snapshot: vi.fn(async (data: ReinterpretJobData) => data),
        sweep: vi.fn(async (data: ReinterpretJobData) => data),
      },
    } as unknown as ReinterpretWorkerDependencies;
    const context = {
      jobId: "j",
      retryCount: 0,
      queueName: "reinterpret",
      operation: "reinterpret",
      startTime: 0,
      workerName: "w",
      attemptNumber: 1,
    };
    const snapshot: ReinterpretJobData = {
      jobId: "c",
      runJobId: "c",
      kind: "CORPUS_HEALTH_SNAPSHOT",
      trigger: "MANUAL",
    };
    const sweep: ReinterpretJobData = {
      jobId: "s",
      runJobId: "s",
      kind: "EXPLORATORY_SWEEP",
    };

    await new CorpusHealthSnapshotAction().execute(snapshot, deps, context);
    expect(deps.services.snapshot).toHaveBeenCalledWith(snapshot);
    await new ExploratorySweepAction().execute(sweep, deps, context);
    expect(deps.services.sweep).toHaveBeenCalledWith(sweep);
  });
});

describe("health snapshots and exploratory sweeps", () => {
  beforeEach(() => vi.clearAllMocks());

  it("takes one snapshot per job, defaulting to the scheduled trigger", async () => {
    const result = await runCorpusHealthSnapshot(
      { jobId: "c", runJobId: "c", kind: "CORPUS_HEALTH_SNAPSHOT" },
      logger
    );
    expect(database.takeCorpusHealthSnapshot).toHaveBeenCalledTimes(1);
    expect(database.takeCorpusHealthSnapshot).toHaveBeenCalledWith("SCHEDULED");
    expect(result.metadata).toEqual({ snapshotId: "snap-1" });
    expect(logger.log).toHaveBeenCalledWith(
      expect.stringContaining("[HEALTH_SNAPSHOT] trigger=SCHEDULED mentions=12")
    );
  });

  it("sweeps with the current context and never touches mentions", async () => {
    const result = await runExploratorySweep(
      { jobId: "s", runJobId: "s", kind: "EXPLORATORY_SWEEP" },
      logger
    );
    expect(database.exploratorySweep).toHaveBeenCalledWith(
      expect.objectContaining({ revision: 7 })
    );
    expect(database.reinterpretBatch).not.toHaveBeenCalled();
    expect(result.metadata).toEqual({ linesScanned: 4, discoveriesTouched: 2 });
  });

  it("queues snapshots under a run-keyed id and charts reparses separately", async () => {
    const add = vi.fn(async (..._args: unknown[]) => undefined);
    await enqueueSnapshot({ add } as never, "REINTERPRET", "reinterpret-15");
    expect(add).toHaveBeenCalledWith(
      "corpus-health-snapshot",
      {
        jobId: "corpus-health-reinterpret-15",
        runJobId: "corpus-health-reinterpret-15",
        kind: "CORPUS_HEALTH_SNAPSHOT",
        trigger: "REINTERPRET",
      },
      expect.objectContaining({ jobId: "corpus-health-reinterpret-15" })
    );
    await enqueueSnapshot({ add } as never, "MANUAL");
    expect(add.mock.calls[1]![1]).toMatchObject({
      jobId: expect.stringMatching(/^corpus-health-\d+$/),
    });

    expect(snapshotTriggerFor("REPARSE_BY_VERSION")).toBe("REPARSE");
    expect(snapshotTriggerFor("REINTERPRET_BY_REVISION")).toBe("REINTERPRET");
  });

  it("schedules a daily snapshot and a weekly sweep by stable ids", async () => {
    const upsertJobScheduler = vi.fn(async (..._args: unknown[]) => undefined);
    await scheduleMaintenanceJobs({ upsertJobScheduler } as never, logger);
    expect(
      upsertJobScheduler.mock.calls.map((call) => [call[0], call[1]])
    ).toEqual([
      ["corpus-health-daily", { pattern: "0 3 * * *" }],
      ["exploratory-sweep-weekly", { pattern: "0 4 * * 0" }],
    ]);
    expect(MAINTENANCE_SCHEDULES.map((schedule) => schedule.data.kind)).toEqual(
      ["CORPUS_HEALTH_SNAPSHOT", "EXPLORATORY_SWEEP"]
    );
    expect(logger.log).toHaveBeenCalledWith(
      expect.stringContaining("[MAINTENANCE] scheduled corpus-health-daily")
    );
  });
});
