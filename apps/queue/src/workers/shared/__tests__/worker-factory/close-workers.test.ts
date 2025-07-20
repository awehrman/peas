import { describe, it, expect, vi, beforeEach } from "vitest";
import { closeWorkers } from "../../worker-factory";
import type { IServiceContainer } from "../../../../services/container";
import type { BaseWorker } from "../../../core/base-worker";
import type { BaseJobData, BaseWorkerDependencies } from "../../../types";

describe("closeWorkers", () => {
  let mockContainer: IServiceContainer;
  let mockWorker1: BaseWorker<BaseJobData, BaseWorkerDependencies>;
  let mockWorker2: BaseWorker<BaseJobData, BaseWorkerDependencies>;
  let workers: Record<string, BaseWorker<BaseJobData, BaseWorkerDependencies>>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock workers
    mockWorker1 = {
      name: "worker1",
      close: vi.fn().mockResolvedValue(undefined),
      getStatus: vi.fn().mockReturnValue({ isRunning: true }),
      execute: vi.fn(),
    } as unknown as import("../../../core/base-worker").BaseWorker;

    mockWorker2 = {
      name: "worker2",
      close: vi.fn().mockResolvedValue(undefined),
      getStatus: vi.fn().mockReturnValue({ isRunning: true }),
      execute: vi.fn(),
    } as unknown as import("../../../core/base-worker").BaseWorker;

    // Mock container
    mockContainer = {
      logger: {
        log: vi.fn(),
      },
    } as unknown as import("../../../../services/container").IServiceContainer;

    // Workers registry
    workers = {
      worker1: mockWorker1,
      worker2: mockWorker2,
    };
  });

  it("should close all workers successfully", async () => {
    await closeWorkers(workers, mockContainer);

    expect(mockWorker1.close).toHaveBeenCalledTimes(1);
    expect(mockWorker2.close).toHaveBeenCalledTimes(1);
  });

  it("should log success message for each closed worker", async () => {
    await closeWorkers(workers, mockContainer);

    expect(mockContainer.logger.log).toHaveBeenCalledWith(
      expect.stringContaining("worker1 worker closed successfully")
    );
    expect(mockContainer.logger.log).toHaveBeenCalledWith(
      expect.stringContaining("worker2 worker closed successfully")
    );
  });

  it("should handle worker close errors gracefully", async () => {
    const closeError = new Error("Close failed");
    mockWorker1.close = vi.fn().mockRejectedValue(closeError);

    // Should not throw - errors are handled gracefully
    await closeWorkers(workers, mockContainer);

    expect(mockWorker1.close).toHaveBeenCalledTimes(1);
    expect(mockWorker2.close).toHaveBeenCalledTimes(1);
    expect(mockContainer.logger.log).toHaveBeenCalledWith(
      expect.stringContaining("worker1 worker error"),
      "error"
    );
  });

  it("should handle non-Error exceptions from worker close", async () => {
    mockWorker1.close = vi.fn().mockRejectedValue("String error");

    // Should not throw - errors are handled gracefully
    await closeWorkers(workers, mockContainer);

    expect(mockWorker1.close).toHaveBeenCalledTimes(1);
    expect(mockWorker2.close).toHaveBeenCalledTimes(1);
    expect(mockContainer.logger.log).toHaveBeenCalledWith(
      expect.stringContaining("worker1 worker error"),
      "error"
    );
  });

  it("should handle empty workers registry", async () => {
    await closeWorkers({}, mockContainer);

    expect(mockContainer.logger.log).not.toHaveBeenCalled();
  });

  it("should handle single worker", async () => {
    const singleWorker = { worker1: mockWorker1 };

    await closeWorkers(singleWorker, mockContainer);

    expect(mockWorker1.close).toHaveBeenCalledTimes(1);
    expect(mockContainer.logger.log).toHaveBeenCalledWith(
      expect.stringContaining("worker1 worker closed successfully")
    );
  });

  it("should handle multiple worker close errors", async () => {
    const closeError1 = new Error("Close failed 1");
    const closeError2 = new Error("Close failed 2");

    mockWorker1.close = vi.fn().mockRejectedValue(closeError1);
    mockWorker2.close = vi.fn().mockRejectedValue(closeError2);

    // Should not throw - all errors are handled gracefully
    await closeWorkers(workers, mockContainer);

    expect(mockWorker1.close).toHaveBeenCalledTimes(1);
    expect(mockWorker2.close).toHaveBeenCalledTimes(1);
    expect(mockContainer.logger.log).toHaveBeenCalledWith(
      expect.stringContaining("worker1 worker error"),
      "error"
    );
    expect(mockContainer.logger.log).toHaveBeenCalledWith(
      expect.stringContaining("worker2 worker error"),
      "error"
    );
  });

  it("should use Promise.allSettled for concurrent closing", async () => {
    const closeSpy = vi.spyOn(Promise, "allSettled");

    await closeWorkers(workers, mockContainer);

    expect(closeSpy).toHaveBeenCalledWith(
      expect.arrayContaining([expect.any(Promise), expect.any(Promise)])
    );
  });

  it("should handle workers with different close behaviors", async () => {
    const slowWorker = {
      name: "slow-worker",
      close: vi
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 100))
        ),
      getStatus: vi.fn().mockReturnValue({ isRunning: true }),
      execute: vi.fn(),
    } as unknown as import("../../../core/base-worker").BaseWorker;

    const fastWorker = {
      name: "fast-worker",
      close: vi.fn().mockResolvedValue(undefined),
      getStatus: vi.fn().mockReturnValue({ isRunning: true }),
      execute: vi.fn(),
    } as unknown as import("../../../core/base-worker").BaseWorker;

    const mixedWorkers = {
      slow: slowWorker,
      fast: fastWorker,
    };

    await closeWorkers(mixedWorkers, mockContainer);

    expect(slowWorker.close).toHaveBeenCalledTimes(1);
    expect(fastWorker.close).toHaveBeenCalledTimes(1);
  });

  it("should handle worker with undefined close method", async () => {
    const workerWithoutClose = {
      name: "no-close-worker",
      getStatus: vi.fn().mockReturnValue({ isRunning: true }),
      execute: vi.fn(),
    } as unknown as import("../../../core/base-worker").BaseWorker;

    const workersWithoutClose = {
      noClose: workerWithoutClose,
    };

    // Should not throw - should handle gracefully
    await closeWorkers(workersWithoutClose, mockContainer);

    expect(mockContainer.logger.log).toHaveBeenCalledWith(
      expect.stringContaining("noClose worker error"),
      "error"
    );
  });
});
