import { beforeEach, describe, expect, it, vi } from "vitest";

import { createMockActionContext } from "../../__tests__/test-utils";
import {
  BaseAction,
  LoggingAction,
  NoOpAction,
  ValidationAction,
} from "../base-action";
import type { ActionContext } from "../types";

// ============================================================================
// TEST HELPERS
// ============================================================================

// Concrete implementation of BaseAction for testing
class TestAction extends BaseAction<
  { value: string },
  { logger: { log: (msg: string) => void } }
> {
  name = "test_action";

  async execute(
    data: { value: string },
    deps: { logger: { log: (msg: string) => void } },
    context: ActionContext
  ): Promise<{ value: string; processed: boolean }> {
    deps.logger.log(`Processing ${data.value} for job ${context.jobId}`);
    return { ...data, processed: true };
  }
}

// Error-throwing action for testing error handling
class ErrorAction extends BaseAction<
  { value: string },
  { logger: { log: (msg: string) => void } }
> {
  name = "error_action";
  retryable = true;

  async execute(): Promise<never> {
    throw new Error("Test error");
  }

  async onError(
    error: Error,
    data: { value: string },
    deps: { logger: { log: (msg: string) => void } },
    context: ActionContext
  ): Promise<void> {
    deps.logger.log(
      `Error in ${this.name}: ${error.message} for job ${context.jobId}`
    );
  }
}

// ============================================================================
// BASE ACTION TESTS
// ============================================================================

describe("BaseAction", () => {
  let mockLogger: { log: ReturnType<typeof vi.fn> };
  let context: ActionContext;

  beforeEach(() => {
    mockLogger = { log: vi.fn() };
    context = createMockActionContext();
  });

  describe("executeWithTiming", () => {
    it("should execute action successfully and return timing info", async () => {
      const action = new TestAction();
      const data = { value: "test" };
      const deps = { logger: mockLogger };

      const result = await action.executeWithTiming(data, deps, context);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ value: "test", processed: true });
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(mockLogger.log).toHaveBeenCalledWith(
        "Processing test for job test-job-123"
      );
    });

    it("should handle errors and return error info with timing", async () => {
      const action = new ErrorAction();
      const data = { value: "test" };
      const deps = { logger: mockLogger };

      const result = await action.executeWithTiming(data, deps, context);

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe("Test error");
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(mockLogger.log).toHaveBeenCalledWith(
        "Error in error_action: Test error for job test-job-123"
      );
    });

    it("should call custom onError handler when provided", async () => {
      const customOnError = vi.fn();
      const action = new ErrorAction();
      action.onError = customOnError;

      const data = { value: "test" };
      const deps = { logger: mockLogger };

      await action.executeWithTiming(data, deps, context);

      expect(customOnError).toHaveBeenCalledWith(
        expect.any(Error),
        data,
        deps,
        context
      );
    });
  });

  describe("validateInput", () => {
    it("should return null for valid input by default", () => {
      const action = new TestAction();
      const data = { value: "test" };

      const result = action.validateInput?.(data);

      expect(result).toBeNull();
    });

    it("should allow custom validation logic", () => {
      const action = new TestAction();
      action.validateInput = (data: { value: string }) => {
        return data.value.length < 3 ? new Error("Value too short") : null;
      };

      expect(action.validateInput({ value: "ab" })).toBeInstanceOf(Error);
      expect(action.validateInput({ value: "abc" })).toBeNull();
    });
  });

  describe("withConfig", () => {
    it("should create new action instance with custom config", () => {
      const action = new TestAction();
      const configuredAction = action.withConfig({
        retryable: false,
        priority: 10,
      });

      expect(configuredAction).not.toBe(action);
      expect(configuredAction.retryable).toBe(false);
      expect(configuredAction.priority).toBe(10);
      expect(configuredAction.name).toBe("test_action");
    });

    it("should preserve original action properties", () => {
      const action = new TestAction();
      const configuredAction = action.withConfig({ retryable: false });

      expect(configuredAction.name).toBe("test_action");
      expect(configuredAction.priority).toBe(0); // Default value
    });
  });
});

// ============================================================================
// NO OP ACTION TESTS
// ============================================================================

describe("NoOpAction", () => {
  let context: ActionContext;

  beforeEach(() => {
    context = createMockActionContext();
  });

  it("should execute without performing any operation", async () => {
    const action = new NoOpAction();
    const testData = { test: "data" };
    const deps = {};

    const result = await action.executeWithTiming(testData, deps, context);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(testData); // NoOpAction returns the data
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  it("should have correct default properties", () => {
    const action = new NoOpAction();

    expect(action.name).toBe("no_op");
    expect(action.retryable).toBe(true);
    expect(action.priority).toBe(0);
  });
});

// ============================================================================
// VALIDATION ACTION TESTS
// ============================================================================

describe("ValidationAction", () => {
  let context: ActionContext;

  beforeEach(() => {
    context = createMockActionContext();
  });

  it("should pass through valid data", async () => {
    const validator = (data: { value: string }) =>
      data.value.length > 0 ? null : new Error("Empty value");
    const action = new ValidationAction(validator);
    const data = { value: "test" };
    const deps = {};

    const result = await action.executeWithTiming(data, deps, context);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(data);
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  it("should throw error for invalid data", async () => {
    const validator = (data: { value: string }) =>
      data.value.length > 0 ? null : new Error("Empty value");
    const action = new ValidationAction(validator);
    const data = { value: "" };
    const deps = {};

    const result = await action.executeWithTiming(data, deps, context);

    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toBe("Empty value");
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  it("should not be retryable", () => {
    const validator = (_data: { value: string }) => null;
    const action = new ValidationAction(validator);

    expect(action.retryable).toBe(false);
  });

  it("should have correct name", () => {
    const validator = (_data: { value: string }) => null;
    const action = new ValidationAction(validator);

    expect(action.name).toBe("validation");
  });
});

// ============================================================================
// LOGGING ACTION TESTS
// ============================================================================

describe("LoggingAction", () => {
  let mockLogger: { log: ReturnType<typeof vi.fn> };
  let context: ActionContext;

  beforeEach(() => {
    mockLogger = { log: vi.fn() };
    context = createMockActionContext();
  });

  it("should log string message", async () => {
    const action = new LoggingAction("Test message");
    const data = { value: "test" };
    const deps = { logger: mockLogger };

    const result = await action.executeWithTiming(data, deps, context);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(data);
    expect(mockLogger.log).toHaveBeenCalledWith("[test-job-123] Test message");
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  it("should log function message with context", async () => {
    const messageFn = (data: unknown, context: ActionContext) =>
      `Processing ${(data as { value: string }).value} for job ${context.jobId}`;
    const action = new LoggingAction(messageFn);
    const data = { value: "test" };
    const deps = { logger: mockLogger };

    const result = await action.executeWithTiming(data, deps, context);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(data);
    expect(mockLogger.log).toHaveBeenCalledWith(
      "[test-job-123] Processing test for job test-job-123"
    );
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  it("should fallback to console.log when no logger provided", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const action = new LoggingAction("Test message");
    const data = { value: "test" };
    const deps = {};

    const result = await action.executeWithTiming(data, deps, context);

    expect(result.success).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith("[test-job-123] Test message");
    consoleSpy.mockRestore();
  });

  it("should not be retryable", () => {
    const action = new LoggingAction("Test message");

    expect(action.retryable).toBe(false);
  });

  it("should have correct name", () => {
    const action = new LoggingAction("Test message");

    expect(action.name).toBe("logging");
  });
});
