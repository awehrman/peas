import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  RetryAction,
  type RetryConfig,
  type RetryData,
  type RetryDeps,
} from "../../retry";
import { ActionContext } from "../../../core/types";

// Mock timers for testing delays
vi.useFakeTimers();

describe("RetryAction", () => {
  let retryAction: RetryAction;
  let mockLogger: RetryDeps["logger"];
  let context: ActionContext;

  beforeEach(() => {
    retryAction = new RetryAction();
    mockLogger = {
      log: vi.fn(),
    };
    context = {
      jobId: "test-job-123",
      operation: "test-operation",
      retryCount: 0,
      queueName: "test-queue",
      startTime: Date.now(),
      workerName: "test-worker",
      attemptNumber: 1,
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
  });

  describe("constructor", () => {
    it("should use default config when no config provided", () => {
      const action = new RetryAction();
      expect(action.name).toBe("retry");
    });

    it("should use custom config when provided", () => {
      const customConfig: RetryConfig = {
        maxAttempts: 5,
        baseDelay: 2000,
        maxDelay: 60000,
        backoffMultiplier: 3,
        jitter: false,
      };
      const action = new RetryAction(customConfig);
      expect(action.name).toBe("retry");
    });
  });

  describe("execute", () => {
    it("should throw error when max attempts exceeded", async () => {
      const data: RetryData = {
        attempt: 3,
        maxAttempts: 3,
      };

      await expect(
        retryAction.execute(data, { logger: mockLogger! }, context)
      ).rejects.toThrow("Max retry attempts (3) exceeded for job test-job-123");
    });

    it("should return incremented attempt on first execution", async () => {
      const data: RetryData = {
        attempt: 0,
        maxAttempts: 3,
      };

      const result = await retryAction.execute(
        data,
        { logger: mockLogger! },
        context
      );

      expect(result).toEqual({
        attempt: 1,
        maxAttempts: 3,
      });
      expect(mockLogger!.log).not.toHaveBeenCalled();
    });

    it("should log retry message and wait on subsequent attempts", async () => {
      const data: RetryData = {
        attempt: 1,
        maxAttempts: 3,
      };

      const executePromise = retryAction.execute(
        data,
        { logger: mockLogger! },
        context
      );

      // Fast-forward time to simulate delay (baseDelay * 2^1 = 1000 * 2 = 2000ms)
      vi.advanceTimersByTime(2200); // Add extra time for jitter

      const result = await executePromise;

      expect(result).toEqual({
        attempt: 2,
        maxAttempts: 3,
      });
      expect(mockLogger!.log).toHaveBeenCalledWith(
        expect.stringMatching(
          /Retrying job test-job-123 \(attempt 2\/3\) after \d+\.?\d*ms/
        ),
        "warn"
      );
    });

    it("should use console.warn when logger not provided", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const data: RetryData = {
        attempt: 1,
        maxAttempts: 3,
      };

      const executePromise = retryAction.execute(data, {}, context);
      vi.advanceTimersByTime(2200); // Add extra time for jitter
      await executePromise;

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(
          /Retrying job test-job-123 \(attempt 2\/3\) after \d+\.?\d*ms/
        )
      );

      consoleSpy.mockRestore();
    });

    it("should use data maxAttempts when provided", async () => {
      const data: RetryData = {
        attempt: 0,
        maxAttempts: 5,
      };

      const result = await retryAction.execute(
        data,
        { logger: mockLogger! },
        context
      );

      expect(result).toEqual({
        attempt: 1,
        maxAttempts: 5,
      });
    });
  });

  describe("delay calculation", () => {
    it("should calculate exponential backoff correctly", async () => {
      const config: RetryConfig = {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
        jitter: false,
      };
      const action = new RetryAction(config);

      const data: RetryData = {
        attempt: 1,
        maxAttempts: 3,
      };

      const executePromise = action.execute(
        data,
        { logger: mockLogger! },
        context
      );

      // Should wait for 2000ms (1000 * 2^1)
      vi.advanceTimersByTime(2000);
      await executePromise;

      expect(mockLogger!.log).toHaveBeenCalledWith(
        "Retrying job test-job-123 (attempt 2/3) after 2000ms",
        "warn"
      );
    });

    it("should respect maxDelay limit", async () => {
      const config: RetryConfig = {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 1500,
        backoffMultiplier: 2,
        jitter: false,
      };
      const action = new RetryAction(config);

      const data: RetryData = {
        attempt: 2,
        maxAttempts: 3,
      };

      const executePromise = action.execute(
        data,
        { logger: mockLogger! },
        context
      );

      // Should wait for 1500ms (capped at maxDelay) instead of 4000ms
      vi.advanceTimersByTime(1500);
      await executePromise;

      expect(mockLogger!.log).toHaveBeenCalledWith(
        "Retrying job test-job-123 (attempt 3/3) after 1500ms",
        "warn"
      );
    });
  });
});
