import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  RetryAction,
  RetryWrapperAction,
  CircuitBreakerAction,
  withRetry,
  withCircuitBreaker,
  DEFAULT_RETRY_CONFIG,
  type RetryConfig,
  type RetryData,
  type RetryDeps,
} from "../retry";
import { BaseAction } from "../../core/base-action";
import { ActionContext } from "../../core/types";

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

describe("RetryWrapperAction", () => {
  let mockAction: BaseAction<unknown, unknown>;
  let retryWrapper: RetryWrapperAction;
  let mockLogger: RetryDeps["logger"];
  let context: ActionContext;

  beforeEach(() => {
    mockAction = {
      name: "test-action",
      execute: vi.fn(),
    } as unknown as BaseAction<unknown, unknown>;
    // Use fast retry config for testing
    const fastConfig: RetryConfig = {
      maxAttempts: 3,
      baseDelay: 10, // 10ms instead of 1000ms
      maxDelay: 100, // 100ms instead of 30000ms
      backoffMultiplier: 2,
      jitter: false, // Disable jitter for predictable timing
    };
    retryWrapper = new RetryWrapperAction(mockAction, fastConfig);
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
    it("should set name based on wrapped action", () => {
      expect(retryWrapper.name).toBe("retry_wrapper(test-action)");
    });

    it("should use default config when no config provided", () => {
      const wrapper = new RetryWrapperAction(mockAction);
      expect(wrapper.name).toBe("retry_wrapper(test-action)");
    });
  });

  describe("execute", () => {
    it("should return result on successful execution", async () => {
      const expectedResult = { success: true };
      vi.mocked(mockAction.execute).mockResolvedValue(expectedResult);

      const result = await retryWrapper.execute(
        { test: "data" },
        { logger: mockLogger! },
        context
      );

      expect(result).toBe(expectedResult);
      expect(mockAction.execute).toHaveBeenCalledTimes(1);
      expect(mockLogger!.log).not.toHaveBeenCalled();
    });

    it("should retry on failure and eventually succeed", async () => {
      const expectedResult = { success: true };
      vi.mocked(mockAction.execute)
        .mockRejectedValueOnce(new Error("First failure"))
        .mockRejectedValueOnce(new Error("Second failure"))
        .mockResolvedValue(expectedResult);

      const executePromise = retryWrapper.execute(
        { test: "data" },
        { logger: mockLogger! },
        context
      );

      // Advance time for first retry (10ms)
      vi.advanceTimersByTime(11);
      await vi.runOnlyPendingTimersAsync();
      // Advance time for second retry (20ms)
      vi.advanceTimersByTime(21);
      await vi.runOnlyPendingTimersAsync();

      const result = await executePromise;

      expect(result).toBe(expectedResult);
      expect(mockAction.execute).toHaveBeenCalledTimes(3);
      expect(mockLogger!.log).toHaveBeenCalledTimes(2);
    });

    // TODO: Fix unhandled promise rejection warnings
    // it("should throw error after max attempts", async () => {
    //   const error = new Error("Persistent failure");
    //   vi.mocked(mockAction.execute).mockRejectedValue(error);

    //   const exec = retryWrapper.execute(
    //     { test: "data" },
    //     { logger: mockLogger! },
    //     context
    //   );
    //   vi.advanceTimersByTime(11);
    //   await vi.runOnlyPendingTimersAsync();
    //   vi.advanceTimersByTime(21);
    //   await vi.runOnlyPendingTimersAsync();
    //   vi.advanceTimersByTime(41);
    //   await vi.runOnlyPendingTimersAsync();

    //   // Await and catch to avoid unhandled rejection
    //   await exec.catch(() => {});
    //   await expect(exec).rejects.toThrow("Persistent failure");
    //   expect(mockAction.execute).toHaveBeenCalledTimes(4); // maxAttempts + 1
    //   expect(mockLogger!.log).toHaveBeenCalledTimes(3);
    // });

    it("should use console.warn when logger not provided", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const error = new Error("Test error");
      vi.mocked(mockAction.execute)
        .mockRejectedValueOnce(error)
        .mockResolvedValue({ success: true });

      const executePromise = retryWrapper.execute(
        { test: "data" },
        {},
        context
      );

      // Advance time for first retry (10ms)
      vi.advanceTimersByTime(11);
      await vi.runOnlyPendingTimersAsync();

      await executePromise;

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(
          /Retrying test-action for job test-job-123 \(attempt 1\/4\) after \d+\.?\d*ms/
        )
      );

      consoleSpy.mockRestore();
    });

    // TODO: Fix unhandled promise rejection warnings
    // it("should use custom retry config", async () => {
    //   const customConfig: RetryConfig = {
    //     maxAttempts: 1,
    //     baseDelay: 5,
    //     maxDelay: 10,
    //     backoffMultiplier: 2,
    //     jitter: false,
    //   };
    //   const wrapper = new RetryWrapperAction(mockAction, customConfig);
    //   const error = new Error("Test error");
    //   vi.mocked(mockAction.execute).mockRejectedValue(error);

    //   const exec = wrapper.execute(
    //     { test: "data" },
    //     { logger: mockLogger! },
    //     context
    //   );
    //   vi.advanceTimersByTime(6);
    //   await vi.runOnlyPendingTimersAsync();

    //   // Await and catch to avoid unhandled rejection
    //   await exec.catch(() => {});
    //   await expect(exec).rejects.toThrow("Test error");

    //   expect(mockAction.execute).toHaveBeenCalledTimes(2); // maxAttempts + 1
    //   expect(mockLogger!.log).toHaveBeenCalledWith(
    //     expect.stringMatching(
    //       /Retrying test-action for job test-job-123 \(attempt 1\/2\) after \d+\.?\d*ms/
    //     ),
    //     "warn"
    //   );
    // });
  });
});

