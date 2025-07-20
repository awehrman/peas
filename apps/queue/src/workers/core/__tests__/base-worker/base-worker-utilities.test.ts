import { describe, it, expect, vi, beforeEach } from "vitest";
import { Queue } from "bullmq";
import { BaseWorker } from "../../base-worker";
import { WorkerMetrics } from "../../metrics";
import type { BaseWorkerDependencies, BaseJobData } from "../../../types";
import type { IServiceContainer } from "../../../../services/container";

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

  describe("truncateResultForLogging", () => {
    it("should return short strings as-is", () => {
      const result = worker["truncateResultForLogging"]("short string");
      expect(result).toBe('"short string"');
    });

    it("should handle objects with short values", () => {
      const obj = { key: "value", num: 123 };
      const result = worker["truncateResultForLogging"](obj);
      expect(result).toBe('{"key":"value","num":123}');
    });

    it("should handle very long results by truncating the entire result", () => {
      const veryLongObj = {
        key1: "a".repeat(50),
        key2: "b".repeat(50),
        key3: "c".repeat(50),
        key4: "d".repeat(50),
      };
      const result = worker["truncateResultForLogging"](veryLongObj);
      expect(result.length).toBeLessThan(200);
      expect(result).toContain("...");
    });

    it("should handle non-serializable objects", () => {
      const circularObj = { key: "value" } as { key: string; self?: unknown };
      circularObj.self = circularObj;

      const result = worker["truncateResultForLogging"](circularObj);
      expect(result).toBe("[Object - object]");
    });

    it("should handle null and undefined", () => {
      expect(worker["truncateResultForLogging"](null)).toBe("null");
      expect(worker["truncateResultForLogging"](undefined)).toBe("undefined");
    });

    it("should handle numbers and booleans", () => {
      expect(worker["truncateResultForLogging"](42)).toBe("42");
      expect(worker["truncateResultForLogging"](true)).toBe("true");
      expect(worker["truncateResultForLogging"](false)).toBe("false");
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
