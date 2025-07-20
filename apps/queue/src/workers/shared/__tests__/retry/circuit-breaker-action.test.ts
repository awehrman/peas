import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CircuitBreakerAction, type RetryDeps } from "../../retry";
import { BaseAction } from "../../../core/base-action";
import { ActionContext } from "../../../core/types";

// Mock timers for testing delays
vi.useFakeTimers();

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