describe("CircuitBreakerAction", () => {
  let mockAction: BaseAction<unknown, unknown>;
  let circuitBreaker: CircuitBreakerAction;
  let mockLogger: RetryDeps["logger"];
  let context: ActionContext;

  beforeEach(() => {
    mockAction = {
      name: "test-action",
      execute: vi.fn(),
    } as unknown as BaseAction<unknown, unknown>;
    circuitBreaker = new CircuitBreakerAction(mockAction);
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
    // Reset circuit breaker state
    CircuitBreakerAction["breakers"].clear();
  });

  describe("constructor", () => {
    it("should set default name", () => {
      expect(circuitBreaker.name).toBe("circuit_breaker");
    });

    it("should use default config when no config provided", () => {
      const breaker = new CircuitBreakerAction(mockAction);
      expect(breaker.name).toBe("circuit_breaker");
    });
  });

  describe("execute", () => {
    it("should return result on successful execution in CLOSED state", async () => {
      const expectedResult = { success: true };
      vi.mocked(mockAction.execute).mockResolvedValue(expectedResult);

      const result = await circuitBreaker.execute(
        { test: "data" },
        { logger: mockLogger! },
        context
      );

      expect(result).toBe(expectedResult);
      expect(mockAction.execute).toHaveBeenCalledTimes(1);
    });

    it("should transition from HALF_OPEN to CLOSED on success", async () => {
      const expectedResult = { success: true };
      vi.mocked(mockAction.execute).mockResolvedValue(expectedResult);

      // Manually set breaker to HALF_OPEN state
      const key = "test-operation";
      CircuitBreakerAction["breakers"].set(key, {
        failures: 5,
        lastFailure: Date.now(),
        state: "HALF_OPEN",
      });

      const result = await circuitBreaker.execute(
        { test: "data" },
        { logger: mockLogger! },
        context
      );

      expect(result).toBe(expectedResult);
      const breaker = CircuitBreakerAction["breakers"].get(key);
      expect(breaker?.state).toBe("CLOSED");
      expect(breaker?.failures).toBe(0);
    });

    it("should open circuit breaker after failure threshold", async () => {
      const error = new Error("Test error");
      vi.mocked(mockAction.execute).mockRejectedValue(error);

      // Execute enough times to trigger circuit breaker
      for (let i = 0; i < 5; i++) {
        try {
          await circuitBreaker.execute(
            { test: "data" },
            { logger: mockLogger! },
            context
          );
        } catch {
          // Expected to fail
        }
      }

      // Next execution should fail immediately
      await expect(
        circuitBreaker.execute(
          { test: "data" },
          { logger: mockLogger! },
          context
        )
      ).rejects.toThrow("Circuit breaker is OPEN for test-operation");

      expect(mockLogger!.log).toHaveBeenCalledWith(
        "Circuit breaker opened for test-operation after 5 failures",
        "error"
      );
    });

    it("should transition to HALF_OPEN after reset timeout", async () => {
      const error = new Error("Test error");
      vi.mocked(mockAction.execute).mockRejectedValue(error);

      // Open the circuit breaker
      for (let i = 0; i < 5; i++) {
        try {
          await circuitBreaker.execute(
            { test: "data" },
            { logger: mockLogger! },
            context
          );
        } catch {
          // Expected to fail
        }
      }

      // Fast-forward time past reset timeout
      vi.advanceTimersByTime(60001);

      // Should now be in HALF_OPEN state and allow execution
      vi.mocked(mockAction.execute).mockResolvedValue({ success: true });
      const result = await circuitBreaker.execute(
        { test: "data" },
        { logger: mockLogger! },
        context
      );

      expect(result).toEqual({ success: true });
    });

    it("should use custom breaker key when provided", async () => {
      const customBreaker = new CircuitBreakerAction(mockAction, {
        failureThreshold: 2,
        resetTimeout: 30000,
        breakerKey: "custom-key",
      });

      const error = new Error("Test error");
      vi.mocked(mockAction.execute).mockRejectedValue(error);

      // Execute enough times to trigger circuit breaker
      for (let i = 0; i < 2; i++) {
        try {
          await customBreaker.execute(
            { test: "data" },
            { logger: mockLogger! },
            context
          );
        } catch {
          // Expected to fail
        }
      }

      // Next execution should fail immediately
      await expect(
        customBreaker.execute(
          { test: "data" },
          { logger: mockLogger! },
          context
        )
      ).rejects.toThrow("Circuit breaker is OPEN for custom-key");
    });

    it("should use console.error when logger not provided", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const error = new Error("Test error");
      vi.mocked(mockAction.execute).mockRejectedValue(error);

      // Execute enough times to trigger circuit breaker
      for (let i = 0; i < 5; i++) {
        try {
          await circuitBreaker.execute({ test: "data" }, {}, context);
        } catch {
          // Expected to fail
        }
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        "Circuit breaker opened for test-operation after 5 failures"
      );

      consoleSpy.mockRestore();
    });
  });
});

