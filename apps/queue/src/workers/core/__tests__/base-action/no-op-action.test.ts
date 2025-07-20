import { describe, it, expect, vi, beforeEach } from "vitest";
import { NoOpAction } from "../../base-action";

describe("NoOpAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("basic functionality", () => {
    it("should have correct name", () => {
      const action = new NoOpAction();
      expect(action.name).toBe("no_op");
    });

    it("should execute without throwing errors", async () => {
      const action = new NoOpAction();
      const data = { test: "data" };

      await expect(action.execute(data)).resolves.toBeUndefined();
    });

    it("should execute with any data type", async () => {
      const action = new NoOpAction();

      // Test with different data types
      await expect(action.execute("string")).resolves.toBeUndefined();
      await expect(action.execute(123)).resolves.toBeUndefined();
      await expect(
        action.execute({ complex: "object" })
      ).resolves.toBeUndefined();
      await expect(action.execute(null)).resolves.toBeUndefined();
      await expect(action.execute(undefined)).resolves.toBeUndefined();
    });

    it("should execute without data parameter", async () => {
      const action = new NoOpAction();
      await expect(action.execute()).resolves.toBeUndefined();
    });
  });

  describe("executeWithTiming", () => {
    it("should return success result with timing", async () => {
      const action = new NoOpAction();
      const data = { test: "data" };
      const deps = {};
      const context = {
        jobId: "test-job-123",
        retryCount: 0,
        queueName: "test-queue",
        operation: "test-operation",
        startTime: Date.now(),
        workerName: "test-worker",
        attemptNumber: 1,
      };

      const result = await action.executeWithTiming(data, deps, context);

      expect(result.success).toBe(true);
      expect(result.data).toBeUndefined();
      expect(result.error).toBeUndefined();
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it("should measure execution time", async () => {
      const action = new NoOpAction();
      const data = { test: "data" };
      const deps = {};
      const context = {
        jobId: "test-job-123",
        retryCount: 0,
        queueName: "test-queue",
        operation: "test-operation",
        startTime: Date.now(),
        workerName: "test-worker",
        attemptNumber: 1,
      };

      const startTime = Date.now();
      const result = await action.executeWithTiming(data, deps, context);
      const endTime = Date.now();

      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(result.duration).toBeLessThanOrEqual(endTime - startTime + 10); // Allow small timing variance
    });
  });

  describe("configuration", () => {
    it("should have default configuration", () => {
      const action = new NoOpAction();
      expect(action.retryable).toBe(true);
      expect(action.priority).toBe(0);
    });

    it("should allow configuration changes", () => {
      const action = new NoOpAction();
      const configuredAction = action.withConfig({
        retryable: false,
        priority: 5,
      });

      expect(configuredAction.retryable).toBe(false);
      expect(configuredAction.priority).toBe(5);
      expect(configuredAction.name).toBe("no_op");
    });

    it("should preserve original instance", () => {
      const action = new NoOpAction();
      const configuredAction = action.withConfig({
        retryable: false,
      });

      expect(action.retryable).toBe(true); // Original unchanged
      expect(configuredAction.retryable).toBe(false); // New instance changed
    });
  });

  describe("error handling", () => {
    it("should not have custom error handler by default", () => {
      const action = new NoOpAction();
      expect(action.onError).toBeUndefined();
    });

    it("should not have input validation by default", () => {
      const action = new NoOpAction();
      expect(action.validateInput).toBeUndefined();
    });
  });

  describe("usage in pipelines", () => {
    it("should be usable as a placeholder action", async () => {
      const action = new NoOpAction();
      const data = { test: "data" };
      const deps = { logger: { log: vi.fn() } };
      const context = {
        jobId: "test-job-123",
        retryCount: 0,
        queueName: "test-queue",
        operation: "test-operation",
        startTime: Date.now(),
        workerName: "test-worker",
        attemptNumber: 1,
      };

      // Should not affect the data
      const result = await action.executeWithTiming(data, deps, context);

      expect(result.success).toBe(true);
      expect(result.data).toBeUndefined();
    });

    it("should be safe to use in error-prone contexts", async () => {
      const action = new NoOpAction();

      // Should not throw even with problematic inputs
      await expect(action.execute(null)).resolves.toBeUndefined();
    });
  });
});
