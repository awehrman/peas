import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActionName, LogLevel } from "../../../types";
import { ActionFactory } from "../../core/action-factory";
import { BaseAction } from "../../core/base-action";
import type { ActionContext } from "../../core/types";
import {
  CircuitBreakerAction,
  DEFAULT_RETRY_CONFIG,
  RetryAction,
  type RetryDeps,
  type RetryJobData,
  RetryWrapperAction,
  withCircuitBreaker,
  withCircuitBreakerFactory,
  withRetry,
  withRetryFactory,
} from "../../shared/retry";
import type { BaseJobData } from "../../types";

describe("Retry", () => {
  let mockLogger: {
    log: ReturnType<typeof vi.fn>;
  };
  let mockActionFactory: ActionFactory<BaseJobData, object>;
  let mockContext: ActionContext;

  beforeEach(() => {
    vi.clearAllMocks();

    mockLogger = {
      log: vi.fn(),
    };

    mockActionFactory = {
      create: vi.fn(),
    } as unknown as ActionFactory<BaseJobData, object>;

    mockContext = {
      jobId: "test-job-123",
      retryCount: 0,
      queueName: "test-queue",
      operation: "test-operation",
      startTime: Date.now(),
      workerName: "test-worker",
      attemptNumber: 1,
    };

    // Reset circuit breaker state between tests
    // @ts-expect-error - Accessing private static property for testing
    CircuitBreakerAction.breakers.clear();
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

  describe("RetryAction", () => {
    let retryAction: RetryAction;

    beforeEach(() => {
      retryAction = new RetryAction();
    });

    it("should have correct name", () => {
      expect(retryAction.name).toBe(ActionName.RETRY);
    });

    it("should use default config when no config provided", () => {
      const action = new RetryAction();
      expect(action).toBeInstanceOf(RetryAction);
    });

    it("should use custom config when provided", () => {
      const customConfig = {
        maxAttempts: 5,
        baseDelay: 500,
        maxDelay: 10000,
        backoffMultiplier: 1.5,
        jitter: false,
      };
      const action = new RetryAction(customConfig);
      expect(action).toBeInstanceOf(RetryAction);
    });

    it("should execute successfully on first attempt", async () => {
      const testData: RetryJobData = {
        attempt: 0,
        maxAttempts: 3,
      };
      const testDeps: RetryDeps = { logger: mockLogger };

      const result = await retryAction.execute(testData, testDeps, mockContext);

      expect(result).toEqual({
        attempt: 1,
        maxAttempts: 3,
      });
      expect(mockLogger.log).not.toHaveBeenCalled();
    });

    it("should retry with exponential backoff", async () => {
      const testData: RetryJobData = {
        attempt: 1,
        maxAttempts: 3,
      };
      const testDeps: RetryDeps = { logger: mockLogger };

      const startTime = Date.now();
      const result = await retryAction.execute(testData, testDeps, mockContext);
      const endTime = Date.now();

      expect(result).toEqual({
        attempt: 2,
        maxAttempts: 3,
      });

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "Retrying job test-job-123 (attempt 2/3) after"
        ),
        LogLevel.WARN,
        expect.objectContaining({
          jobId: "test-job-123",
          attempt: 1,
          delay: expect.any(Number),
        })
      );

      // Should have waited approximately 2000ms (baseDelay * backoffMultiplier)
      expect(endTime - startTime).toBeGreaterThanOrEqual(1900);
    });

    it("should throw error when max attempts exceeded", async () => {
      const testData: RetryJobData = {
        attempt: 3,
        maxAttempts: 3,
      };
      const testDeps: RetryDeps = { logger: mockLogger };

      await expect(
        retryAction.execute(testData, testDeps, mockContext)
      ).rejects.toThrow("Max retry attempts (3) exceeded for job test-job-123");
    });

    it("should use console.warn when logger is not available", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const testData: RetryJobData = {
        attempt: 1,
        maxAttempts: 3,
      };
      const testDeps: RetryDeps = {};

      const result = await retryAction.execute(testData, testDeps, mockContext);

      expect(result).toEqual({
        attempt: 2,
        maxAttempts: 3,
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Retrying job test-job-123 (attempt 2/3) after")
      );

      consoleSpy.mockRestore();
    });

    it("should use console.warn when logger is undefined", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const testData: RetryJobData = {
        attempt: 1,
        maxAttempts: 3,
      };
      const testDeps: RetryDeps = { logger: undefined };

      const result = await retryAction.execute(testData, testDeps, mockContext);

      expect(result).toEqual({
        attempt: 2,
        maxAttempts: 3,
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Retrying job test-job-123 (attempt 2/3) after")
      );

      consoleSpy.mockRestore();
    });

    it("should use console.warn when logger.log is undefined", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const testData: RetryJobData = {
        attempt: 1,
        maxAttempts: 3,
      };
      const testDeps: RetryDeps = { logger: { log: undefined } as any };

      const result = await retryAction.execute(testData, testDeps, mockContext);

      expect(result).toEqual({
        attempt: 2,
        maxAttempts: 3,
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Retrying job test-job-123 (attempt 2/3) after")
      );

      consoleSpy.mockRestore();
    });

    it("should use console.warn when logger.log is null", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const testData: RetryJobData = {
        attempt: 1,
        maxAttempts: 3,
      };
      const testDeps: RetryDeps = { logger: { log: null } as any };

      const result = await retryAction.execute(testData, testDeps, mockContext);

      expect(result).toEqual({
        attempt: 2,
        maxAttempts: 3,
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Retrying job test-job-123 (attempt 2/3) after")
      );

      consoleSpy.mockRestore();
    });

    it("should respect custom max attempts", async () => {
      const customConfig = { ...DEFAULT_RETRY_CONFIG, maxAttempts: 5 };
      const customRetryAction = new RetryAction(customConfig);

      const testData: RetryJobData = {
        attempt: 0, // Start from 0, not 4
        maxAttempts: 5,
      };
      const testDeps: RetryDeps = { logger: mockLogger };

      const result = await customRetryAction.execute(
        testData,
        testDeps,
        mockContext
      );

      expect(result).toEqual({
        attempt: 1,
        maxAttempts: 5,
      });
    });

    it("should calculate delay with jitter", async () => {
      const testData: RetryJobData = {
        attempt: 1,
        maxAttempts: 3,
      };
      const testDeps: RetryDeps = { logger: mockLogger };

      const result = await retryAction.execute(testData, testDeps, mockContext);

      expect(result).toEqual({
        attempt: 2,
        maxAttempts: 3,
      });

      // The delay should be logged with some jitter
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.any(String),
        LogLevel.WARN,
        expect.objectContaining({
          delay: expect.any(Number),
        })
      );
    });

    it("should respect max delay limit", async () => {
      const customConfig = { ...DEFAULT_RETRY_CONFIG, maxDelay: 1000 };
      const customRetryAction = new RetryAction(customConfig);

      const testData: RetryJobData = {
        attempt: 5, // High attempt number to trigger max delay
        maxAttempts: 10,
      };
      const testDeps: RetryDeps = { logger: mockLogger };

      const startTime = Date.now();
      const result = await customRetryAction.execute(
        testData,
        testDeps,
        mockContext
      );
      const endTime = Date.now();

      expect(result).toEqual({
        attempt: 6,
        maxAttempts: 10,
      });

      // Should not exceed maxDelay
      expect(endTime - startTime).toBeLessThanOrEqual(1500);
    });
  });

  describe("RetryWrapperAction", () => {
    let mockWrappedAction: BaseAction<BaseJobData, object>;
    let retryWrapperAction: RetryWrapperAction<BaseJobData, object>;

    beforeEach(() => {
      mockWrappedAction = {
        name: ActionName.NO_OP,
        execute: vi.fn(),
      } as unknown as BaseAction<BaseJobData, object>;

      retryWrapperAction = new RetryWrapperAction(mockWrappedAction);
    });

    it("should have correct name", () => {
      expect(retryWrapperAction.name).toBe(ActionName.RETRY_WRAPPER);
    });

    it("should execute wrapped action successfully on first attempt", async () => {
      const testData: BaseJobData = { jobId: "test-job-123" };
      const testDeps = { logger: mockLogger };
      const expectedResult = { success: true };

      mockWrappedAction.execute = vi.fn().mockResolvedValue(expectedResult);

      const result = await retryWrapperAction.execute(
        testData,
        testDeps,
        mockContext
      );

      expect(result).toEqual(expectedResult);
      expect(mockWrappedAction.execute).toHaveBeenCalledTimes(1);
      expect(mockWrappedAction.execute).toHaveBeenCalledWith(
        testData,
        testDeps,
        mockContext
      );
    });

    it("should retry wrapped action on failure", async () => {
      const testData: BaseJobData = { jobId: "test-job-123" };
      const testDeps = { logger: mockLogger };
      const expectedResult = { success: true };

      mockWrappedAction.execute = vi
        .fn()
        .mockRejectedValueOnce(new Error("First attempt failed"))
        .mockResolvedValueOnce(expectedResult);

      const startTime = Date.now();
      const result = await retryWrapperAction.execute(
        testData,
        testDeps,
        mockContext
      );
      const endTime = Date.now();

      expect(result).toEqual(expectedResult);
      expect(mockWrappedAction.execute).toHaveBeenCalledTimes(2);

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining("Retrying no_op for job test-job-123 (attempt"),
        "warn",
        expect.objectContaining({
          jobId: "test-job-123",
          attempt: 0,
          delay: expect.any(Number),
        })
      );

      // Should have waited approximately 1000ms
      expect(endTime - startTime).toBeGreaterThanOrEqual(900);
    });

    it("should throw error after max attempts", async () => {
      const testData: BaseJobData = { jobId: "test-job-123" };
      const testDeps = { logger: mockLogger };
      const testError = new Error("All attempts failed");

      mockWrappedAction.execute = vi.fn().mockRejectedValue(testError);

      await expect(
        retryWrapperAction.execute(testData, testDeps, mockContext)
      ).rejects.toThrow("All attempts failed");

      expect(mockWrappedAction.execute).toHaveBeenCalledTimes(4); // maxAttempts + 1
    }, 10000); // Increase timeout for this test

    it("should use console.warn when logger is not available", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const testData: BaseJobData = { jobId: "test-job-123" };
      const testDeps = {};

      mockWrappedAction.execute = vi
        .fn()
        .mockRejectedValueOnce(new Error("First attempt failed"))
        .mockResolvedValueOnce({ success: true });

      await retryWrapperAction.execute(testData, testDeps, mockContext);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Retrying no_op for job test-job-123 (attempt")
      );

      consoleSpy.mockRestore();
    });

    it("should use console.warn when logger.log is undefined", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const testData: BaseJobData = { jobId: "test-job-123" };
      const testDeps = { logger: { log: undefined } as any };

      mockWrappedAction.execute = vi
        .fn()
        .mockRejectedValueOnce(new Error("First attempt failed"))
        .mockResolvedValueOnce({ success: true });

      await retryWrapperAction.execute(testData, testDeps, mockContext);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Retrying no_op for job test-job-123 (attempt")
      );

      consoleSpy.mockRestore();
    });

    it("should use console.warn when logger.log is null", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const testData: BaseJobData = { jobId: "test-job-123" };
      const testDeps = { logger: { log: null } as any };

      mockWrappedAction.execute = vi
        .fn()
        .mockRejectedValueOnce(new Error("First attempt failed"))
        .mockResolvedValueOnce({ success: true });

      await retryWrapperAction.execute(testData, testDeps, mockContext);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Retrying no_op for job test-job-123 (attempt")
      );

      consoleSpy.mockRestore();
    });

    it("should use custom retry config", async () => {
      const customConfig = { ...DEFAULT_RETRY_CONFIG, maxAttempts: 2 };
      const customRetryWrapper = new RetryWrapperAction(
        mockWrappedAction,
        customConfig
      );

      const testData: BaseJobData = { jobId: "test-job-123" };
      const testDeps = { logger: mockLogger };
      const testError = new Error("All attempts failed");

      mockWrappedAction.execute = vi.fn().mockRejectedValue(testError);

      await expect(
        customRetryWrapper.execute(testData, testDeps, mockContext)
      ).rejects.toThrow("All attempts failed");

      expect(mockWrappedAction.execute).toHaveBeenCalledTimes(3); // maxAttempts + 1
    }, 10000); // Increase timeout for this test
  });

  describe("CircuitBreakerAction", () => {
    let mockWrappedAction: BaseAction<BaseJobData, object>;
    let circuitBreakerAction: CircuitBreakerAction<BaseJobData, object>;

    beforeEach(() => {
      mockWrappedAction = {
        name: ActionName.NO_OP,
        execute: vi.fn(),
      } as unknown as BaseAction<BaseJobData, object>;

      circuitBreakerAction = new CircuitBreakerAction(mockWrappedAction);
    });

    it("should have correct name", () => {
      expect(circuitBreakerAction.name).toBe(ActionName.CIRCUIT_BREAKER);
    });

    it("should execute wrapped action successfully when circuit is closed", async () => {
      const testData: BaseJobData = { jobId: "test-job-123" };
      const testDeps = { logger: mockLogger };
      const expectedResult = { success: true };

      mockWrappedAction.execute = vi.fn().mockResolvedValue(expectedResult);

      const result = await circuitBreakerAction.execute(
        testData,
        testDeps,
        mockContext
      );

      expect(result).toEqual(expectedResult);
      expect(mockWrappedAction.execute).toHaveBeenCalledWith(
        testData,
        testDeps,
        mockContext
      );
    });

    it("should open circuit after failure threshold", async () => {
      const testData: BaseJobData = { jobId: "test-job-123" };
      const testDeps = { logger: mockLogger };
      const testError = new Error("Service unavailable");

      mockWrappedAction.execute = vi.fn().mockRejectedValue(testError);

      // Execute 5 times to trigger circuit breaker (default threshold is 5)
      for (let i = 0; i < 5; i++) {
        await expect(
          circuitBreakerAction.execute(testData, testDeps, mockContext)
        ).rejects.toThrow("Service unavailable");
      }

      // Next attempt should fail with circuit breaker error
      await expect(
        circuitBreakerAction.execute(testData, testDeps, mockContext)
      ).rejects.toThrow("Circuit breaker is OPEN for test-operation");

      expect(mockLogger.log).toHaveBeenCalledWith(
        "Circuit breaker opened for test-operation after 5 failures",
        "error",
        {
          key: "test-operation",
          failures: 5,
        }
      );
    });

    it("should transition to half-open after reset timeout", async () => {
      const testData: BaseJobData = { jobId: "test-job-123" };
      const testDeps = { logger: mockLogger };
      const testError = new Error("Service unavailable");

      mockWrappedAction.execute = vi.fn().mockRejectedValue(testError);

      // Open the circuit
      for (let i = 0; i < 5; i++) {
        await expect(
          circuitBreakerAction.execute(testData, testDeps, mockContext)
        ).rejects.toThrow("Service unavailable");
      }

      // Mock time to pass reset timeout
      const originalDateNow = Date.now;
      Date.now = vi.fn(() => originalDateNow() + 70000); // 70 seconds later

      const expectedResult = { success: true };
      mockWrappedAction.execute = vi.fn().mockResolvedValue(expectedResult);

      // Should succeed and close circuit
      const result = await circuitBreakerAction.execute(
        testData,
        testDeps,
        mockContext
      );

      expect(result).toEqual(expectedResult);

      // Reset Date.now
      Date.now = originalDateNow;
    });

    it("should use custom breaker key", async () => {
      const customConfig = {
        failureThreshold: 3,
        resetTimeout: 60000,
        breakerKey: "custom-key",
      };
      const customCircuitBreaker = new CircuitBreakerAction(
        mockWrappedAction,
        customConfig
      );

      const testData: BaseJobData = { jobId: "test-job-123" };
      const testDeps = { logger: mockLogger };
      const testError = new Error("Service unavailable");

      mockWrappedAction.execute = vi.fn().mockRejectedValue(testError);

      // Execute 3 times to trigger circuit breaker
      for (let i = 0; i < 3; i++) {
        await expect(
          customCircuitBreaker.execute(testData, testDeps, mockContext)
        ).rejects.toThrow("Service unavailable");
      }

      // Next attempt should fail with custom key
      await expect(
        customCircuitBreaker.execute(testData, testDeps, mockContext)
      ).rejects.toThrow("Circuit breaker is OPEN for custom-key");
    });

    it("should use console.error when logger is not available", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const testData: BaseJobData = { jobId: "test-job-123" };
      const testDeps = {};
      const testError = new Error("Service unavailable");

      // Use a unique breaker key to avoid state interference
      const customConfig = {
        failureThreshold: 5,
        resetTimeout: 60000,
        breakerKey: "test-console-error-undefined",
      };
      const customCircuitBreaker = new CircuitBreakerAction(
        mockWrappedAction,
        customConfig
      );

      mockWrappedAction.execute = vi.fn().mockRejectedValue(testError);

      // Execute 5 times to trigger circuit breaker
      for (let i = 0; i < 5; i++) {
        await expect(
          customCircuitBreaker.execute(testData, testDeps, mockContext)
        ).rejects.toThrow("Service unavailable");
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        "Circuit breaker opened for test-console-error-undefined after 5 failures"
      );

      consoleSpy.mockRestore();
    });

    it("should use console.error when logger.log is undefined", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const testData: BaseJobData = { jobId: "test-job-123" };
      const testDeps = { logger: { log: undefined } as any };
      const testError = new Error("Service unavailable");

      // Use a unique breaker key to avoid state interference
      const customConfig = {
        failureThreshold: 5,
        resetTimeout: 60000,
        breakerKey: "test-console-error-undefined",
      };
      const customCircuitBreaker = new CircuitBreakerAction(
        mockWrappedAction,
        customConfig
      );

      mockWrappedAction.execute = vi.fn().mockRejectedValue(testError);

      // Execute 5 times to trigger circuit breaker
      for (let i = 0; i < 5; i++) {
        await expect(
          customCircuitBreaker.execute(testData, testDeps, mockContext)
        ).rejects.toThrow("Service unavailable");
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        "Circuit breaker opened for test-console-error-undefined after 5 failures"
      );

      consoleSpy.mockRestore();
    });

    it("should use console.error when logger.log is null", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const testData: BaseJobData = { jobId: "test-job-123" };
      const testDeps = { logger: { log: null } as any };
      const testError = new Error("Service unavailable");

      // Use a unique breaker key to avoid state interference
      const customConfig = {
        failureThreshold: 5,
        resetTimeout: 60000,
        breakerKey: "test-console-error-null",
      };
      const customCircuitBreaker = new CircuitBreakerAction(
        mockWrappedAction,
        customConfig
      );

      mockWrappedAction.execute = vi.fn().mockRejectedValue(testError);

      // Execute 5 times to trigger circuit breaker
      for (let i = 0; i < 5; i++) {
        await expect(
          customCircuitBreaker.execute(testData, testDeps, mockContext)
        ).rejects.toThrow("Service unavailable");
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        "Circuit breaker opened for test-console-error-null after 5 failures"
      );

      consoleSpy.mockRestore();
    });
  });

  describe("withRetry", () => {
    it("should create RetryWrapperAction with default config", () => {
      const mockAction = {
        name: ActionName.NO_OP,
        execute: vi.fn(),
      } as unknown as BaseAction<BaseJobData, object>;

      const result = withRetry(mockAction);

      expect(result).toBeInstanceOf(RetryWrapperAction);
      expect(result.name).toBe(ActionName.RETRY_WRAPPER);
    });

    it("should create RetryWrapperAction with custom config", () => {
      const mockAction = {
        name: ActionName.NO_OP,
        execute: vi.fn(),
      } as unknown as BaseAction<BaseJobData, object>;

      const customConfig = { ...DEFAULT_RETRY_CONFIG, maxAttempts: 5 };
      const result = withRetry(mockAction, customConfig);

      expect(result).toBeInstanceOf(RetryWrapperAction);
      expect(result.name).toBe(ActionName.RETRY_WRAPPER);
    });
  });

  describe("withCircuitBreaker", () => {
    it("should create CircuitBreakerAction with default config", () => {
      const mockAction = {
        name: ActionName.NO_OP,
        execute: vi.fn(),
      } as unknown as BaseAction<BaseJobData, object>;

      const result = withCircuitBreaker(mockAction);

      expect(result).toBeInstanceOf(CircuitBreakerAction);
      expect(result.name).toBe(ActionName.CIRCUIT_BREAKER);
    });

    it("should create CircuitBreakerAction with custom config", () => {
      const mockAction = {
        name: ActionName.NO_OP,
        execute: vi.fn(),
      } as unknown as BaseAction<BaseJobData, object>;

      const customConfig = {
        failureThreshold: 3,
        resetTimeout: 30000,
        breakerKey: "custom-key",
      };
      const result = withCircuitBreaker(mockAction, customConfig);

      expect(result).toBeInstanceOf(CircuitBreakerAction);
      expect(result.name).toBe(ActionName.CIRCUIT_BREAKER);
    });
  });

  describe("withRetryFactory", () => {
    it("should create RetryWrapperAction using factory", () => {
      const mockAction = {
        name: ActionName.NO_OP,
        execute: vi.fn(),
      } as unknown as BaseAction<BaseJobData, object>;

      mockActionFactory.create = vi.fn().mockReturnValue(mockAction);

      const result = withRetryFactory(mockActionFactory, ActionName.NO_OP);

      expect(result).toBeInstanceOf(RetryWrapperAction);
      expect(result.name).toBe(ActionName.RETRY_WRAPPER);
      expect(mockActionFactory.create).toHaveBeenCalledWith(
        ActionName.NO_OP,
        {}
      );
    });

    it("should create RetryWrapperAction with custom config", () => {
      const mockAction = {
        name: ActionName.NO_OP,
        execute: vi.fn(),
      } as unknown as BaseAction<BaseJobData, object>;

      mockActionFactory.create = vi.fn().mockReturnValue(mockAction);

      const customConfig = { ...DEFAULT_RETRY_CONFIG, maxAttempts: 5 };
      const result = withRetryFactory(
        mockActionFactory,
        ActionName.NO_OP,
        customConfig
      );

      expect(result).toBeInstanceOf(RetryWrapperAction);
      expect(result.name).toBe(ActionName.RETRY_WRAPPER);
    });
  });

  describe("withCircuitBreakerFactory", () => {
    it("should create CircuitBreakerAction using factory", () => {
      const mockAction = {
        name: ActionName.NO_OP,
        execute: vi.fn(),
      } as unknown as BaseAction<BaseJobData, object>;

      mockActionFactory.create = vi.fn().mockReturnValue(mockAction);

      const result = withCircuitBreakerFactory(
        mockActionFactory,
        ActionName.NO_OP
      );

      expect(result).toBeInstanceOf(CircuitBreakerAction);
      expect(result.name).toBe(ActionName.CIRCUIT_BREAKER);
      expect(mockActionFactory.create).toHaveBeenCalledWith(
        ActionName.NO_OP,
        {}
      );
    });

    it("should create CircuitBreakerAction with custom config", () => {
      const mockAction = {
        name: ActionName.NO_OP,
        execute: vi.fn(),
      } as unknown as BaseAction<BaseJobData, object>;

      mockActionFactory.create = vi.fn().mockReturnValue(mockAction);

      const customConfig = {
        failureThreshold: 3,
        resetTimeout: 30000,
        breakerKey: "custom-key",
      };
      const result = withCircuitBreakerFactory(
        mockActionFactory,
        ActionName.NO_OP,
        customConfig
      );

      expect(result).toBeInstanceOf(CircuitBreakerAction);
      expect(result.name).toBe(ActionName.CIRCUIT_BREAKER);
    });
  });
});