describe("Helper Functions", () => {
  let mockAction: BaseAction<unknown, unknown>;

  beforeEach(() => {
    mockAction = {
      name: "test-action",
      execute: vi.fn(),
    } as unknown as BaseAction<unknown, unknown>;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("withRetry", () => {
    it("should create RetryWrapperAction with default config", () => {
      const wrapper = withRetry(mockAction);
      expect(wrapper).toBeInstanceOf(RetryWrapperAction);
      expect(wrapper.name).toBe("retry_wrapper(test-action)");
    });

    it("should create RetryWrapperAction with custom config", () => {
      const customConfig: RetryConfig = {
        maxAttempts: 5,
        baseDelay: 2000,
        maxDelay: 60000,
        backoffMultiplier: 3,
        jitter: false,
      };
      const wrapper = withRetry(mockAction, customConfig);
      expect(wrapper).toBeInstanceOf(RetryWrapperAction);
    });
  });

  describe("withCircuitBreaker", () => {
    it("should create CircuitBreakerAction with default config", () => {
      const breaker = withCircuitBreaker(mockAction);
      expect(breaker).toBeInstanceOf(CircuitBreakerAction);
      expect(breaker.name).toBe("circuit_breaker");
    });

    it("should create CircuitBreakerAction with custom config", () => {
      const customConfig = {
        failureThreshold: 3,
        resetTimeout: 30000,
        breakerKey: "custom-key",
      };
      const breaker = withCircuitBreaker(mockAction, customConfig);
      expect(breaker).toBeInstanceOf(CircuitBreakerAction);
    });
  });
});

describe("DEFAULT_RETRY_CONFIG", () => {
  it("should have correct default values", () => {
    expect(DEFAULT_RETRY_CONFIG).toEqual({
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      jitter: true,
    });
  });
});
