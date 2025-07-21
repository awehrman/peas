import { Queue } from "bullmq";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { IServiceContainer } from "../../../../services/container";
import type { BaseJobData, BaseWorkerDependencies } from "../../../types";
import { BaseWorker } from "../../base-worker";
import { WorkerMetrics } from "../../metrics";

// Mock dependencies
const mockQueue = {
  name: "test-queue",
} as Queue;

const mockDependencies: BaseWorkerDependencies = {
  logger: {
    log: vi.fn(),
  },
  addStatusEventAndBroadcast: vi.fn(),
  ErrorHandler: {
    withErrorHandling: vi.fn(),
  },
};

const mockContainer = {
  logger: mockDependencies.logger,
  statusBroadcaster: {
    addStatusEventAndBroadcast: vi.fn(),
  },
  errorHandler: {
    errorHandler: mockDependencies.ErrorHandler,
  },
} as unknown as IServiceContainer;

// Test implementation of BaseWorker
class TestWorker extends BaseWorker<BaseJobData, BaseWorkerDependencies> {
  protected registerActions(): void {
    // No actions to register for this test
  }

  protected getOperationName(): string {
    return "test-worker";
  }

  // Override getConcurrency for testing
  protected getConcurrency(): number {
    return 10;
  }
}

// Test implementation with default concurrency
class DefaultConcurrencyWorker extends BaseWorker<
  BaseJobData,
  BaseWorkerDependencies
> {
  protected registerActions(): void {
    // No actions to register for this test
  }

  protected getOperationName(): string {
    return "default-worker";
  }
}

describe("BaseWorker Utilities", () => {
  let worker: TestWorker;
  let defaultWorker: DefaultConcurrencyWorker;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(WorkerMetrics, "recordWorkerStatus").mockImplementation(() => {});
    worker = new TestWorker(
      mockQueue,
      mockDependencies,
      undefined,
      mockContainer
    );
    // Mock the worker property with isRunning method
    (
      worker as unknown as {
        worker: { isRunning: () => boolean; close: () => void };
      }
    ).worker = {
      isRunning: vi.fn(() => true),
      close: vi.fn(),
    };
    defaultWorker = new DefaultConcurrencyWorker(
      mockQueue,
      mockDependencies,
      undefined,
      mockContainer
    );
    // Mock the worker property for defaultWorker too
    (
      defaultWorker as unknown as {
        worker: { isRunning: () => boolean; close: () => void };
      }
    ).worker = {
      isRunning: vi.fn(() => true),
      close: vi.fn(),
    };
  });

  describe("getConcurrency", () => {
    it("should return custom concurrency when overridden", () => {
      const concurrency = worker["getConcurrency"]();
      expect(concurrency).toBe(10);
    });

    it("should return default concurrency when not overridden", () => {
      const concurrency = defaultWorker["getConcurrency"]();
      expect(concurrency).toBe(5);
    });
  });

  describe("getStatus", () => {
    it("should return worker status with running state", () => {
      const status = worker.getStatus();

      expect(status).toHaveProperty("isRunning");
      expect(status).toHaveProperty("name");
      expect(status.name).toBe("test-worker");
      expect(typeof status.isRunning).toBe("boolean");
    });

    it("should record worker status metric", () => {
      worker.getStatus();

      expect(WorkerMetrics.recordWorkerStatus).toHaveBeenCalledWith(
        "test-worker",
        expect.any(Boolean)
      );
    });

    it("should return correct operation name", () => {
      const status = worker.getStatus();
      expect(status.name).toBe("test-worker");
    });
  });

  describe("close", () => {
    it("should close the worker", async () => {
      const closeSpy = vi.spyOn(worker["worker"], "close").mockResolvedValue();

      await worker.close();

      expect(closeSpy).toHaveBeenCalledOnce();
    });
  });

  describe("getWorker", () => {
    it("should return the underlying BullMQ worker", () => {
      const returnedWorker = worker.getWorker();

      expect(returnedWorker).toBe(worker["worker"]);
    });
  });
});
