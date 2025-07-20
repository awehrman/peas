import { describe, it, expect, vi, beforeEach } from "vitest";
import { getWorkerStatus } from "../../worker-factory";
import type { BaseWorker } from "../../../core/base-worker";
import type { BaseJobData, BaseWorkerDependencies } from "../../../types";

describe("getWorkerStatus", () => {
  let mockWorker1: BaseWorker<BaseJobData, BaseWorkerDependencies>;
  let mockWorker2: BaseWorker<BaseJobData, BaseWorkerDependencies>;
  let workers: Record<string, BaseWorker<BaseJobData, BaseWorkerDependencies>>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock workers
    mockWorker1 = {
      name: "worker1",
      close: vi.fn().mockResolvedValue(undefined),
      getStatus: vi
        .fn()
        .mockReturnValue({ isRunning: true, processedJobs: 10 }),
      execute: vi.fn(),
    } as unknown as import("../../../core/base-worker").BaseWorker;

    mockWorker2 = {
      name: "worker2",
      close: vi.fn().mockResolvedValue(undefined),
      getStatus: vi
        .fn()
        .mockReturnValue({ isRunning: false, processedJobs: 5 }),
      execute: vi.fn(),
    } as unknown as import("../../../core/base-worker").BaseWorker;

    // Workers registry
    workers = {
      worker1: mockWorker1,
      worker2: mockWorker2,
    };
  });

  it("should return status for all workers", () => {
    const result = getWorkerStatus(workers);

    expect(result).toHaveLength(2);
    expect(result).toEqual([
      {
        name: "worker1",
        status: { isRunning: true, processedJobs: 10 },
      },
      {
        name: "worker2",
        status: { isRunning: false, processedJobs: 5 },
      },
    ]);
  });

  it("should call getStatus on each worker", () => {
    getWorkerStatus(workers);

    expect(mockWorker1.getStatus).toHaveBeenCalledTimes(1);
    expect(mockWorker2.getStatus).toHaveBeenCalledTimes(1);
  });

  it("should handle empty workers registry", () => {
    const result = getWorkerStatus({});

    expect(result).toEqual([]);
  });

  it("should handle single worker", () => {
    const singleWorker = { worker1: mockWorker1 };
    const result = getWorkerStatus(singleWorker);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      name: "worker1",
      status: { isRunning: true, processedJobs: 10 },
    });
  });

  it("should handle workers with different status structures", () => {
    const workerWithComplexStatus = {
      name: "complex-worker",
      close: vi.fn().mockResolvedValue(undefined),
      getStatus: vi.fn().mockReturnValue({
        isRunning: true,
        processedJobs: 15,
        failedJobs: 2,
        uptime: 3600,
        lastJobTime: new Date(),
      }),
      execute: vi.fn(),
    } as unknown as import("../../../core/base-worker").BaseWorker;

    const workersWithComplexStatus = {
      simple: mockWorker1,
      complex: workerWithComplexStatus,
    };

    const result = getWorkerStatus(workersWithComplexStatus);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      name: "simple",
      status: { isRunning: true, processedJobs: 10 },
    });
    expect(result[1]).toEqual({
      name: "complex",
      status: {
        isRunning: true,
        processedJobs: 15,
        failedJobs: 2,
        uptime: 3600,
        lastJobTime: expect.any(Date),
      },
    });
  });

  it("should handle worker with undefined getStatus method", () => {
    const workerWithoutStatus = {
      name: "no-status-worker",
      close: vi.fn().mockResolvedValue(undefined),
      execute: vi.fn(),
    } as unknown as import("../../../core/base-worker").BaseWorker;

    const workersWithoutStatus = {
      noStatus: workerWithoutStatus,
    };

    // Should throw because getStatus is not defined
    expect(() => getWorkerStatus(workersWithoutStatus)).toThrow(
      "worker.getStatus is not a function"
    );
  });

  it("should handle worker with getStatus returning null", () => {
    const workerWithNullStatus = {
      name: "null-status-worker",
      close: vi.fn().mockResolvedValue(undefined),
      getStatus: vi.fn().mockReturnValue(null),
      execute: vi.fn(),
    } as unknown as import("../../../core/base-worker").BaseWorker;

    const workersWithNullStatus = {
      nullStatus: workerWithNullStatus,
    };

    const result = getWorkerStatus(workersWithNullStatus);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      name: "nullStatus",
      status: null,
    });
  });

  it("should preserve worker names in result", () => {
    const result = getWorkerStatus(workers);

    const workerNames = result.map((w) => w.name);
    expect(workerNames).toEqual(["worker1", "worker2"]);
  });

  it("should handle large number of workers", () => {
    const largeWorkersRegistry: Record<
      string,
      BaseWorker<BaseJobData, BaseWorkerDependencies>
    > = {};

    for (let i = 0; i < 100; i++) {
      largeWorkersRegistry[`worker${i}`] = {
        name: `worker${i}`,
        close: vi.fn().mockResolvedValue(undefined),
        getStatus: vi
          .fn()
          .mockReturnValue({ isRunning: true, processedJobs: i }),
        execute: vi.fn(),
      } as unknown as import("../../../core/base-worker").BaseWorker;
    }

    const result = getWorkerStatus(largeWorkersRegistry);

    expect(result).toHaveLength(100);
    expect(result[0]?.name).toBe("worker0");
    expect(result[99]?.name).toBe("worker99");
  });
});
