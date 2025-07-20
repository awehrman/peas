import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  withRetry,
  withCircuitBreaker,
  RetryWrapperAction,
  CircuitBreakerAction,
  type RetryConfig,
} from "../../retry";
import { BaseAction } from "../../../core/base-action";

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
