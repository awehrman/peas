import { describe, it, expect, vi, beforeEach } from "vitest";
import { BaseAction } from "../../base-action";
import type { ActionContext } from "../../types";

// Mock dependencies
vi.mock("../../metrics", () => ({
  WorkerMetrics: {
    recordActionExecutionTime: vi.fn(),
  },
}));

describe("BaseAction", () => {
  let mockContext: ActionContext;

  beforeEach(() => {
    vi.clearAllMocks();
    mockContext = {
      jobId: "test-job-123",
      retryCount: 0,
      queueName: "test-queue",
      operation: "test-operation",
      startTime: Date.now(),
      workerName: "test-worker",
      attemptNumber: 1,
    };
  });

  // Test concrete implementation for BaseAction
  class TestAction extends BaseAction<
    { value: string },
    { logger: { log: (msg: string) => void } }
  > {
    name = "test_action";
    retryable = true;
    priority = 0;

    async execute(
      data: { value: string },
      deps: { logger: { log: (msg: string) => void } },
      context: ActionContext
    ): Promise<string> {
      deps.logger.log(`Processing ${data.value} for job ${context.jobId}`);
      return `processed_${data.value}`;
    }
  }

  describe("executeWithTiming", () => {
    it("should execute action successfully and return success result", async () => {
      const action = new TestAction();
      const data = { value: "test" };
      const deps = { logger: { log: vi.fn() } };

      const result = await action.executeWithTiming(data, deps, mockContext);

      expect(result.success).toBe(true);
      expect(result.data).toBe("processed_test");
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(deps.logger.log).toHaveBeenCalledWith(
        "Processing test for job test-job-123"
      );
    });

    it("should handle execution errors and return error result", async () => {
      class FailingAction extends BaseAction<{ value: string }, unknown> {
        name = "failing_action";
        async execute(): Promise<never> {
          throw new Error("Action failed");
        }
      }

      const action = new FailingAction();
      const data = { value: "test" };
      const deps = {};

      const result = await action.executeWithTiming(data, deps, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe("Action failed");
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it("should call onError when action fails", async () => {
      const onErrorSpy = vi.fn();
      class FailingAction extends BaseAction<{ value: string }, unknown> {
        name = "failing_action";
        onError = onErrorSpy;

        async execute(): Promise<never> {
          throw new Error("Action failed");
        }
      }

      const action = new FailingAction();
      const data = { value: "test" };
      const deps = {};

      await action.executeWithTiming(data, deps, mockContext);

      expect(onErrorSpy).toHaveBeenCalledWith(
        expect.any(Error),
        data,
        deps,
        mockContext
      );
    });

    it("should measure execution time accurately", async () => {
      const action = new TestAction();
      const data = { value: "test" };
      const deps = { logger: { log: vi.fn() } };

      const startTime = Date.now();
      const result = await action.executeWithTiming(data, deps, mockContext);
      const endTime = Date.now();

      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(result.duration).toBeLessThanOrEqual(endTime - startTime + 10); // Allow small timing variance
    });
  });

  describe("validateInput", () => {
    it("should return null by default", () => {
      const action = new TestAction();
      const data = { value: "test" };

      const result = action.validateInput?.(data);

      expect(result).toBeNull();
    });

    it("should allow subclasses to override validation", () => {
      class ValidatingAction extends BaseAction<{ value: string }, unknown> {
        name = "validating_action";
        validateInput(data: { value: string }): Error | null {
          if (!data.value || data.value.length < 3) {
            return new Error("Value must be at least 3 characters");
          }
          return null;
        }

        async execute(): Promise<void> {
          // Implementation not needed for this test
        }
      }

      const action = new ValidatingAction();

      expect(action.validateInput?.({ value: "ab" })).toBeInstanceOf(Error);
      expect(action.validateInput?.({ value: "abc" })).toBeNull();
    });
  });

  describe("withConfig", () => {
    it("should create new instance with updated config", () => {
      const action = new TestAction();
      const configuredAction = action.withConfig({
        retryable: false,
        priority: 5,
      });

      expect(configuredAction).not.toBe(action); // Should be a new instance
      expect(configuredAction.retryable).toBe(false);
      expect(configuredAction.priority).toBe(5);
      expect(configuredAction.name).toBe("test_action"); // Should preserve other properties
    });

    it("should preserve original instance properties", () => {
      const action = new TestAction();
      const configuredAction = action.withConfig({
        retryable: false,
      });

      expect(action.retryable).toBe(true); // Original should be unchanged
      expect(configuredAction.retryable).toBe(false); // New instance should have new value
    });

    it("should handle partial config updates", () => {
      const action = new TestAction();
      const configuredAction = action.withConfig({
        retryable: false,
      });

      expect(configuredAction.retryable).toBe(false);
      expect(configuredAction.priority).toBe(0); // Should keep original value
    });
  });

  describe("default properties", () => {
    it("should have default retryable value", () => {
      const action = new TestAction();
      expect(action.retryable).toBe(true);
    });

    it("should have default priority value", () => {
      const action = new TestAction();
      expect(action.priority).toBe(0);
    });

    it("should allow subclasses to override defaults", () => {
      class CustomAction extends BaseAction<unknown, unknown> {
        name = "custom_action";
        retryable = false;
        priority = 10;

        async execute(): Promise<void> {
          // Implementation not needed for this test
        }
      }

      const action = new CustomAction();
      expect(action.retryable).toBe(false);
      expect(action.priority).toBe(10);
    });
  });
});
