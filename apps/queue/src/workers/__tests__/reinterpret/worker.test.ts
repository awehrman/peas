import { PrismaClient } from "@peas/database";
import { Queue } from "bullmq";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { IServiceContainer } from "../../../services/container";
import {
  enqueueSnapshot,
  fanOutReinterpretRun,
  runCorpusHealthSnapshot,
  runExploratorySweep,
  runReinterpretBatch,
} from "../../../services/reinterpret/service";
import {
  createMockLogger,
  createMockStatusBroadcaster,
} from "../../../test-utils/helpers";
import { ActionName } from "../../../types";
import { ActionFactory } from "../../core/action-factory";
import type { ActionContext } from "../../core/types";
import {
  type ReinterpretJobData,
  type ReinterpretWorkerDependencies,
  buildReinterpretDependencies,
} from "../../reinterpret/dependencies";
import {
  ReinterpretWorker,
  createReinterpretWorker,
} from "../../reinterpret/worker";

vi.mock("../../../services/reinterpret/actions", () => ({
  registerReinterpretActions: vi.fn(),
}));

vi.mock("../../../services/reinterpret/service", () => ({
  REINTERPRET_BATCH_ATTEMPTS: 3,
  fanOutReinterpretRun: vi.fn(
    async (
      data: ReinterpretJobData,
      _logger: unknown,
      enqueue: (batch: ReinterpretJobData, jobId: string) => Promise<void>
    ) => {
      await enqueue(
        { ...data, jobId: `${data.runJobId}-1`, lineIds: ["l1"] },
        `${data.runJobId}-1`
      );
      return data;
    }
  ),
  runReinterpretBatch: vi.fn(async (data: ReinterpretJobData) => data),
  runCorpusHealthSnapshot: vi.fn(async (data: ReinterpretJobData) => data),
  runExploratorySweep: vi.fn(async (data: ReinterpretJobData) => data),
  enqueueSnapshot: vi.fn(async () => undefined),
  snapshotTriggerFor: vi.fn((kind: string) =>
    kind === "REPARSE_BY_VERSION" ? "REPARSE" : "REINTERPRET"
  ),
}));

const run: ReinterpretJobData = {
  jobId: "reinterpret-15",
  runJobId: "reinterpret-15",
  kind: "REINTERPRET_BY_REVISION",
  revision: 15,
};

function container(add = vi.fn(async () => undefined)): IServiceContainer {
  return {
    logger: createMockLogger(),
    statusBroadcaster: createMockStatusBroadcaster(),
    queues: {
      noteQueue: {} as Queue,
      imageQueue: {} as Queue,
      ingredientQueue: {} as Queue,
      instructionQueue: {} as Queue,
      categorizationQueue: {} as Queue,
      sourceQueue: {} as Queue,
      reinterpretQueue: { add } as unknown as Queue,
    },
    database: { prisma: {} as Partial<PrismaClient> as PrismaClient },
    errorHandler: {
      withErrorHandling: vi.fn(),
      createJobError: vi.fn(),
      classifyError: vi.fn(),
      logError: vi.fn(),
    },
    healthMonitor: { healthMonitor: {} },
    webSocket: { webSocketManager: {} },
    config: { wsHost: "localhost", port: 3000, wsPort: 3001 },
    _workers: {},
    close: vi.fn(),
  } as unknown as IServiceContainer;
}

describe("reinterpret worker", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fans out first, then runs batch jobs, two at a time", () => {
    const create = vi.fn((name: string) => ({ name }));
    const factory = { create } as unknown as ActionFactory<
      ReinterpretJobData,
      ReinterpretWorkerDependencies,
      ReinterpretJobData
    >;
    const worker = new ReinterpretWorker(
      { name: "reinterpret" } as Queue,
      container(),
      factory
    );
    const internals = worker as unknown as {
      getOperationName(): string;
      getConcurrency(): number;
      createActionPipeline(
        data: ReinterpretJobData,
        context: ActionContext
      ): { name: string }[];
    };

    expect(internals.getOperationName()).toBe("reinterpret");
    expect(internals.getConcurrency()).toBe(2);
    const context = {} as ActionContext;
    expect(internals.createActionPipeline(run, context)).toEqual([
      { name: ActionName.REINTERPRET_FAN_OUT },
    ]);
    expect(
      internals.createActionPipeline({ ...run, lineIds: ["l1"] }, context)
    ).toEqual([{ name: ActionName.REINTERPRET_BATCH }]);
    expect(
      internals.createActionPipeline(
        { jobId: "c", runJobId: "c", kind: "CORPUS_HEALTH_SNAPSHOT" },
        context
      )
    ).toEqual([{ name: ActionName.CORPUS_HEALTH_SNAPSHOT }]);
    expect(
      internals.createActionPipeline(
        { jobId: "s", runJobId: "s", kind: "EXPLORATORY_SWEEP" },
        context
      )
    ).toEqual([{ name: ActionName.EXPLORATORY_SWEEP }]);
    expect(
      createReinterpretWorker({ name: "reinterpret" } as Queue, container())
    ).toBeInstanceOf(ReinterpretWorker);
  });

  it("enqueues batch jobs with their deterministic ids, retries, and backoff", async () => {
    const add = vi.fn(async () => undefined);
    const deps = buildReinterpretDependencies(container(add));

    await deps.services.fanOut(run);
    expect(fanOutReinterpretRun).toHaveBeenCalledWith(
      run,
      expect.anything(),
      expect.any(Function)
    );
    expect(add).toHaveBeenCalledWith(
      "reinterpret-batch",
      { ...run, jobId: "reinterpret-15-1", lineIds: ["l1"] },
      expect.objectContaining({
        jobId: "reinterpret-15-1",
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
      })
    );

    const batch = { ...run, jobId: "reinterpret-15-1", lineIds: ["l1"] };
    await deps.services.runBatch(batch, 2);
    expect(runReinterpretBatch).toHaveBeenCalledWith(
      batch,
      expect.anything(),
      2,
      {
        onRunFinished: expect.any(Function),
      }
    );
    expect(enqueueSnapshot).not.toHaveBeenCalled();
  });

  it("snapshots after a run: right away when it has no batches, otherwise when its last batch finishes", async () => {
    const add = vi.fn(async () => undefined);
    const deps = buildReinterpretDependencies(container(add));

    vi.mocked(fanOutReinterpretRun).mockResolvedValueOnce({
      ...run,
      metadata: { batchCount: 0 },
    });
    await deps.services.fanOut(run);
    expect(enqueueSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ add }),
      "REINTERPRET",
      "reinterpret-15"
    );

    await deps.services.runBatch({ ...run, lineIds: ["l1"] }, 1);
    const options = vi.mocked(runReinterpretBatch).mock.calls[0]![3]!;
    await options.onRunFinished!("REPARSE", "reparse-2.1.0");
    expect(enqueueSnapshot).toHaveBeenLastCalledWith(
      expect.objectContaining({ add }),
      "REPARSE",
      "reparse-2.1.0"
    );
  });

  it("runs snapshots and sweeps through their services", async () => {
    const deps = buildReinterpretDependencies(container());
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
    await deps.services.snapshot(snapshot);
    expect(runCorpusHealthSnapshot).toHaveBeenCalledWith(
      snapshot,
      expect.anything()
    );
    await deps.services.sweep(sweep);
    expect(runExploratorySweep).toHaveBeenCalledWith(sweep, expect.anything());
  });
});
