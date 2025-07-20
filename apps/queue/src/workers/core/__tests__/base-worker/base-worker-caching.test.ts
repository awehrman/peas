import { describe, it, expect, vi, beforeEach } from "vitest";
import { Queue } from "bullmq";
import { BaseWorker } from "../../base-worker";
import { BaseAction } from "../../base-action";
import { globalActionCache } from "../../cache";
import type {
  BaseWorkerDependencies,
  BaseJobData,
  ActionContext,
} from "../../../types";
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

// Test action implementations
class CacheableAction extends BaseAction<string, BaseWorkerDependencies> {
  name = "parse_test_action";

  async execute(
    data: string,
    _deps: BaseWorkerDependencies,
    _context: ActionContext
  ): Promise<string> {
    return `parsed: ${data}`;
  }
}

class NonCacheableAction extends BaseAction<string, BaseWorkerDependencies> {
  name = "process_test_action";

  async execute(
    data: string,
    _deps: BaseWorkerDependencies,
    _context: ActionContext
  ): Promise<string> {
    return `processed: ${data}`;
  }
}

class FetchAction extends BaseAction<string, BaseWorkerDependencies> {
  name = "fetch_test_action";

  async execute(
    data: string,
    _deps: BaseWorkerDependencies,
    _context: ActionContext
  ): Promise<string> {
    return `fetched: ${data}`;
  }
}

// Test implementation of BaseWorker
class TestWorker extends BaseWorker<BaseJobData, BaseWorkerDependencies> {
  protected registerActions(): void {
    // No actions to register for this test
  }

  protected getOperationName(): string {
    return "test-worker";
  }

  // Expose the private method for testing
  public async testExecuteActionWithCaching(
    action: BaseAction<unknown, unknown>,
    data: unknown,
    context: ActionContext
  ): Promise<unknown> {
    return this["executeActionWithCaching"](action, data, context);
  }
}

describe("BaseWorker Caching", () => {
  let worker: TestWorker;

  beforeEach(() => {
    vi.clearAllMocks();
    globalActionCache.clear();
    worker = new TestWorker(
      mockQueue,
      mockDependencies,
      undefined,
      mockContainer
    );
  });

  describe("executeActionWithCaching", () => {
    it("should cache parse actions", async () => {
      const action = new CacheableAction();
      const data = "test data";
      const context: ActionContext = {
        jobId: "test-job",
        retryCount: 0,
        queueName: "test-queue",
        operation: "test",
        startTime: Date.now(),
        workerName: "test-worker",
        attemptNumber: 1,
      };

      // First execution should not be cached
      const result1 = await worker.testExecuteActionWithCaching(
        action,
        data,
        context
      );
      expect(result1).toBe("parsed: test data");
      expect(mockDependencies.logger.log).not.toHaveBeenCalledWith(
        expect.stringContaining("Cache hit")
      );

      // Second execution should be cached
      const result2 = await worker.testExecuteActionWithCaching(
        action,
        data,
        context
      );
      expect(result2).toBe("parsed: test data");
      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        expect.stringContaining("Cache hit for action parse_test_action")
      );
    });

    it("should cache fetch actions", async () => {
      const action = new FetchAction();
      const data = "test data";
      const context: ActionContext = {
        jobId: "test-job",
        retryCount: 0,
        queueName: "test-queue",
        operation: "test",
        startTime: Date.now(),
        workerName: "test-worker",
        attemptNumber: 1,
      };

      // First execution should not be cached
      const result1 = await worker.testExecuteActionWithCaching(
        action,
        data,
        context
      );
      expect(result1).toBe("fetched: test data");

      // Second execution should be cached
      const result2 = await worker.testExecuteActionWithCaching(
        action,
        data,
        context
      );
      expect(result2).toBe("fetched: test data");
      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        expect.stringContaining("Cache hit for action fetch_test_action")
      );
    });

    it("should not cache non-cacheable actions", async () => {
      const action = new NonCacheableAction();
      const data = "test data";
      const context: ActionContext = {
        jobId: "test-job",
        retryCount: 0,
        queueName: "test-queue",
        operation: "test",
        startTime: Date.now(),
        workerName: "test-worker",
        attemptNumber: 1,
      };

      // First execution
      const result1 = await worker.testExecuteActionWithCaching(
        action,
        data,
        context
      );
      expect(result1).toBe("processed: test data");

      // Second execution should not be cached
      const result2 = await worker.testExecuteActionWithCaching(
        action,
        data,
        context
      );
      expect(result2).toBe("processed: test data");
      expect(mockDependencies.logger.log).not.toHaveBeenCalledWith(
        expect.stringContaining("Cache hit")
      );
    });

    it("should use different cache keys for different data", async () => {
      const action = new CacheableAction();
      const context: ActionContext = {
        jobId: "test-job",
        retryCount: 0,
        queueName: "test-queue",
        operation: "test",
        startTime: Date.now(),
        workerName: "test-worker",
        attemptNumber: 1,
      };

      // Execute with different data
      const result1 = await worker.testExecuteActionWithCaching(
        action,
        "data1",
        context
      );
      const result2 = await worker.testExecuteActionWithCaching(
        action,
        "data2",
        context
      );

      expect(result1).toBe("parsed: data1");
      expect(result2).toBe("parsed: data2");

      // Should not be cached since data is different
      expect(mockDependencies.logger.log).not.toHaveBeenCalledWith(
        expect.stringContaining("Cache hit")
      );
    });

    it("should use different cache keys for different job IDs", async () => {
      const action = new CacheableAction();
      const data = "test data";

      const context1: ActionContext = {
        jobId: "job1",
        retryCount: 0,
        queueName: "test-queue",
        operation: "test",
        startTime: Date.now(),
        workerName: "test-worker",
        attemptNumber: 1,
      };

      const context2: ActionContext = {
        jobId: "job2",
        retryCount: 0,
        queueName: "test-queue",
        operation: "test",
        startTime: Date.now(),
        workerName: "test-worker",
        attemptNumber: 1,
      };

      // Execute with different job IDs
      const result1 = await worker.testExecuteActionWithCaching(
        action,
        data,
        context1
      );
      const result2 = await worker.testExecuteActionWithCaching(
        action,
        data,
        context2
      );

      expect(result1).toBe("parsed: test data");
      expect(result2).toBe("parsed: test data");

      // Should not be cached since job IDs are different
      expect(mockDependencies.logger.log).not.toHaveBeenCalledWith(
        expect.stringContaining("Cache hit")
      );
    });

    it("should handle action execution errors", async () => {
      const errorAction = new (class extends BaseAction<
        string,
        BaseWorkerDependencies
      > {
        name = "parse_error_action";

        async execute(
          _data: string,
          _deps: BaseWorkerDependencies,
          _context: ActionContext
        ): Promise<string> {
          throw new Error("Action execution failed");
        }
      })();

      const data = "test data";
      const context: ActionContext = {
        jobId: "test-job",
        retryCount: 0,
        queueName: "test-queue",
        operation: "test",
        startTime: Date.now(),
        workerName: "test-worker",
        attemptNumber: 1,
      };

      await expect(
        worker.testExecuteActionWithCaching(errorAction, data, context)
      ).rejects.toThrow("Action execution failed");
    });
  });
});
